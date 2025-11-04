const config = require("../config");
const stripe = require("stripe")(config.stripe.prod.secret);
const Usage = require("../schemas/usage");

function getPricePerProduct(product_id, plans, interval_type) {
  if (plans && plans.data) {
    return plans.data.find(
      (plan) => plan.product === product_id && plan.interval === interval_type
    );
  }
}

function amountOfCredits(planName) {
  if (planName) {
    switch (planName) {
      case "Free":
        return config.credits.free; // 12
      case "Pro":
      case "Basic":
        return config.credits.pro; // 120
      case "Business":
        return config.credits.business; // unlimited
    }
  }

  return config.credits.free;
}

function getHardcodedCurrentPlan(plan_id) {
  if (plan_id) {
    var name = "Free";
    Object.keys(config.stripe.plans).map((plan) => {
      Object.keys(config.stripe.plans[plan]).map((interval) => {
        if (config.stripe.plans[plan][interval] === plan_id) {
          name = plan.charAt(0).toUpperCase() + plan.slice(1);
        }
      });
    });

    return name;
  }

  return "Free";
}

async function calculateCreditsLeft(req, res, cb) {
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
  // res.locals.credits_left = credits;

  if (cb) {
    cb(credits);
  }

  return credits;
}

async function getCurrentPrice(req) {
  if (req.user.account.stripe_session_id) {
    try {
      const checkoutsession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );

      var subscription = await stripe.subscriptions.retrieve(
        checkoutsession.subscription
      );

      if (subscription && subscription.plan) {
        return subscription.plan.amount;
      }
    } catch (e) {}
  }
}

async function getIsCanceled(req) {
  if (req.user.account.stripe_session_id) {
    try {
      const checkoutsession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );

      var subscription = await stripe.subscriptions.retrieve(
        checkoutsession.subscription
      );

      if (subscription) {
        return subscription.status === "canceled";
      }
    } catch (e) {}
  }

  return false;
}

function getCurrentInterval(plans, subscription, req) {
  let currentInterval = "month";

  if (plans && plans.data) {
    plans.data.map((plan) => {
      Object.keys(plan.prices).map((interval) => {
        if (
          (subscription &&
            subscription.plan &&
            subscription.plan.id &&
            plan.prices && 
            plan.prices[interval] &&
            plan.prices[interval].id === subscription.plan.id) ||
          (req.user &&
            req.user.account &&
            plan.prices[interval].id === req.user.account.plan_id)
        ) {
          currentInterval = interval;
        }
      });
    });
  }

  return currentInterval;
}

module.exports = {
  getPricePerProduct,
  getCurrentPrice,
  amountOfCredits,
  getHardcodedCurrentPlan,
  calculateCreditsLeft,
  getCurrentInterval,
  getIsCanceled,
};
