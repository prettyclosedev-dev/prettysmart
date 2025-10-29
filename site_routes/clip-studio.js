const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const fs = require("fs");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const path = require("path");
const rp = require("request-promise");
const Account = require("../schemas/account");
const User = require("../schemas/user");
const AdminHuddle = require("../admin_huddle");
const { body, validationResult } = require("express-validator");
const openAi = require("../openAi");
const { searchContactByEmail, updateContact } = require("../hubspot");
const { getCurrentInterval, getPricePerProduct } = require("./utils");
const stripe = require("stripe")(config.stripe.test.secret);

module.exports = () => {
  router.get("/", async (req, res) => {
    // if (!req.user) {
    //   try {
    //     req.user = await signup(req, res);
    //   } catch (e) {
    //     console.log(e);
    //     res.send(e).status(400);
    //   }
    // }

    // if (res.locals.needsToLogin) {
    //   try {
    //     const refreshed = await refresh(req);
    //     res.locals.needsToLogin = false;
    //   } catch (err) {
    //     res.send(err).status(400);
    //   }
    // }

    db.pages.find(
      {
        type: "size",
      },
      function (err, sizes) {
        sizes = _.orderBy(sizes, "order");
        let carouselQuery = getCarouselQuery(sizes);

        db.pages.find(carouselQuery, async function (err, rows) {
          await Promise.all(
            rows.map(async (row) => {
              let rowQuery = getQuery(req, row, sizes);
              let rowTemplates = await Huddle.getTemplates(rowQuery);
              let templateItems = rowTemplates.data.items;
              row.templates = templateItems;
            })
          );

          const plans = await getPlans();
          let currentInterval = getCurrentInterval(plans, null, req);

          res.render("clip-studio", {
            sizes: sizes,
            templates: _.orderBy(rows, "position"),
            row: { templates: [] },
            cache: true,
            filename: "clip-studio",
            brand: await Huddle.getBrandObject(req.user.account).catch(
              console.log
            ),
            subscription: await getSubscription(req),
            products: plans,
            interval: currentInterval,
            downloads_left: 20,
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

          const plans = await getPlans();
          let currentInterval = getCurrentInterval(plans, null, req);

          res.render("clip-studio", {
            sizes: sizes,
            templates: [],
            row: rows[0],
            cache: true,
            filename: "clip-studio",
            brand: await Huddle.getBrandObject(req.user.account).catch(
              console.log
            ),
            subscription: await getSubscription(req),
            products: plans,
            interval: currentInterval,
            downloads_left: 20,
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

            const plans = await getPlans();
            let currentInterval = getCurrentInterval(plans, null, req);

            res.render("clip-studio", {
              row: row,
              templates: [],
              cache: true,
              filename: "clip-studio",
              brand: await Huddle.getBrandObject(req.user.account).catch(
                console.log
              ),
              subscription: await getSubscription(req),
              products: plans,
              interval: currentInterval,
              downloads_left: 20,
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

async function refresh(req) {
  return new Promise(async (resolve, reject) => {
    try {
      let token = await Huddle.getToken(req.user);

      User.findOneAndUpdate(
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
      )
        .populate("account")
        .then((user) => {
          req.logIn(
            {
              id: user._id,
              master: true,
            },
            (err, u) => {
              if (err) {
                reject(err);
              } else {
                resolve(true);
              }
            }
          );
        })
        .catch((error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

async function getSubscription(req) {
  var subscription = {};

  if (req.user.account.stripe_session_id) {
    try {
      const checkoutsession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );

      subscription = await stripe.subscriptions.retrieve(
        checkoutsession.subscription
      );
    } catch (error) {
      console.log(error);
    }
  } else {
    subscription = { plan: { amount: 0, interval: "Month" } };
  }

  return subscription;
}

async function signup(req, res) {
  return new Promise((resolve, reject) => {
    let huddle_account = config.huddle_account;
    let new_user = new User({});
    let new_account = new Account({
      huddle_email: huddle_account.user.email,
      huddle_account_id: huddle_account.account.account_id,
      huddle_user_id: huddle_account.user.user_id,
      huddle_account_user_id: huddle_account.user.account_user_id,
      brands: [huddle_account.brand],
    });

    try {
      new_account
        .save()
        .then(async (account) => {
          new_user.account = account;
          let token = await Huddle.getToken(new_user);
          new_user.role = "owner";
          new_user.login_date = Date.now();
          new_user.token = token;

          new_user
            .save()
            .then(async (user) => {
              req.logIn(user._id, (err, u) => {
                res.locals.user = user;
                res.locals.plan_name = "Free";
                res.locals.payment_failed = false;

                resolve(user);
              });
            })
            .catch((err) => {
              console.log(err);
              reject(err);
            });
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
}

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

function getCarouselQuery(sizes) {
  let today = new Date();

  let carouselQuery = {
    type: "carousel",
    templates_category: 54,
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

async function getPlans(affiliate) {
  try {
    const plans = await stripe.plans.list({ active: true, limit: 20 });
    const products = await stripe.products.list({ active: true });

    const indexOfBasic = products.data
      .map((prod) => prod.name)
      .indexOf("Basic");
    products.data.splice(indexOfBasic, 1);
    const indexOfBrandHelpProd = products.data
      .map((prod) => prod.id)
      .indexOf("prod_LFnXWepOlSCWVD");
    products.data.splice(indexOfBrandHelpProd, 1);

    // if (affiliate) {
    const indexOfFree = products.data.map((p) => p.name).indexOf("Free");
    if (indexOfFree > -1) {
      products.data.splice(indexOfFree, 1);
    }
    // }

    const indexOfStarter = products.data.map((p) => p.name).indexOf("Starter");
    if (indexOfStarter > -1) {
      products.data.splice(indexOfStarter, 1);
    }

    const indexOfUnlimited = products.data
      .map((p) => p.name)
      .indexOf("Unlimited");
    if (indexOfUnlimited > -1) {
      products.data.splice(indexOfUnlimited, 1);
    }

    if (products && products.data) {
      products.data.map((product) => {
        product.prices = {
          year: getPricePerProduct(product.id, plans, "year"),
          month: getPricePerProduct(product.id, plans, "month"),
        };
      });

      products.data.sort((a, b) => {
        return a.prices.month.amount - b.prices.month.amount;
      });

      return products;
    }
  } catch (error) {}
}
