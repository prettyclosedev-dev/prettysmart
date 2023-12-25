const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const Account = require("../schemas/account");
const config = require("../config");
const stripe = require("stripe")(config.stripe.prod.secret);
const { getPricePerProduct, getCurrentInterval } = require("./utils");

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

      const plans = await getPlans(req.session.affiliate);
      if (plans && plans.data && plans.data.length) {
        let currentInterval = getCurrentInterval(plans, subscription, req);

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
          interval: "month",
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
        interval: "month",
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

      const plans = await getPlans(req.session.affiliate);
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

    const indexOfFree = products.data.map((p) => p.name).indexOf("Free");
    if (indexOfFree > -1) {
      products.data.splice(indexOfFree, 1);
    }

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
