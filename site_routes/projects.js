const express = require("express");
const fs = require("fs");
const router = express.Router();
const Huddle = require("../huddle");
const Project = require("../schemas/project");
const User = require("../schemas/user");
const http = require("https");
const { searchContactByEmail, updateDownloadsCount } = require("../hubspot");

module.exports = () => {
  router.get("/", async (req, res) => {
    let projects = await Project.find({
      user: req.user,
    }).sort("-created_at");

    if (req.query.download) {
      let users = await User.find({})
        .populate("account")
        .populate("multiAccounts");

      users.forEach(async (user) => {
        try {
          let token = await Huddle.getToken(user);

          let huddle_projects = await Huddle.getProjects({
            user: Object.assign(user, {
              token: token,
            }),
          });

          huddle_projects.data.items.forEach(async (project) => {
            let folder = __dirname + "/../files/" + user.account._id;

            if (!fs.existsSync(folder)) {
              fs.mkdirSync(folder);
            }

            folder += "/projects";

            if (!fs.existsSync(folder)) {
              fs.mkdirSync(folder);
            }

            const file = fs.createWriteStream(
              folder + "/" + project.project_id + ".jpg"
            );
            const request = http.get(
              project.thumbnail_url,
              function (response) {
                response.pipe(file);

                file.on("finish", async function () {
                  file.close();

                  let projectExisits = await Project.findOne({
                    project_id: project.project_id,
                  });

                  if (!projectExisits) {
                    let saved_project = new Project({
                      project_title: project.project_title,
                      user: user._id,
                      account: user.account._id,
                      project_id: project.project_id,
                    });

                    await saved_project.save();
                    await Project.findOneAndUpdate(
                      {
                        project_id: project.project_id,
                      },
                      {
                        $set: {
                          created_at: Date.parse(project.date_created),
                        },
                      },
                      {
                        new: true,
                        timestamps: false,
                      }
                    );
                  }
                });
              }
            );
          });
        } catch (error) {
          //console.log(error)
        }
      });
    }

    res.render("projects", {
      projects: projects,
    });
  });

  router.post("/save/:id", async (req, res) => {
    let user = req.user;
    let id = req.params.id;
    let isFavorite = req.query.favorite;
    // let size = req.query.size;

    getProject();

    async function getProject() {
      let huddle_project = await Huddle.getProject({
        user: user,
        id: id,
      });

      if (!huddle_project.data.thumbnail_url) {
        setTimeout(() => {
          getProject();
        }, 2000);
      } else {
        saveProject(huddle_project.data);
      }
    }

    async function saveProject(project) {
      let folder = __dirname + "/../files/" + user.account._id;

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }

      folder += "/projects";

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }

      const file = fs.createWriteStream(
        folder + "/" + project.project_id + ".jpg"
      );

      const request = http.get(project.thumbnail_url, function (response) {
        response.pipe(file);

        file.on("finish", async function () {
          file.close();

          let saved_project = new Project({
            project_title: project.project_title,
            user: user._id,
            account: user.account._id,
            project_id: project.project_id,
            favorite: isFavorite,
            template_id: req.body.template_id,
            custom_hash: req.body.custom_hash,
            // size,
          });

          await saved_project.save();

          const contactID = await searchContactByEmail(user.email);
          if (contactID) {
            let count = await Project.count({ user: user._id });
            await updateDownloadsCount(contactID, count);
          }
          res.send(saved_project);
        });
      });
    }
  });

  router.post("/update/:id", async (req, res) => {
    let folder = __dirname + "/../files/" + req.user.account._id;

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    folder += "/projects";

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    const file = fs.createWriteStream(folder + "/" + req.params.id + ".jpg");

    let huddle_project = await Huddle.getProject({
      user: req.user,
      id: req.params.id,
    });

    const request = http.get(
      huddle_project.data.thumbnail_url,
      function (response) {
        response.pipe(file);

        file.on("finish", async function () {
          file.close();

          res.send({
            success: true,
            thumbnail_url: huddle_project.data.thumbnail_url,
          });
        });
      }
    );
  });

  return router;
};
