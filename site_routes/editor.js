const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config.json");

module.exports = () => {
  router.get("/branded-design/:templateId", async (req, res) => {
    let house;
    if (req.session && req.session.content && req.session.content.form_file) {
      house = req.session.content.form_file
    }
    res.render("editor", {
      templateId: req.params.templateId,
      additional: JSON.stringify({
        ...req.session.content,
        house,
        form_file: undefined,
      }),
      cache: true,
      filename: "editor",
    });
  });

  return router;
};
