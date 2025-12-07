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

  // Helper to find or create a user-specific duplicate of a centralized template
  async function findOrCreateDuplicate(user, originalId) {
    if (!user || !user.email) return null;
    const originalIdStr = String(originalId);
    const tag = `original_id:${originalIdStr}`;
    const apiUrl = config.prettyclose_apps.api.localUrl + "/graphql";
    const headers = { Authorization: `Bearer ${config.CLYPS_API_KEY}` };

    try {
      // 1. Check if duplicate exists
      const searchOptions = {
        method: "POST",
        uri: apiUrl,
        headers,
        body: {
          query: `
            query findDuplicate($email: String!, $tag: String!) {
              designs(where: {
                creator: { email: { equals: $email } },
                tags: { has: $tag }
              }) {
                id
              }
            }
          `,
          variables: { email: user.email, tag }
        },
        json: true
      };
      const searchRes = await rp(searchOptions);
      if (searchRes.data && searchRes.data.designs && searchRes.data.designs.length > 0) {
        return searchRes.data.designs[0].id;
      }

      // 2. If not, fetch original design
      const fetchOptions = {
        method: "POST",
        uri: apiUrl,
        headers,
        body: {
          query: `
            query getOriginal($id: Int!) {
              design(where: { id: $id }) {
                name
                width
                height
                unit
                dpi
                pages
                fonts
                preview
                categories { id }
                tags
              }
            }
          `,
          variables: { id: originalId }
        },
        json: true
      };
      const fetchRes = await rp(fetchOptions);
      const original = fetchRes.data && fetchRes.data.design;

      if (!original) return null;

      // 3. Create duplicate
      const newTags = (original.tags || []).filter(t => !t.startsWith("original_id:"));
      newTags.push(tag);

      const createOptions = {
        method: "POST",
        uri: apiUrl,
        headers,
        body: {
          query: `
            mutation createDuplicate($data: DesignCreateInput!) {
              createOneDesign(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              name: original.name,
              width: original.width,
              height: original.height,
              unit: original.unit,
              dpi: original.dpi,
              pages: { set: original.pages },
              fonts: { set: original.fonts },
              preview: original.preview,
              categories: { connect: original.categories.map(c => ({ id: c.id })) },
              tags: { set: newTags },
              creator: { connect: { email: user.email } }
            }
          }
        },
        json: true
      };
      const createRes = await rp(createOptions);
      if (createRes.data && createRes.data.createOneDesign) {
        return createRes.data.createOneDesign.id;
      }
    } catch (e) {
      console.error("Error in findOrCreateDuplicate:", e);
    }
    return null;
  }

  // Resolve a brand-specific editable design id for the current user and render directly
  // If a user hasn't edited the template before, create a private copy for that user and use its id
  // This avoids cross-user edits on the shared template id
  router.get("/open/:templateId", async (req, res) => {
    try {
      const baseId = parseInt(req.params.templateId, 10);
      // Always use shared/base template id in the editor
      if (Number.isNaN(baseId)) {
        return renderEditor(req, res, req.params.templateId);
      }
      // Remember the last opened base template id for save interception
      try {
        req.session = req.session || {};
        req.session.lastBaseTemplateId = baseId;
        // Also resolve and stash the exact file path to overwrite later
        const pathLib = require("path");
        const fsLib = require("fs");
        const userId = req.user && (req.user._id?.toString?.() || String(req.user._id || ""));
        const baseDir = pathLib.join(__dirname, "../site_static/templates", userId);
        let foundPath = null;
        function walk(dir) {
          let entries;
          try {
            entries = fsLib.readdirSync(dir, { withFileTypes: true });
          } catch (e) {
            return;
          }
          for (const ent of entries) {
            const full = pathLib.join(dir, ent.name);
            if (ent.isDirectory()) {
              walk(full);
              if (foundPath) return; // early exit if found
            } else if (ent.isFile()) {
              if (/\.(jpg|jpeg|png)$/i.test(ent.name)) {
                const baseName = ent.name.replace(/\.(jpg|jpeg|png)$/i, "");
                const idToken = baseName.split("_")[0];
                if (String(idToken) === String(baseId)) {
                  foundPath = full;
                  return;
                }
              }
            }
          }
        }
        walk(baseDir);
        req.session.lastTemplateFilePath = foundPath || null;
        console.log("[editor/open] stashed baseId:", baseId, "file:", foundPath || "(not found)");
      } catch (e) {}

      let renderId = baseId;
      if (req.user && req.user.email) {
        const duplicateId = await findOrCreateDuplicate(req.user, baseId);
        if (duplicateId) {
          renderId = duplicateId;
          console.log(`[editor/open] Using duplicate design ${renderId} for user ${req.user.email} (original: ${baseId})`);
        }
      }
      return renderEditor(req, res, renderId);
    } catch (err) {
      console.error("Failed to open editor with base template id:", err);
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

      // Intercept editor save mutations to avoid updating shared templates
      const isMutation = typeof query === "string" && /\bmutation\b/i.test(query);
      // Trigger regeneration on any mutation coming from the editor
      if (isMutation) {
        // Determine base/shared template id involved in the edit
        let baseId = Number(
          (patchedVars && patchedVars.where && patchedVars.where.id) || patchedVars.id || patchedVars.templateId
        );
        if (!baseId || Number.isNaN(baseId)) {
          baseId = Number((req.session && req.session.lastBaseTemplateId) || 0);
        }
        console.log("[graphql-proxy] save intercepted; baseId:", baseId, "operation:", operationName || "unknown");

        // 1) Forward the mutation so the backend applies the changes
        let mutationResponse;
        try {
          const mutateOptions = {
            headers: { Authorization: `Bearer ${config.CLYPS_API_KEY}` },
            method: "POST",
            uri: config.prettyclose_apps.api.localUrl + "/graphql",
            body: { query, variables: patchedVars, operationName },
            json: true,
          };
          mutationResponse = await rp(mutateOptions);
        } catch (mutErr) {
          console.error("[graphql-proxy] mutation forward failed:", mutErr.message || mutErr);
        }

        // 2) Regenerate a branded preview for the current user and replace local file(s)
        try {
          const brandWhere =
            req.user && req.user.account && req.user.account._id
              ? { prettySmartId: req.user.account._id.toString() }
              : undefined;

          const data = await getBrandedDesign({
            user: req.user,
            where: baseId ? { id: baseId } : undefined,
            brandWhere,
            previewOptions: { mimeType: "image/jpeg", pixelRatio: 2 },
            returnParams: ["id", "name", "preview", "tags"]
          });

          let lookupId = baseId;
          const tags = data && data.brandedDesign && data.brandedDesign.tags;
          if (tags && Array.isArray(tags)) {
             const originalTag = tags.find(t => t.startsWith("original_id:"));
             if (originalTag) {
                lookupId = originalTag.split(":")[1];
                console.log("[graphql-proxy] Found original_id tag:", lookupId, "using for file lookup instead of", baseId);
             }
          }

          let b64 = data && data.brandedDesign && data.brandedDesign.preview;
          if (b64) {
            // Strip data URL header if present
            const dataUrlMatch = /^data:[^;]+;base64,(.+)$/.exec(b64);
            if (dataUrlMatch) {
              b64 = dataUrlMatch[1];
            }
            const pathLib = require("path");
            const fsLib = require("fs");
            const userId = req.user && (req.user._id?.toString?.() || String(req.user._id || ""));
            const baseDir = pathLib.join(__dirname, "../site_static/templates", userId);

            // Find any existing file(s) under the user's templates that match the base id prefix
            let targets = [];
            // Prefer the exact last opened file path if available
            const preferred = req.session && req.session.lastTemplateFilePath;
            if (preferred && preferred.startsWith(baseDir)) {
              targets = [preferred];
            }
            function walk(dir) {
              let entries;
              try {
                entries = fsLib.readdirSync(dir, { withFileTypes: true });
              } catch (e) {
                return;
              }
              for (const ent of entries) {
                const full = pathLib.join(dir, ent.name);
                if (ent.isDirectory()) {
                  walk(full);
                } else if (ent.isFile()) {
                  if (/\.(jpg|jpeg|png)$/i.test(ent.name)) {
                    const baseName = ent.name.replace(/\.(jpg|jpeg|png)$/i, "");
                    const idToken = baseName.split("_")[0];
                    if (String(idToken) === String(lookupId)) {
                      // Avoid duplicates if preferred set
                      if (!targets.length || targets[0] !== full) targets.push(full);
                    }
                  }
                }
              }
            }

            if (!targets.length) {
              walk(baseDir);
            }
            if (!targets.length) {
              console.warn("[graphql-proxy] no matching files found for baseId", lookupId, "under", baseDir);
            } else {
              console.log("[graphql-proxy] matched files for overwrite:", targets);
            }

            if (targets.length) {
              const buffer = Buffer.from(b64, "base64");
              for (const targetPath of targets) {
                try {
                  fsLib.writeFileSync(targetPath, buffer);
                } catch (e) {
                  console.warn("Failed to write regenerated preview:", targetPath, e.message || e);
                }
              }
            }
          }
        } catch (regenErr) {
          console.warn("Preview regeneration failed:", regenErr.message || regenErr);
        }

        // Return the original mutation response to the editor
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
        res.set("Vary", "Cookie");
        return res.status(200).send(mutationResponse || { data: { ok: true } });
      }

      // Default: proxy as-is for non-edit operations
      const options = {
        headers: {
          Authorization: `Bearer ${config.CLYPS_API_KEY}`,
        },
        method: "POST",
        uri: config.prettyclose_apps.api.localUrl + "/graphql",
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
