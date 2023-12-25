const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config.json");

module.exports = () => {
  router.get("/:project", async (req, res) => {
    res.render("editor", {
      hash: req.params.hash,
      template: req.params.template,
      project: req.params.project,
      cache: true,
      filename: "editor",
    });
  });

  router.get("/:project/:template", async (req, res) => {
    res.render("editor", {
      hash: req.params.hash,
      template: req.params.template,
      project: req.params.project,
      cache: true,
      filename: "editor",
    });
  });

  router.get("/:project/:template/:hash", async (req, res) => {
    res.render("editor", {
      project: req.params.project,
      template: req.params.template,
      hash: req.params.hash,
      cache: true,
      filename: "editor",
    });
  });

  return router;
};
