const express = require("express");
const router = express.Router();

module.exports = () => {
  // Redirect root-level branded-design URLs to the editor route
  router.get("/:templateId", (req, res) => {
    const { templateId } = req.params;
    return res.redirect(`/editor/branded-design/${encodeURIComponent(templateId)}`);
  });

  // Optionally handle trailing slash without id
  router.get("/", (req, res) => {
    return res.redirect("/templates");
  });

  return router;
};
