const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const fs = require("fs");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const path = require("path");
const rp = require("request-promise");
const Account = require("../schemas/account");

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

          res.render("reviews", {
            sizes: sizes,
            templates: _.orderBy(rows, "position"),
            row: { templates: [] },
            cache: true,
            filename: "reviews",
            pageTitle: "Google reviews - Beta",
            place_id: req.user.account.place_id,
          });
        });
      }
    );
  });

  router.get("/places?", async (req, res) => {
    const data = await rp({
      method: "get",
      url: `https://maps.googleapis.com/maps/api/place/textsearch/json`,
      qs: {
        key: config.google.maps.api_key,
        query: req.query.query,
      },
      json: true,
    });
    if (data && data.results && data.results.length) {
      var places = data.results.map((r) => {
        return { value: r.place_id, label: r.name };
      });
      res.send({ places, success: true, data });
      return;
    }

    res.send({
      success: false,
      error: data.error_message || "No results found.",
    });
  });

  router.post("/place/:id", async (req, res) => {
    try {
      await Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            place_id: req.params.id,
          },
        },
        {
          new: true,
        }
      );

      res.send({
        success: true,
      });
    } catch (e) {
      res.send({
        success: false,
        error: e,
      });
    }
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

          res.render("reviews", {
            sizes: sizes,
            templates: [],
            row: rows[0],
            cache: true,
            filename: "reviews",
            pageTitle: "Google reviews - Beta",
            place_id: req.user.account.place_id,
          });
        });
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
    name: specific || { $regex: "Reviews" },
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
