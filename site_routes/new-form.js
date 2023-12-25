const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");

module.exports = () => {
  router.get("/:id/:templatesId", async (req, res) => {
    let query = {
      type: "form",
      _id: req.params.id,
    };

    db.pages.findOne(query, function (err, form) {
      if (form) {
        res.render("new-form", {
          templatesId: req.params.templatesId,
          form: form,
        });
      } else {
        res.redirect("/templates");
      }
    });
  });

  router.post("/templates/:templatesId", async (req, res) => {
    req.session.content = req.body;
    req.session.random_start = -1;
    res.redirect(`/templates/category/${req.params.templatesId}`);
  });

  return router;
};
