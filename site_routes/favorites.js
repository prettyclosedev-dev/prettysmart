const express = require("express");
const fs = require("fs");
const router = express.Router();
const Huddle = require("../huddle");
const Project = require("../schemas/project");
const User = require("../schemas/user");
const http = require("https");

module.exports = () => {
  router.get("/", async (req, res) => {
    let favorites = await Project.find({
      user: req.user,
      favorite: true,
    }).sort("-created_at");

    let folder = __dirname + "/../files/" + req.user.account._id + "/projects";

    favorites = favorites.filter((project) => {
      const finalPath = folder + "/" + project.project_id + ".jpg";
      return fs.existsSync(finalPath);
    });

    res.render("favorites", {
      favorites,
      cache: true,
      filename: "favorites",
    });
  });

  return router;
};
