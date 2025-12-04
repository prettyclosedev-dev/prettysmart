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
      // Always use shared/base template id in the editor
      if (Number.isNaN(baseId)) {
        return renderEditor(req, res, req.params.templateId);
      }
      return renderEditor(req, res, baseId);
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
