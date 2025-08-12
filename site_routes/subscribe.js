const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const Account = require("../schemas/account");
const config = require("../config");
const stripe = require("stripe")(config.stripe.prod.secret);
const { getPlans } = require("../lib/stripe");

module.exports = () => {
  router.get("/", async (req, res) => {
    req.session.upgrading = req.query.upgrading;

    try {
      var subscription;
      if (req.user.account.stripe_session_id) {
        const checkoutsession = await stripe.checkout.sessions.retrieve(
          req.user.account.stripe_session_id
        );

        subscription = await stripe.subscriptions.retrieve(
          checkoutsession.subscription
        );
      }

      const plans = await getPlans(req.user.id);
    
      if (plans && plans.data && plans.data.length) {
        let currentInterval = "year";

        res.render("subscribe", {
          products: plans,
          subscription,
          interval: currentInterval,
          cache: true,
          filename: "subscribe",
        });
      } else {
        res.render("subscribe", {
          products: {},
          subscription: {},
          interval: "year",
          error: {
            message: "Failed to get plans.",
          },
          cache: true,
          filename: "subscribe",
        });
      }
    } catch (error) {
      res.render("subscribe", {
        products: {},
        subscription: {},
        interval: "year",
        error,
        cache: true,
        filename: "subscribe",
      });
    }

    // db.pages.find({
    //     type : 'plan'
    // }, function(err, plans){

    //     plans = _.orderBy(plans, 'order');

    //     res.render('plans', {
    //         plans : plans
    //     });
    // });
  });

  router.get("/:id", async (req, res) => {
    db.pages.findOne(
      {
        _id: req.params.id,
      },
      async function (err, plan) {
        if (plan) {
          Account.findOneAndUpdate(
            {
              _id: req.user.account._id,
            },
            {
              $set: {
                plan_id: plan.stripe_id,
              },
            },
            {
              new: true,
            }
          ).then((user) => {
            req.user.account.plan_id = user.plan_id;
            res.redirect("/payment");
            //res.redirect('/templates?ob=1');
          });
        } else {
          res.redirect("back");
        }
      }
    );
  });

  router.post("/interval/:interval", async (req, res) => {
    const interval = req.params.interval;

    try {
      var subscription;
      if (req.user.account.stripe_session_id) {
        const checkoutsession = await stripe.checkout.sessions.retrieve(
          req.user.account.stripe_session_id
        );

        subscription = await stripe.subscriptions.retrieve(
          checkoutsession.subscription
        );
      }

      const plans = await getPlans(req.user.id);
      if (plans && plans.data && plans.data.length) {
        res.render("subscribe", {
          products: plans,
          subscription,
          interval,
          cache: true,
          filename: "subscribe",
        });
      } else {
        res.render("subscribe", {
          products: {},
          subscription: {},
          interval,
          error: {
            message: "Failed to get plans.",
          },
          cache: true,
          filename: "subscribe",
        });
      }
    } catch (error) {
      res.render("subscribe", {
        products: {},
        subscription: {},
        interval,
        error,
        cache: true,
        filename: "subscribe",
      });
    }
  });

  return router;
};
