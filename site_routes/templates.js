const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const fs = require("fs");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const path = require("path");
const User = require("../schemas/user");

module.exports = () => {
  router.get("/", async (req, res) => {
    try {
      let token = await Huddle.getToken(req.user);

      await User.findOneAndUpdate(
        {
          _id: req.user._id,
        },
        {
          $set: {
            login_date: Date.now(),
            token: token,
          },
        },
        {
          new: true,
        }
      );
    } catch (error) {
      console.log(error);
      return res.redirect("/login");
    }

    db.pages.find(
      {
        type: "size",
      },
      function (err, sizes) {
        sizes = _.orderBy(sizes, "order");
        let carouselQuery = getCarouselQuery(req);

        db.pages.find(carouselQuery, async function (err, rows) {
          await Promise.all(
            rows.map(async (row) => {
              let rowQuery = getQuery(req, row, sizes);
              let rowTemplates = await Huddle.getTemplates(rowQuery);
              let templateItems = rowTemplates.data.items;
              row.templates = templateItems;
            })
          );

          return res.render("templates", {
            sizes: sizes,
            templates: _.orderBy(rows, "position"),
            row: { templates: [] },
            cache: true,
            filename: "templates",
          });
        });
      }
    );
  });

  router.get("/category/:templatesId", (req, res) => {
    db.pages.find(
      {
        type: "size",
      },
      function (err, sizes) {
        sizes = _.orderBy(sizes, "order");
        let carouselQuery = getCarouselQuery(req, req.params.templatesId);

        db.pages.find(carouselQuery, async function (err, rows) {
          await Promise.all(
            rows.map(async (row) => {
              let rowQuery = getQuery(req, row, sizes, req.params.templatesId);

              let rowTemplates = await Huddle.getTemplates(rowQuery);
              let templateItems = rowTemplates.data.items;
              row.templates = templateItems;
            })
          );

          res.render("templates", {
            sizes: sizes,
            templates: _.orderBy(rows, "position"),
            row: { templates: [] },
            cache: true,
            filename: "templates",
            ai_input: req.query.input,
            ai_placeholder: req.query.placeholder,
            ai_engine: req.query.engine
          });
        });
      }
    );
  });

  router.get("/resize?", async (req, res) => {
    await handleResize(req, res)
  });

  router.get("/category/:templatesId/resize?", async (req, res) => {
    await handleResize(req, res)
  });

  router.get("/export/:project", async function (req, res) {
    let project_export_job = await Huddle.newExportJob({
      user: req.user,
      project: req.params.project,
      format: req.query.file_type,
      filename: req.query.file_name,
      cropmarks: req.query.file_crop,
    });

    res.redirect(
      `/templates/export/${req.params.project}/${project_export_job.data.job_id}`
    );
  });

  router.get("/export/:project/:job", async function (req, res) {
    let project_export_job = await Huddle.getExportJob({
      user: req.user,
      project: req.params.project,
      job: req.params.job,
    });

    res.send({
      data: Object.assign(
        {
          link: "/templates" + req.path,
        },
        project_export_job.data
      ),
    });
  });

  return router;
};

async function handleResize(req, res) {
  db.pages.findOne(
    {
      _id: req.query.row,
      type: "carousel",
    },
    function (err, row) {
      if (err) {
        res.status(400).send(err);
        return;
      }

      db.pages.find(
        {
          type: "size",
        },
        async function (err, sizes) {
          if (err) {
            res.status(400).send(err);
            return;
          }

          if (row.sizes && row.sizes.length) {
            row.sizes = row.sizes.map((size) => {
              return sizes.find((s) => s._id === size);
            });
          }

          let rowQuery = {
            user: req.user,
            category: row.templates_category
          };

          if (req.query.size && row.sizes && row.sizes.length) {
            let default_size = row.sizes.find((size) => {
              return size._id === req.query.size;
            });

            if (default_size) {
              rowQuery.size = {
                width: default_size.width,
                height: default_size.height,
              };
              // row.default_size = default_size;
            } else {
              rowQuery.size = {
                width: row.sizes[0].width,
                height: row.sizes[0].height,
              };
            }
          }

          if (row.default_tag) {
            rowQuery.search = row.default_tag;
          }

          let templates = await Huddle.getTemplates(rowQuery);
          let templateItems = templates.data.items;
          row.templates = templateItems;

          res.render("templates", {
            row: row,
            templates: [],
            cache: true,
            filename: "templates",
          });
        }
      );
    }
  );
}

function getQuery(req, row, sizes, templatesId) {
  if (row.sizes && row.sizes.length) {
    row.sizes = row.sizes.map((size) => {
      return sizes.find((s) => s._id === size);
    });
  }

  let rowQuery = {
    user: req.user,
    category: row.templates_category,
  };

  if (templatesId && req.session.content && req.session.content.form_file) {
    rowQuery.form_file = req.session.content.form_file;
  }

  if (row.sizes && row.sizes.length) {
    if (!row.default_size) {
      row.default_size = row.sizes[0]._id;
    }

    let default_size = row.sizes.find((size) => {
      return size._id === row.default_size;
    });

    if (default_size) {
      rowQuery.size = {
        width: default_size.width,
        height: default_size.height,
      };
    } else {
      rowQuery.size = {
        width: row.sizes[0].width,
        height: row.sizes[0].height,
      };
    }
  }

  if (row.default_tag) {
    rowQuery.search = row.default_tag;
  }

  return rowQuery;
}

function getCarouselQuery(req, templatesId) {
  let today = new Date();

  let carouselQuery = {
    type: "carousel",
    templates_category: parseInt(templatesId) || 39,
    $or: [
      {
        start_date: null,
        end_date: null,
      },
      {
        start_date: {
          $lte: today,
        },
        end_date: {
          $gte: today,
        },
      },
      {
        start_date: {
          $lte: today,
        },
        end_date: null,
      },
      {
        start_date: null,
        end_date: {
          $gte: today,
        },
      },
    ],
  };

  let special_access = req.user.account.special_access

  if (!global.isDev && (!special_access || !templatesId)) {
    carouselQuery.isDev = {
      $ne: true,
    };
  }

  return carouselQuery;
}
