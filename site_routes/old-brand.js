const express = require("express");
const router = express.Router();
const User = require("../schemas/user");

module.exports = () => {
  router.get("/", async (req, res) => {
    res.render("brand-form");
  });

  return router;
};
