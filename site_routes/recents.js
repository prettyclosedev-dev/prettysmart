const express = require("express");
const fs = require("fs");
const router = express.Router();
const Huddle = require("../huddle");
const Project = require("../schemas/project");
const User = require("../schemas/user");
const http = require("https");

module.exports = () => {
  router.get("/", async (req, res) => {
    // let projects = await Project.find({
    //   user: req.user,
    // }).sort("-created_at");

    var start = new Date();
    start.setHours(0, 0, 0, 0);

    var end = new Date();
    end.setHours(23, 59, 59, 999);

    let todayProjects = await Project.find({
      user: req.user,
      created_at: { $gte: start, $lt: end },
      favorite: {
        $ne: true,
      },
    }).sort("-created_at");

    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() - 1);

    let earlierProjects = await Project.find({
      user: req.user,
      created_at: { $gte: start, $lt: end },
      favorite: {
        $ne: true,
      },
    }).sort("-created_at");

    let folder = __dirname + "/../files/" + req.user.account._id + "/projects";

    todayProjects = todayProjects.filter((project) => {
      const finalPath = folder + "/" + project.project_id + ".jpg";
      return fs.existsSync(finalPath);
    });

    earlierProjects = earlierProjects.filter((project) => {
      const finalPath = folder + "/" + project.project_id + ".jpg";
      return fs.existsSync(finalPath);
    });

    res.render("recents", {
      todayProjects: todayProjects,
      earlierProjects: earlierProjects,
      cache: true,
      filename: "recents",
    });
  });

  return router;
};
