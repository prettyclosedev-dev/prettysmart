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

/*
  TODO
    
  make sure this applies to landing page as well

  MOVE THIS TO A PROPER LIBRARY FILE!!!
    lib/services?
    lib/helpers?
  /
*/
async function getPlans() {
  try {
    const plans = await stripe.plans.list({ active: true, limit: 40 });
    const products = await stripe.products.list({ active: true });   

    const allowedProductIds = [
      "prod_SqgVHp8h05VYdK", // Single Agent
      "prod_Qu2Wz2OqYYzvAU", // Team
    ]

    const filteredProductsData = products.data.filter((prod) => allowedProductIds.includes(prod.id)).map((prod) => ({...prod}));
  
    /*
      TODO

      check for metadata.showinpricing
      if there are NO metadata.showinpricing === true
        then fallback to Single Agent and Teams
      if there are metadata.showinpricing === true
        then filter by metadata.showinpricing === true

      figure out if there is an active flag in stripe
        check status field in stripe.products?
    */

    if (filteredProductsData) {
      filteredProductsData.map((product) => {
        console.log(product.id, product.name)
        product.prices = {
          year: getPricePerProduct(product.id, plans, "year"),
          month: getPricePerProduct(product.id, plans, "month"),
        };

        /*
          TODO
          prevent hardcoded multiplier value. defer value to Stripe 

          add metadata:
            multiplier | 2

          then, 
            set multipler = product.metatadata.multiplier || 1 (fallback to 1 if no multiplier found)
            multiply product.prices.month.amount by multipler
            multiply product.prices.year.amount by multiplier

          Make sure Ruchy sets this up
        */

        if (product.name === "Team") {
          product.prices.month.amount *= 2; // Minimum of 2 agents
          product.prices.year.amount *= 2; // Minimum of 2 agents
        }
      });

      filteredProductsData.sort((a, b) => {
        return a.prices.month.amount - b.prices.month.amount;
      });

      return ({
        ...products,
        data: filteredProductsData
      });
    }
  } catch (error) {
    // DO SOME PROPER ERROR HANDLING!
  }
}
