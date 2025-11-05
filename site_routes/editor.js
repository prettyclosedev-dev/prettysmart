const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config.json");
const { getBrandedDesign } = require("../clyps_api");

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
  // This avoids 302 redirect caching that could point to a previous user's design
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

      // Ask only for id to keep it fast and avoid preview generation
      const data = await getBrandedDesign({
        user: req.user,
        where: { id: baseId },
        brandWhere,
        withPreview: false,
        returnParams: ["id"],
      });

      // Depending on API, brandedDesign may be an object or JSON string
      let branded = data && (data.brandedDesign || data.data?.brandedDesign);
      if (typeof branded === "string") {
        try {
          branded = JSON.parse(branded);
        } catch (e) {
          // keep as-is if not JSON
        }
      }

      const editableId = branded && branded.id ? branded.id : baseId;
      console.log("[editor/open] user:", req.user && req.user.email, "brandWhere:", brandWhere, "baseId:", baseId, "editableId:", editableId);
      return renderEditor(req, res, editableId);
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
