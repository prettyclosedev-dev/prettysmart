const express = require("express");
const router = express.Router();

module.exports = () => {
  router.get("/", async (req, res) => {
    res.render("support", { cache: true, filename: "support" });
  });

  return router;
};
