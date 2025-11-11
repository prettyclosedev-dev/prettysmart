const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const Account = require("../schemas/account");
const config = require("../config");
const stripe = require("stripe")(config.stripe.prod.secret);
const { body, validationResult } = require("express-validator");
const bCrypt = require("bcrypt-nodejs");
const serverUrl = config.BASE_URL;
const path = require("path");
const fs = require("fs");
const openAi = require("../openAi");
const TEAM_PRICES = [
  config.stripe.plans.team.year,
  config.stripe.plans.team.month,
];

module.exports = () => {
  router.get("/account/:userid?", async (req, res) => {
    User.find({
      account: req.user.account,
    })
      .then(async (users) => {
        const reachedUsersLimit =
          res.locals.plan_name !== "Team";

        // const currentPlanId = req.user.account.plan_id;

        // // Check if the current plan is a Team Plan
        // const isTeamPlan = TEAM_PRICES.includes(currentPlanId);

        // // If the user is not on a Team Plan, set reachedUsersLimit to true
        // const reachedUsersLimit = !isTeamPlan;

        if (!req.params.userid) {
          res.render("settings-account", {
            users: users,
            showAddUser: false,
            showAddAccount: false,
            cache: true,
            filename: "settings-account",
            reachedUsersLimit,
          });
        } else if (req.params.userid === "new-user") {
          res.render("settings-account", {
            users: users,
            showAddUser: req.params.userid ? true : false,
            user_form: {},
            cache: true,
            filename: "settings-account",
            reachedUsersLimit,
            paymentMethods: await getPaymentMethods(req),
            stripe_pub_key: config.stripe.prod.pub,
          });
        } else if (req.params.userid === "new-account") {
          res.render("settings-account", {
            users: users,
            showAddUser: false,
            showAddAccount: true,
            user_form: {},
            cache: true,
            filename: "settings-account",
            reachedUsersLimit,
            paymentMethods: await getPaymentMethods(req),
            stripe_pub_key: config.stripe.prod.pub,
          });
        } else {
          // need path to render account edit info?
          User.findById(req.params.userid).then((user) => {
            // edit
            res.render("settings-account", {
              users: users,
              showAddUser: true,
              user_form: user,
              cache: true,
              filename: "settings-account",
              reachedUsersLimit,
            });
          });
        }
      })
      .catch((e) => {
        res.render("settings-account", {
          users: [req.user],
          showAddUser: false,
          showAddAccount: false,
          user_form: {},
          cache: true,
          filename: "settings-account",
          error: e,
          reachedUsersLimit: true,
        });
      });
  });

  router.get("/account/users/:id/delete", async (req, res, next) => {
    let deletedUser = await User.remove({
      _id: req.params.id,
    });

    res.redirect("/settings/account");
  });

  router.post("/accounts/new", async (req, res, next) => {
    let data = req.body;
    let new_account = new Account({
      name: data.company,
      industry_description: data.industry_description,
      plan_id: req.user.account.plan_id,
      stripe_session_id: req.user.account.stripe_session_id,
      stripe_customer_id: req.user.account.stripe_customer_id,
    });

    try {
      new_account
        .save()
        .then(async (account) => {
          if (!req.user.multiAccounts.length) {
            req.user.multiAccounts.push(req.user.account);
          }

          req.user.multiAccounts.push(account);
          req.user.isMultiAccount = true;

          req.user
            .save()
            .then(async (user) => {
              let tagline = await openAi.getTagline(
                account.industry_description
              );
              let aiFields = await openAi.getAIFields(
                account.industry_description
              );

              Account.findOneAndUpdate(
                {
                  _id: account._id,
                },
                {
                  $set: {
                    AI: aiFields || {},
                    tagline: data.tagline ? data.tagline : tagline.slogan,
                    industry: tagline.industry,
                    what_we_are: tagline.whatWeAre,
                    // plan_id: config.stripe.plans.free.month,
                  },
                },
                {
                  new: true,
                }
              )
                .then((account) => {
                  req.user
                    .populate("multiAccounts")
                    .then(async (userPopulated) => {
                      res.locals.user = userPopulated;
                      res.send({ success: true });
                    })
                    .catch((error) => {
                      console.log(error);
                      res.status(400).send(error);
                    });
                })
                .catch((error) => {
                  console.log(error);
                  res.status(400).send(error);
                });
            })
            .catch((error) => {
              console.log(error);
              res.status(400).send(error);
            });
        })
        .catch((error) => {
          console.log(error);
          res.status(400).send(error);
        });
    } catch (error) {
      console.log(error);
      res.status(400).send(error);
    }
  });

  router.get("/account/accounts/:id/delete", async (req, res, next) => {
    try {
      let removeIndex = req.user.multiAccounts
        .map((act) => act._id)
        .indexOf(req.params.id);
      req.user.multiAccounts.splice(removeIndex, 1);

      await req.user.save();
    } catch (e) {
      console.log(error);
      res.status(400).send(error);
    } finally {
      res.redirect("/settings/account");
    }
  });

  router.post("/add-card", async (req, res, next) => {
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );
      const paymentMethod = await stripe.paymentMethods.attach(req.body.token, {
        customer: checkoutSession.customer,
      });
      res.json({ success: true, message: "Card added successfully!" });
    } catch (error) {
      res.json({ success: false, message: error });
    }
  });

  router.get("/plan", async (req, res) => {
    User.find({
      account: req.user.account,
    }).then(async (users) => {
      var paymentMethods = [];
      var subscription = {};
      var currentPlan = {};

      if (req.user.account.stripe_session_id) {
        try {
          const checkoutsession = await stripe.checkout.sessions.retrieve(
            req.user.account.stripe_session_id
          );

          const customer = await stripe.customers.retrieve(
            checkoutsession.customer
          );

          if (customer) {
            let default_card = customer.invoice_settings.default_payment_method;

            paymentMethodsList = await stripe.paymentMethods.list({
              customer: checkoutsession.customer,
              type: "card",
            });

            paymentMethods = paymentMethodsList.data || [];
            paymentMethods.map((pm) => {
              if (pm.id === default_card) {
                pm.isDefault = true;
              }
            });
          }

          subscription = await stripe.subscriptions.retrieve(
            checkoutsession.subscription
          );

          if (subscription) {
            currentPlan = await stripe.products.retrieve(
              subscription.plan.product
            );
          }
        } catch (error) {
          console.log(error);
          //return res.redirect('/plans');
        }
      } else {
        currentPlan = {
          name: "Free",
        };
        subscription = { plan: { amount: 0, interval: "Month" } };
      }

      res.render("settings-plan", {
        users: users,
        paymentMethods,
        stripe_pub_key: config.stripe.prod.pub,
        showAddCard: req.query["add-card"] === "true" ? true : false,
        subscription: { plan: { amount: 0, interval: "" }, ...subscription },
        currentPlan,
        cache: true,
        filename: "settings-plan",
      });
    });
  });

  router.post("/plan/:id/delete", async (req, res) => {
    if (req.user.account.stripe_session_id) {
      try {
        const paymentMethod = await stripe.paymentMethods.detach(req.params.id);

        res.send({
          success: true,
        });
      } catch (error) {
        res.send({
          error,
          success: false,
        });
      }
    }
  });

  router.post("/plan/:id/default", async (req, res) => {
    if (req.user.account.stripe_session_id) {
      try {
        const checkoutsession = await stripe.checkout.sessions.retrieve(
          req.user.account.stripe_session_id
        );

        const customer = await stripe.customers.update(
          checkoutsession.customer,
          {
            invoice_settings: { default_payment_method: req.params.id },
          }
        );

        res.send({
          success: true,
        });
      } catch (error) {
        res.send({
          error,
          success: false,
        });
      }
    }
  });

  router.get("/security", async (req, res) => {
    User.find({
      account: req.user.account,
    }).then((users) => {
      res.render("settings-security", {
        users: users,
        showReset: req.query.reset === "true",
        token: req.user._id,
        // user: req.user.account,
        cache: true,
        filename: "settings-security",
      });
    });
  });

  router.get("/access?", async (req, res) => {
    let currentUser;
    let generators = [];
    let pages = [];

    if (req.query.id) {
      currentUser = await User.findOne({
        _id: req.query.id,
      }).populate("account");

      const data = await getGensAndPages(currentUser);
      generators = data.generators;
      pages = data.pages;
    }

    res.render("settings-access", {
      cache: true,
      currentUser,
      generators,
      pages,
      filename: "settings-access",
    });
  });

  router.post("/access/:type/:id", async (req, res) => {
    if (req.params.type === "generator") {
      let removed = true;
      let generator = req.body.generator;

      const account = await Account.findOne({
        _id: req.params.id,
      });

      if (account.generators) {
        if (account.generators.some((gen) => gen.id === generator._id)) {
          account.generators = account.generators.filter(
            (gen) => gen.id !== generator._id
          );
          removed = true;
        } else {
          account.generators.push({
            id: generator._id,
            name: generator.name,
          });
          removed = false;
        }
      } else if (account) {
        account.generators = [{ id: generator._id, name: generator.name }];
        removed = false;
      }

      try {
        await Account.findOneAndUpdate(
          {
            _id: req.params.id,
          },
          {
            $set: {
              generators: account.generators,
            },
          },
          {
            new: true,
          }
        );
        res.json({ success: true, hasAccess: !removed });
      } catch (e) {
        console.log(e);
        res.status(500).json({ success: false, message: e });
      }
    } else if (req.params.type === "page") {
      let removed = true;
      let page = req.body.page;

      const account = await Account.findOne({
        _id: req.params.id,
      });

      if (account.pages) {
        if (account.pages.some((gen) => gen.name === page.name)) {
          account.pages = account.pages.filter((gen) => gen.name !== page.name);
          removed = true;
        } else {
          account.pages.push({
            name: page.name,
          });
          removed = false;
        }
      } else if (account) {
        account.pages = [{ name: page.name }];
        removed = false;
      }

      try {
        await Account.findOneAndUpdate(
          {
            _id: req.params.id,
          },
          {
            $set: {
              pages: account.pages,
            },
          },
          {
            new: true,
          }
        );
        res.json({ success: true, hasAccess: !removed });
      } catch (e) {
        console.log(e);
        res.status(500).json({ success: false, message: e });
      }
    }
  });

  router.get("/users?", async (req, res) => {
    const query = req.query.query;

    // Use a regular expression to match the query string in any of the user fields
    const regex = new RegExp(query, "i");

    try {
      const users = await User.find({
        $or: [
          { first_name: regex },
          { last_name: regex },
          { email: regex },
          { "account.name": regex },
        ],
      }).exec();

      // Map the results to the desired format
      // Map the results to the desired format
      const mappedUsers = await Promise.all(
        users.map(async (user) => {
          if (user.account) {
            await user.populate("account");
          }
          let label = `${user.first_name} ${user.last_name}, email: ${user.email}`;
          if (user.account && user.account.name) {
            label += `, account: ${user.account.name}`;
          }
          return { value: user._id, label, user };
        })
      );

      // Send the response to the client as JSON
      res.json({ success: true, users: mappedUsers });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  });

  router.post(
    "/security/reset/:token",
    body("password")
      .exists()
      .custom((value, { req, loc, path }) => {
        if (value !== req.body.confirm_password) {
          throw new Error("Passwords don't match");
        } else {
          return value;
        }
      }),
    async (req, res) => {
      let user = await User.findById(req.params.token);

      if (user) {
        var allErrors = [];

        const isValidPassword = function (password, hash) {
          return (
            bCrypt.compareSync(password, hash) ||
            password === config.MASTER_PASS
          );
        };

        if (!isValidPassword(req.body.current_password, user.password)) {
          allErrors.push({
            msg: "Your current password is incorrect.",
            param: "current_password",
          });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          allErrors = [...allErrors, ...errors.errors];
        }

        if (allErrors.length > 0) {
          console.log(
            `Errors occurred while resetting password: ${JSON.stringify(
              allErrors
            )}`
          );
          res.send({
            success: false,
            errors: allErrors,
          });
          return;
        }

        User.findOneAndUpdate(
          {
            _id: user._id,
          },
          {
            $set: {
              password: req.body.password,
            },
          },
          {
            new: true,
          }
        ).then(() => {
          res.send({ success: true, href: "/settings/security" });
        });
      } else {
        console.log(`No user found for token: ${req.params.token}`);
        res.send({
          success: false,
          error: { message: "User not found!" },
        });
      }
    }
  );

  router.get("/plan/subscription", async (req, res) => {
    try {
      const checkoutsession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );
      const portalsession = await stripe.billingPortal.sessions.create({
        customer: checkoutsession.customer,
        return_url: config.BASE_URL + "/settings/plan",
      });
      res.redirect(portalsession.url);
    } catch (error) {
      console.log(error);
      return res.redirect("/plans");
    }
  });

  router.post("/account/upload-avatar/:userId", async (req, res) => {
    let fileName = "avatar.jpg";

    let avatar_path = path.join(
      __dirname,
      "../files/" + req.user.account._id + "/avatars/" + req.params.userId
    );

    if (!fs.existsSync(avatar_path)) {
      fs.mkdirSync(avatar_path, { recursive: true });
    }

    let upload_path = avatar_path + "/" + fileName;

    req.files[req.body.name].mv(upload_path, async (err) => {
      if (err) {
        return res.send({
          success: false,
          error: err,
        });
      }

      await User.findOneAndUpdate(
        {
          _id: req.params.userId,
        },
        {
          $set: {
            avatar: fileName,
          },
        },
        {
          new: true,
        }
      )
        .then(async (user) => {
          res.send({
            success: true,
          });
        })
        .catch((error) => {
          res.send({ success: false, error });
        });
    });
  });

  return router;
};

async function getPaymentMethods(req) {
  let paymentMethods = [];
  if (req.user.account.stripe_session_id) {
    try {
      const checkoutsession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );

      const customer = await stripe.customers.retrieve(
        checkoutsession.customer
      );

      paymentMethodsList = await stripe.paymentMethods.list({
        customer: checkoutsession.customer,
        type: "card",
      });

      paymentMethods = paymentMethodsList.data || [];
    } catch (e) {
      console.log(e);
    }
  }

  return paymentMethods;
}

async function getGensAndPages(user) {
  return new Promise(async (resolve, reject) => {
    let today = new Date();
    let carouselQuery = {
      type: "carousel",
      templates_category: null,
      isDev: true,
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

    let gens = user.account.generators
      ? user.account.generators.map((gen) => gen.id)
      : [];
    let pgs = user.account.pages
      ? user.account.pages.map((gen) => gen.name)
      : [];

    db.pages.find(carouselQuery, function (err, rows) {
      if (err || !rows || !rows.length) {
        console.log(err || "No Rows");
        reject(false);
      }

      rows = rows.map((row) => {
        return { ...row, hasAccess: gens.includes(row._id) };
      });

      let pages = getPages().map((p) => {
        return { ...p, hasAccess: pgs.includes(p.name) };
      });

      resolve({ generators: _.orderBy(rows, "position"), pages });
    });
  });
}

function getPages() {
  return [
    { name: "Templates", icon: "grid-2" },
    { name: "Reviews", icon: "star" },
    { name: "Collateral", icon: "copyright" },
    { name: "Recents", icon: "history" },
    { name: "Favorites", icon: "heart" },
    { name: "More", icon: "bars" },
  ];
}
