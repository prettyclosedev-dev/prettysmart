const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const fs = require("fs");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const path = require("path");
const rp = require("request-promise");

module.exports = () => {
  router.get("/", async (req, res) => {
    db.pages.find(
      {
        type: "size",
      },
      async function (err, sizes) {
        sizes = _.orderBy(sizes, "order");
        let carouselQuery = getCarouselQuery(sizes);

        db.pages.find(carouselQuery, async function (err, rows) {
          await Promise.all(
            rows.map(async (row) => {
              let rowQuery = getQuery(req, row, sizes);
              let rowTemplates = await Huddle.getTemplates(rowQuery);
              let templateItems = rowTemplates.data.items;
              row.templates = templateItems;
              row.rowQuery = rowQuery;
            })
          );

          res.render("templates", {
            sizes: sizes,
            templates: _.orderBy(rows, "position"),
            row: { templates: [] },
            cache: true,
            filename: "templates",
            pageTitle: "Brand Collateral",
          });
        });
      }
    );
  });

  router.post("/refetch?", async (req, res) => {
    db.pages.find(
      {
        type: "size",
      },
      async function (err, sizes) {
        sizes = _.orderBy(sizes, "order");
        let carouselQuery = getCarouselQuery(sizes, req.body.row_name);

        db.pages.find(carouselQuery, async function (err, rows) {
          await Promise.all(
            rows.map(async (row) => {
              let rowQuery = getQuery(req, row, sizes);
              let rowTemplates = await Huddle.getTemplates(rowQuery);
              let templateItems = rowTemplates.data.items;
              row.templates = templateItems;
              row.rowQuery = rowQuery;
            })
          );

          res.render("templates", {
            sizes: sizes,
            templates: [],
            row: rows[0],
            cache: true,
            filename: "templates",
            pageTitle: "Brand Collateral",
          });
        });
      }
    );
  });

  router.get("/resize?", (req, res) => {
    db.pages.findOne(
      {
        _id: req.query.row,
        type: "carousel",
      },
      function (err, row) {
        db.pages.find(
          {
            type: "size",
          },
          async function (err, sizes) {
            if (row.sizes && row.sizes.length) {
              row.sizes = row.sizes.map((size) => {
                return sizes.find((s) => s._id === size);
              });
            }

            let rowQuery = {
              user: req.user,
              category: row.templates_category,
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
              pageTitle: "Brand Collateral",
            });
          }
        );
      }
    );
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

function getQuery(req, row, sizes) {
  if (row.sizes && row.sizes.length) {
    row.sizes = row.sizes.map((size) => {
      return sizes.find((s) => s._id === size);
    });
  }

  let rowQuery = {
    user: req.user,
    category: row.templates_category,
  };

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

function getCarouselQuery(sizes, specific) {
  let today = new Date();

  let carouselQuery = {
    type: "carousel",
    templates_category: 41,
    // name: specific || { $regex: "Collateral" },
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

  if (!global.isDev) {
    carouselQuery.isDev = {
      $ne: true,
    };
  }

  return carouselQuery;
}
