const express = require("express");
const router = express.Router();
const Account = require("../schemas/account");
const User = require("../schemas/user");
const config = require("../config");
const {sendWelcomeEmail} = require("../lib/mail");

const {
  getHardcodedCurrentPlan,
  getCurrentPrice,
  getCurrentInterval,
} = require("./utils");
const stripe = require("stripe")(config.stripe.test.secret);
const { searchContactByEmail, updateContact } = require("../hubspot");
const TEAM_PRICES = [
  config.stripe.plans.team.year,
  config.stripe.plans.team.month,
];

module.exports = () => {
  router.get("/update/:plan_id", async (req, res) => {
    try {
      const account = await Account.findOne({ _id: req.user.account._id });

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Check how many users the account currently has
      const accountUsers = await User.find({ account: account._id });
      const userCount = Math.max(accountUsers.length, 2); // Ensure minimum of 2 users for Teams plan

      if (req.user.account.stripe_session_id) {
        const session = await stripe.checkout.sessions.retrieve(
          req.user.account.stripe_session_id
        );
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );

        // If the subscription is not active, create a new session
        if (subscription.status !== "active") {
          const newSession = await stripe.checkout.sessions.create({
            mode: "subscription",
            subscription_data: {
              trial_period_days: 7,
            },
            payment_method_types: ["card"],
            customer_email: req.user.email,
            line_items: [
              {
                price: req.params.plan_id,
                quantity: TEAM_PRICES.includes(req.params.plan_id)
                  ? userCount
                  : 1, // Set quantity based on plan type
              },
            ],
            allow_promotion_codes: true,
            success_url: `${config.BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.BASE_URL}/payment/canceled`,
          });

          const priceObject = await stripe.prices.retrieve(req.params.plan_id);
          const plan_price = priceObject.unit_amount / 100; // Convert from cents
          const plan_interval = priceObject.recurring
            ? priceObject.recurring.interval
            : "one-time";
          const plan_type = TEAM_PRICES.includes(req.params.plan_id)
            ? "team"
            : "individual";

          return res.render("payment", {
            sessionId: newSession.id,
            stripe_pub_key: config.stripe.test.pub,
            plan_name: getHardcodedCurrentPlan(req.params.plan_id),
            plan_price: plan_price,
            plan_interval: plan_interval,
            plan_type: plan_type,
            filename: "payment",
          });
        }

        // Update the subscription with new plan and quantity
        await stripe.subscriptions.update(session.subscription, {
          items: [
            {
              id: subscription.items.data[0].id,
              price: req.params.plan_id,
              quantity: TEAM_PRICES.includes(req.params.plan_id)
                ? userCount
                : 1, // Adjust quantity based on plan type
            },
          ],
        });

        return res.redirect(
          `${config.BASE_URL}/payment/success?session_id=${req.user.account.stripe_session_id}`
        );
      } else {
        // If no session exists, create a new session
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          subscription_data: {
            trial_period_days: 7,
          },
          payment_method_types: ["card"],
          customer_email: req.user.email,
          line_items: [
            {
              price: req.params.plan_id,
              quantity: TEAM_PRICES.includes(req.params.plan_id)
                ? userCount
                : 1, // Set quantity based on plan type
            },
          ],
          allow_promotion_codes: true,
          success_url: `${config.BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${config.BASE_URL}/payment/canceled`,
        });

        const priceObject = await stripe.prices.retrieve(req.params.plan_id);
        const plan_price = priceObject.unit_amount / 100; // Convert from cents
        const plan_interval = priceObject.recurring
          ? priceObject.recurring.interval
          : "one-time";
        const plan_type = TEAM_PRICES.includes(req.params.plan_id)
          ? "team"
          : "individual";

        res.render("payment", {
          sessionId: session.id,
          stripe_pub_key: config.stripe.test.pub,
          plan_name: getHardcodedCurrentPlan(req.params.plan_id),
          plan_price: plan_price,
          plan_interval: plan_interval,
          plan_type: plan_type,
          filename: "payment",
        });
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      return res.status(400).json({ error: error.message });
    }
  });

  module.exports = router;

  router.get("/success", async (req, res) => {
    if (req.query.session_id) {
      const session = await stripe.checkout.sessions.retrieve(
        req.query.session_id
      );

      var subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );

      req.user.account.plan_id = subscription.plan.id;
      res.locals.plan_name = getHardcodedCurrentPlan(req.user.account.plan_id);

      try {
          await sendWelcomeEmail(req.user.email);
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Don't block signup if email fails
        }

      try {
        const contactID = await searchContactByEmail(req.user.email);
        if (contactID) {
          const price = await getCurrentPrice(req);
          await updateContact(contactID, {
            plan: res.locals.plan_name,
            plan_price: price / 100,
            plan_status: "Active",
          });
        }
      } catch (e) {}

      Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            stripe_session_id: req.query.session_id,
            stripe_customer_id: session.customer,
            plan_id: subscription.plan.id,
            payment_failed: false,
          },
        },
        {
          new: true,
        }
      ).then(async (account) => {
        req.user.account.stripe_session_id = account.stripe_session_id;
        req.user.account.stripe_customer_id = account.stripe_customer_id;

        try {
          req.user.account = account;
          
          await req.user.save();

          return res.redirect("/brand/build?url=/brand?ob=1");
        } catch (error) {
          return await goToSubscribe(req, res, error);
        }
      });
    } else {
      return res.redirect("/plans");
    }
  });

  router.get("/canceled", async (req, res) => {
    res.redirect("/plans");
  });

  router.get("/free", async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(
      req.user.account.stripe_session_id
    );

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    const updateSubscription = await stripe.subscriptions.update(
      session.subscription,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: config.stripe.plans.free.month,
          },
        ],
      }
    );

    res.redirect(
      config.BASE_URL +
        "/payment/success?session_id=" +
        req.user.account.stripe_session_id
    );

    return;

    req.user.account.plan_id = config.stripe.plans.free.month;
    res.locals.plan_name = config.stripe.plans.free.month;

    try {
      const contactID = await searchContactByEmail(req.user.email);
      if (contactID) {
        await updateContact(contactID, {
          plan: res.locals.plan_name,
          plan_price: 0,
          plan_status: "Active",
        });
      }
    } catch (e) {}

    Account.findOneAndUpdate(
      {
        _id: req.user.account._id,
      },
      {
        $set: {
          plan_id: config.stripe.plans.free.month,
        },
      },
      {
        new: true,
      }
    ).then((account) => {
      res.redirect("/templates?ob=1");
    });
  });

  return router;
};

async function goToSubscribe(req, res, error) {
  try {
    console.log("Error in handling user:", error);

    req.session.upgrading = req.query.upgrading;
    var subscription;
    if (req.user.account.stripe_session_id) {
      const checkoutsession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );

      subscription = await stripe.subscriptions.retrieve(
        checkoutsession.subscription
      );
    }

    const plans = await getPlans(); // req.session.affiliate
    console.log("plans", plans);
    if (plans && plans.data && plans.data.length) {
      var currentInterval = getCurrentInterval(plans, subscription, req);

      return res.render("subscribe", {
        products: plans,
        subscription,
        interval: currentInterval,
        cache: true,
        filename: "subscribe",
        error,
      });
    } else {
      return res.render("subscribe", {
        products: {},
        subscription: {},
        interval: "month",
        error: {
          message: "Failed to get plans. " + error.message,
        },
        cache: true,
        filename: "subscribe",
      });
    }
  } catch (err) {
    console.log(err);
    res.redirect("/login");
  }
}

async function getPlans() {
  // affiliate
  try {
    const plans = await stripe.plans.list({ active: true, limit: 20 });
    const products = await stripe.products.list({ active: true });
    console.log(plans, products);
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
  } catch (error) {
    console.log(error);
  }
}
