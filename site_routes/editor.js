const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config.json");
const { getBrandedDesign } = require("../clyps_api");
const Project = require("../schemas/project");

module.exports = () => {
  // Helper to consistently render the editor page with the given design id
  function renderEditor(req, res, templateId) {
    // prevent any intermediate/page caching to avoid cross-user leakage
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    // make sure any upstream cache varies by cookie/session
    res.set("Vary", "Cookie");
    let house;
    if (req.session && req.session.content && req.session.content.form_file) {
      house = req.session.content.form_file;
    }
    return res.render("editor", {
      templateId,
      additional: JSON.stringify({
        ...req.session.content,
        house,
        form_file: undefined,
      }),
      cache: true,
      filename: "editor",
    });
  }

  // Resolve a brand-specific editable design id for the current user and render directly
  // If a user hasn't edited the template before, create a private copy for that user and use its id
  // This avoids cross-user edits on the shared template id
  router.get("/open/:templateId", async (req, res) => {
    try {
      const baseId = parseInt(req.params.templateId, 10);
      if (Number.isNaN(baseId)) {
        // Non-numeric id, just render editor with provided id
        return renderEditor(req, res, req.params.templateId);
      }

      const brandWhere =
        req.user && req.user.account && req.user.account._id
          ? { prettySmartId: req.user.account._id.toString() }
          : undefined;

      // 1) Check if we already created a per-user copy for this template
      let existing = await Project.findOne({
        user: req.user._id,
        template_id: String(baseId),
      }).lean();

      if (existing && existing.project_id) {
        console.log("[editor/open] using existing user copy", {
          user: req.user.email,
          baseId,
          projectId: existing.project_id,
        });
        return renderEditor(req, res, existing.project_id);
      }

      // 2) No existing copy — fetch branded design data and create a private copy tied to the user
      //    Request all fields necessary to clone the design faithfully
      const data = await getBrandedDesign({
        user: req.user,
        where: { id: baseId },
        brandWhere,
        withPreview: true,
        previewOptions: {
          mimeType: "image/jpeg",
          pixelRatio: 1,
        },
        // Ask server to return the raw design JSON for cloning
        returnParams: [
          "id",
          "name",
          "width",
          "height",
          "unit",
          "dpi",
          "pages",
          "fonts",
          "tags",
          // we need category ids to reconnect
          "categories { id }",
          // include preview so we can satisfy GraphQL's required field
          "preview",
        ],
      });

      let branded = data && (data.brandedDesign || data.data?.brandedDesign);
      if (typeof branded === "string") {
        try {
          branded = JSON.parse(branded);
        } catch (e) {
          // keep as-is if not JSON
        }
      }

      if (!branded || !branded.pages) {
        // Fallback: if we can't fetch full design json, just open the base id to avoid blocking
        console.warn("[editor/open] unable to fetch branded design json — falling back to base id", {
          user: req.user && req.user.email,
          baseId,
        });
        return renderEditor(req, res, baseId);
      }

      // Build createOneDesign mutation payload
      const categories = Array.isArray(branded.categories)
        ? branded.categories
            .filter((c) => c && (c.id || c._id))
            .map((c) => ({ id: Number(c.id || c._id) }))
        : [];
      const tags = Array.isArray(branded.tags) ? branded.tags : [];
      const preview = branded.preview || undefined;

      const createMutation = `
        mutation createOneDesign($data: DesignCreateInput!) {
          createOneDesign(data: $data) { id name }
        }
      `;

      const createVariables = {
        data: {
          // core canvas props
          name: branded.name || "Untitled",
          width: branded.width || 1080,
          height: branded.height || 1080,
          unit: branded.unit || "px",
          dpi: branded.dpi || 72,
          // content
          fonts: null, // let server resolve fonts if needed
          pages: { set: branded.pages },
          // metadata
          tags: { set: tags },
          categories: categories.length ? { connect: categories } : undefined,
          creator: { connect: { email: req.user.email } },
          public: false,
          // GraphQL requires preview on create
          preview,
        },
      };

      const options = {
        headers: {
          Authorization: `Bearer ${config.CLYPS_API_KEY}`,
        },
        method: "POST",
        uri: "http://localhost:4000/graphql",
        body: { query: createMutation, variables: createVariables },
        json: true,
      };

      const created = await rp(options);
      const newId = created && created.data && created.data.createOneDesign && created.data.createOneDesign.id;

      if (!newId) {
        console.warn("[editor/open] createOneDesign returned no id; falling back to base id", {
          user: req.user && req.user.email,
          baseId,
        });
        return renderEditor(req, res, baseId);
      }

      // Persist mapping so subsequent opens are fast and edits stay isolated per user
      await Project.create({
        project_title: branded.name || "Untitled",
        user: req.user._id,
        account: req.user.account && req.user.account._id,
        project_id: String(newId),
        template_id: String(baseId),
        favorite: false,
      });

      console.log("[editor/open] created user copy", {
        user: req.user.email,
        baseId,
        projectId: newId,
      });
      return renderEditor(req, res, newId);
    } catch (err) {
      console.error("Failed to resolve branded design id:", err);
      // Fallback to rendering editor with original id
      return renderEditor(req, res, req.params.templateId);
    }
  });

  router.get("/branded-design/:templateId", async (req, res) => {
    return renderEditor(req, res, req.params.templateId);
  });

  // Proxy GraphQL requests from the editor to the backend GraphQL server
  // - Inject current user's email into variables.email
  // - Inject brandWhere.prettySmartId when querying brandedDesign(s) and none provided
  // - Disable caching and avoid CORS issues by keeping same-origin
  router.post("/graphql-proxy", async (req, res) => {
    try {
      const { query, variables, operationName } = req.body || {};
      const patchedVars = { ...(variables || {}) };

      // Always force the current user's email for branded operations
      if (req.user && req.user.email) {
        patchedVars.email = req.user.email;
      }

      const brandWhere =
        req.user && req.user.account && req.user.account._id
          ? { prettySmartId: req.user.account._id.toString() }
          : undefined;

      // If the query touches brandedDesign(s) and brandWhere isn't provided, inject it
      if (
        brandWhere &&
        !patchedVars.brandWhere &&
        typeof query === "string" &&
        /brandedDesigns?\s*\(/.test(query)
      ) {
        patchedVars.brandWhere = brandWhere;
      }

      const options = {
        headers: {
          Authorization: `Bearer ${config.CLYPS_API_KEY}`,
        },
        method: "POST",
        uri: "http://localhost:4000/graphql",
        body: { query, variables: patchedVars, operationName },
        json: true,
      };

      const response = await rp(options);
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.set("Vary", "Cookie");
      return res.status(200).send(response);
    } catch (err) {
      console.error("GraphQL proxy error:", err.message || err);
      return res.status(500).send({ errors: [{ message: "Proxy error" }] });
    }
  });

  return router;
};
