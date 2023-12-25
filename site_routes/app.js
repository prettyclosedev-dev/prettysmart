const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config.json");

module.exports = () => {
  router.get("/", async (req, res) => {
    res.render("app", {});
  });

  return router;
};
