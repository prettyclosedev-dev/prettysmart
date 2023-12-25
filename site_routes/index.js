const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config");
const stripe = require("stripe")(config.stripe.prod.secret);
const { getPricePerProduct, getCurrentInterval } = require("./utils");

module.exports = () => {
  router.get("/", async (req, res) => {
    req.session.affiliate = req.query.affiliate;
    const plans = await getPlans();
    let currentInterval = getCurrentInterval(plans, null, req);
    res.render("landing", {
      signup_root: "/landing",
      signup_text: "Signup",
      signup_link: "/signup",
      authenticated: req.isAuthenticated(),
      products: plans,
      interval: currentInterval,
      cache: true,
      filename: "landing",
    });
  });

  router.get("/landing", async (req, res) => {
    req.session.affiliate = req.query.affiliate;
    const plans = await getPlans(req.query.affiliate);
    let currentInterval = getCurrentInterval(plans, null, req);
    res.render("landing", {
      signup_root: "/landing",
      signup_text: "Signup",
      signup_link: "/signup",
      authenticated: req.isAuthenticated(),
      products: plans,
      interval: currentInterval,
      cache: true,
      filename: "landing",
    });
  });

  router.post("/interval/:interval", async (req, res) => {
    const interval = req.params.interval;

    try {
      const plans = await getPlans();
      if (plans && plans.data && plans.data.length) {
        res.render("landing", {
          products: plans,
          interval,
          authenticated: req.isAuthenticated(),
          cache: true,
          filename: "landing",
        });
      } else {
        res.render("landing", {
          products: {},
          authenticated: req.isAuthenticated(),
          error: {
            message: "Failed to get plans.",
          },
          cache: true,
          filename: "landing",
        });
      }
    } catch (error) {
      res.render("landing", {
        products: {},
        authenticated: req.isAuthenticated(),
        interval,
        error,
        cache: true,
        filename: "landing",
      });
    }
  });

  router.post("/landing/interval/:interval", async (req, res) => {
    const interval = req.params.interval;

    try {
      const plans = await getPlans();
      if (plans && plans.data && plans.data.length) {
        res.render("landing", {
          products: plans,
          interval,
          authenticated: req.isAuthenticated(),
          cache: true,
          filename: "landing",
        });
      } else {
        res.render("landing", {
          products: {},
          authenticated: req.isAuthenticated(),
          error: {
            message: "Failed to get plans.",
          },
          cache: true,
          filename: "landing",
        });
      }
    } catch (error) {
      res.render("landing", {
        products: {},
        authenticated: req.isAuthenticated(),
        interval,
        error,
        cache: true,
        filename: "landing",
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
        if ( a.prices.month && b.prices.month) {
          return a.prices.month.amount - b.prices.month.amount;
        } else {
          return 0 < 1
        }
      });

      return products;
    }
  } catch (error) {
    console.log(error)
  }
}
