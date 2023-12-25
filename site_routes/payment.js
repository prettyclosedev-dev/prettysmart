const express = require("express");
const router = express.Router();
const Account = require("../schemas/account");
const config = require("../config");
const {
  getHardcodedCurrentPlan,
  getCurrentPrice,
  getCurrentInterval,
} = require("./utils");
const stripe = require("stripe")(config.stripe.prod.secret);
const { searchContactByEmail, updateContact } = require("../hubspot");
const {
  unarchiveUser,
  signup,
  searchUser,
  createBrand,
  getToken,
  getBrand,
} = require("../admin_huddle");

module.exports = () => {
  router.get("/update/:plan_id", async (req, res) => {
    //   if (req.user.account.stripe_session_id) {
    //     try {
    //       const checkoutsession = await stripe.checkout.sessions.retrieve(
    //         req.user.account.stripe_session_id
    //       );
    //       const portalsession = await stripe.billingPortal.sessions.create({
    //         customer: checkoutsession.customer,
    //         return_url: config.BASE_URL + "/plans",
    //       });

    //       return res.redirect(portalsession.url);
    //     } catch (error) {
    //       console.log(error);
    //       //return res.redirect('/plans');
    //     }
    //   }

    Account.findOne({
      _id: req.user.account._id,
    }).then(async (account) => {
      try {
        if (req.user.account.stripe_session_id) {
          const session = await stripe.checkout.sessions.retrieve(
            req.user.account.stripe_session_id
          );

          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          );

          if (subscription.status !== "active") {
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
                  // For metered billing, do not pass quantity
                  quantity: 1,
                },
              ],
              allow_promotion_codes: true,
              // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
              // the actual Session ID is returned in the query parameter when your customer
              // is redirected to the success page.
              success_url:
                config.BASE_URL +
                "/payment/success?session_id={CHECKOUT_SESSION_ID}",
              cancel_url: config.BASE_URL + "/payment/canceled",
            });

            res.render("payment", {
              sessionId: session.id,
              stripe_pub_key: config.stripe.prod.pub,
              plan_name: getHardcodedCurrentPlan(req.params.plan_id),
              filename: "payment",
            });

            return;
          }

          const updateSubscription = await stripe.subscriptions.update(
            session.subscription,
            {
              items: [
                {
                  id: subscription.items.data[0].id,
                  price: req.params.plan_id,
                },
              ],
            }
          );
          // const session = await stripe.checkout.sessions.update(
          //   req.user.account.stripe_session_id,
          //   {
          //     line_items: [
          //       {
          //         price: req.params.plan_id,
          //         // For metered billing, do not pass quantity
          //         quantity: 1,
          //       },
          //     ],
          //     allow_promotion_codes: true,
          //     success_url:
          //       config.BASE_URL +
          //       "/payment/success?session_id={CHECKOUT_SESSION_ID}",
          //     cancel_url: config.BASE_URL + "/payment/canceled",
          //   }
          // );

          res.redirect(
            config.BASE_URL +
              "/payment/success?session_id=" +
              req.user.account.stripe_session_id
          );
        } else {
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
                // For metered billing, do not pass quantity
                quantity: 1,
              },
            ],
            allow_promotion_codes: true,
            // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
            // the actual Session ID is returned in the query parameter when your customer
            // is redirected to the success page.
            success_url:
              config.BASE_URL +
              "/payment/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: config.BASE_URL + "/payment/canceled",
          });

          res.render("payment", {
            sessionId: session.id,
            stripe_pub_key: config.stripe.prod.pub,
            plan_name: getHardcodedCurrentPlan(req.params.plan_id),
            filename: "payment",
          });
        }
      } catch (error) {
        res.status(400);
        return res.send({
          error: {
            message: error.message,
          },
        });
      }
    });
  });

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
          let huddleUserResponse = await searchUser(req.user);
          console.log("huddleUserResponse", huddleUserResponse);
          if (huddleUserResponse.success && huddleUserResponse.data.total > 0) {
            // User with the given email already exists
            let huddleUser = huddleUserResponse.data.items[0];

            // Handle this existing user (e.g., update details, unarchive, etc.)
            let updatedAccountDetails = {
              huddle_email: req.user.email,
              huddle_user_id: huddleUser.user_id,
              huddle_account_id: huddleUser.account.account_id,
              huddle_account_user_id: huddleUser.account_user_id,
            };

            // This is where you'd handle updating the existing user's data
            await Account.findOneAndUpdate(
              { _id: req.user.account._id },
              updatedAccountDetails,
              { new: true }
            );
          } else {
            // No user found with the given email, so proceed with signup
            let huddle_account = await signup(req.user, true);
            let accountDetailsForNewUser = {
              huddle_email: req.user.email,
              huddle_user_id: huddle_account.user.user_id,
              brands: [huddle_account.brand],
              huddle_account_id: huddle_account.account.account_id,
              huddle_account_user_id: huddle_account.user.account_user_id,
              unarchive_huddle_user: true
            };

            await Account.findOneAndUpdate(
              { _id: req.user.account._id },
              accountDetailsForNewUser,
              { new: true }
            );
          }

          req.session.issueWithHuddleAccount = false;
          req.user.account = account;
          await req.user.save();
          return res.redirect("/templates?ob=1");
        } catch (error) {
          // console.log("should be trying to signup again");
          if (
            error.name === "StatusCodeError" &&
            error.statusCode === 409 /*&&
            error.error &&
            error.error.message ===
              "The specified Email Address is already in use."*/
          ) {
            try {
              let huddle_account = await signup(req.user);
              let accountDetailsForNewUser = {
                huddle_email: req.user.email,
                huddle_user_id: huddle_account.user.user_id,
                brands: [huddle_account.brand],
                huddle_account_id: huddle_account.account.account_id,
                huddle_account_user_id: huddle_account.user.account_user_id,
                unarchive_huddle_user: true
              };

              await Account.findOneAndUpdate(
                { _id: req.user.account._id },
                accountDetailsForNewUser,
                { new: true }
              );

              req.session.issueWithHuddleAccount = false;
              req.user.account = account;
              await req.user.save();
              return res.redirect("/templates?ob=1");
            } catch (e) {
              console.log("failed again to signup", e);
              return await goToSubscribe(req, res, e);
            }
          } else {
            return await goToSubscribe(req, res, error);
          }
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
    console.log("plans", plans)
    if (plans && plans.data && plans.data.length) {
      var currentInterval = getCurrentInterval(
        plans,
        subscription,
        req
      );

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
    console.log(err)
    res.redirect("/login");
  }
}

async function getPlans() { // affiliate
  try {
    const plans = await stripe.plans.list({ active: true, limit: 20 });
    const products = await stripe.products.list({ active: true });
console.log(plans, products)
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
    console.log(error)
  }
}
