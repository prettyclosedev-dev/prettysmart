const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const Usage = require("../schemas/usage");
const Account = require("../schemas/account");
const config = require("../config");
const stripe = require("stripe")(config.stripe.prod.secret);
const {
  amountOfCredits,
  calculateCreditsLeft,
  getCurrentPrice,
  getIsCanceled,
} = require("./utils");
const Mercury = require("@postlight/mercury-parser");
const { updateUsage, searchContactByEmail } = require("../hubspot");

async function getRows(req) {
  return new Promise((resolve, reject) => {
    db.pages.find(
      {
        type: "size",
      },
      async function (err, sizes) {
        if (err) {
          console.log(err);
          reject(false);
        }

        sizes = _.orderBy(sizes, "order");

        let today = new Date();

        let carouselQuery = {
          type: "carousel",
          templates_category: null,
          image: { $exists: true },
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

        if (special_access) {
          if (req.user.account.generators && req.user.account.generators.length) {
            carouselQuery._id = { $in: req.user.account.generators.map(gen => gen.id) }
          } else {
            carouselQuery.isDev = {
              $ne: true,
            };
          }
        }

        if (!global.isDev && !special_access) {
          carouselQuery.isDev = {
            $ne: true,
          };
        }

        db.pages.find(carouselQuery, function (err, rows) {
          if (err || !rows || !rows.length) {
            console.log(err || "No Rows");
            reject(false);
          }

          rows.map((row) => {
            if (row.sizes && row.sizes.length) {
              row.sizes = row.sizes.map((size) => {
                return sizes.find((s) => s._id === size);
              });
            }

            let rowQuery = {
              user: req.user,
              limit: row.random || 4,
              category: row.category,
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

            row.rowQuery = rowQuery;
          });

          resolve({ sizes, rows: _.orderBy(rows, "position") });
        });
      }
    );
  });
}

module.exports = () => {
  router.get("/", async (req, res) => {
    let allRows,
      allSizes = [];
    try {
      const genRows = await getRows(req);
      if (genRows) {
        const { sizes, rows } = genRows;
        allRows = rows;
        allSizes = sizes;
      } else {
        console.log("No Rows");
      }
    } catch (error) {
      console.log(error);
    }
    // res.locals.credits_left = await calculateCreditsLeft(req, res);

    const canceledPlan = await getIsCanceled(req);
    if (canceledPlan) {
      Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            plan_canceled: true,
          },
        },
        {
          new: true,
        }
      ).then((account) => {});
    }

    res.render("generator", {
      sizes: allSizes,
      rows: allRows,
      selectedRow: undefined,
      currentPrice: await getCurrentPrice(req),
      cache: true,
      filename: "generator",
    });
  });

  router.get("/:id", async (req, res, next) => {
    let allRows,
      allSizes = [];
    let selectedRows = {};

    try {
      const genRows = await getRows(req);
      if (genRows) {
        const { sizes, rows } = genRows;
        allRows = rows;
        allSizes = sizes;
        selectedRows = rows.filter((row) => row._id === req.params.id);
      } else {
        console.log("No Rows");
      }
    } catch (error) {
      console.log(error);
    }

    res.render("generator", {
      sizes: allSizes,
      rows: allRows,
      selectedRow:
        selectedRows && selectedRows.length ? selectedRows[0] : undefined,
      currentPrice: await getCurrentPrice(req),
      cache: true,
      filename: "generator",
    });
  });

  router.post("/generate/:id", async (req, res) => {
    db.pages.findOne(
      {
        _id: req.params.id,
        type: "carousel",
      },
      async function (err, row) {
        if (err) {
          res.send({
            success: false,
            error: err,
          });
          return;
        }

        if (row) {
          let rowQuery = {
            user: req.user,
            limit: row.random || 4,
            category: row.category || row.templates_category,
            size: req.body.row_size,
          };

          if (row.default_tag) {
            rowQuery.search = row.default_tag;
          }

          row.rowQuery = rowQuery;

          const can = await canStillGenerate(req, res);
          if (can) {
            try {
              var newRow = await generate(row);

              const newUsage = await addUsage(req.user, row._id);

              res.locals.credits_left = amountOfCredits(res.locals.plan_name);

              try {
                const contactID = await searchContactByEmail(req.user.email);
                if (contactID) {
                  await updateUsage(contactID, res.locals.credits_left);
                }
              } catch (e) {
                console.log(e);
              }

              res.send({
                success: true,
                row: newRow,
                usage: newUsage,
              });
            } catch (error) {
              res.send(error);
            }
          } else {
            res.send({
              success: false,
              error: {
                message:
                  "You reached your monthly credit amount.\nUpgrade within the next 12 hours and get 25% off the first month.",
              },
            });
          }
        } else {
          res.send({
            success: false,
            error: {
              message: "No info found.",
            },
          });
        }
      }
    );
  });

  router.post("/parse?", async (req, res) => {
    try {
      const response = await Mercury.parse(req.query.url);
      res.send({
        success: true,
        body: response.content,
        title: response.title,
        image: response.lead_image_url,
        source: response.domain,
      }); // response.excerpt
    } catch (e) {
      console.log(e);
      res.send({ success: false, error: e });
    }
  });

  router.get("/usage/:id/delete", async (req, res, next) => {
    let deleteUsage = await Usage.remove({
      _id: req.params.id,
    });

    res.send({ success: true });
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
      `/generator/export/${req.params.project}/${project_export_job.data.job_id}`
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
          link: "/generator/" + req.path,
        },
        project_export_job.data
      ),
    });
  });

  return router;
};

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

async function generate(row) {
  let rowTemplates = await Huddle.getTemplates(row.rowQuery);
  let templateItems = rowTemplates.data.items;
  // if (row.random) {
  let randomTemplates = [];
  let randomTemplatesGroups = {};
  templateItems.forEach((template) => {
    if (template.template_title.indexOf("#") > -1) {
      let templateHash = template.template_title.split("#")[1][0];
      if (!randomTemplatesGroups[templateHash]) {
        randomTemplatesGroups[templateHash] = [];
      }
      randomTemplatesGroups[templateHash].push(template);
    } else {
      randomTemplates.push(template);
    }
  });
  for (templateHash in randomTemplatesGroups) {
    let randomTemplate = shuffle(randomTemplatesGroups[templateHash])[0];
    randomTemplates.push(randomTemplate);
  }
  row.templates = shuffle(randomTemplates).slice(0, 1);
  // } else {
  //   row.templates = templateItems;
  // }

  // title || name: row.templates[0].template_title
  // db.pages.find({ type: "template" }, async function (err, templates) {
  //   console.log(templates);
  //   if (templates && templates.template_classes) {
  //     row.template_classes = templates.template_classes;
  //   }
  // });

  return row;
}

async function canStillGenerate(req, res) {
  if (global.isDev) {
    return true;
  }

  let now = new Date();
  let usage = await Usage.count({
    user: req.user._id,
    created_at: {
      $gte: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      $lt: new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime(),
    },
  });

  let amountAllowed = amountOfCredits(res.locals.plan_name);

  let credits =
    !amountAllowed && res.locals.plan_name === "Business"
      ? "Unlimited"
      : amountAllowed - usage;
  res.locals.credits_left = credits;

  return (
    (!amountAllowed || amountAllowed - usage > 0) &&
    !req.user.account.payment_failed
  );
}

async function addUsage(user, row) {
  let saved_usage = new Usage({
    user: user._id,
    account: user.account._id,
    row_id: row,
  });

  await saved_usage.save();

  return saved_usage;
}
