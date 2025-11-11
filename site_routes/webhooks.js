const express = require("express");
const router = express.Router();
const Account = require("../schemas/account");
const User = require("../schemas/user");
const config = require("../config");
const { unarchiveUser, archiveUser } = require("../admin_huddle");
const stripe = require("stripe")(config.stripe.prod.secret);

module.exports = () => {
  router.post("/", async (req, res) => {
    let data;
    let eventType;
    const webhookSecret = config.stripe.prod.webhook;

    if (webhookSecret) {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;
      let signature = req.headers["stripe-signature"];

      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.log(err);
        console.log(`Webhook signature verification failed.`);
        return res.sendStatus(400);
      }

      // Extract the object from the event.
      data = event.data;
      eventType = event.type;
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      data = req.body.data;
      eventType = req.body.type;
    }

    switch (eventType) {
      case "checkout.session.completed":
        // Payment is successful and the subscription is created.
        // You should provision the subscription.
        Account.findOneAndUpdate(
          {
            stripe_customer_id: req.body.data.object.customer,
          },
          {
            $set: {
              payment_failed: false,
            },
          },
          {
            new: true,
          }
        )
          .then(async (account) => {
            if (account && account.huddle_user_id) {
              const reinstated = await unarchiveUser(account);
              console.log(reinstated);
            }
          })
          .catch((error) => {
            console.log(error);
          });
        break;
      case "invoice.paid":
        // Continue to provision the subscription as payments continue to be made.
        // Store the status in your database and check when a user accesses your service.
        // This approach helps you avoid hitting rate limits.
        Account.findOneAndUpdate(
          {
            stripe_customer_id: req.body.data.object.customer,
          },
          {
            $set: {
              payment_failed: false,
            },
          },
          {
            new: true,
          }
        )
          .then(async (account) => {
            if (account && account.huddle_user_id) {
              const reinstated = await unarchiveUser(account);
              console.log(reinstated);
            }
          })
          .catch((error) => {
            console.log(error);
          });
        break;
      case "invoice.payment_failed":
        // The payment failed or the customer does not have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.
        Account.findOneAndUpdate(
          {
            stripe_customer_id: req.body.data.object.customer,
          },
          {
            $set: {
              payment_failed: true,
            },
          },
          {
            new: true,
          }
        )
          .then(async (account) => {
            if (account && account.huddle_user_id) {
              const deleted = await archiveUser(account);
              console.log(deleted);
            }
          })
          .catch((error) => {
            console.log(error);
          });
        break;
      case "customer.subscription.updated":
        if (req.body.data.object.canceled_at) {
          Account.findOneAndUpdate(
            {
              stripe_customer_id: req.body.data.object.customer,
            },
            {
              $set: {
                plan_canceled: true, // plan_id: null,
                payment_failed: false,
              },
            },
            {
              new: true,
            }
          )
            .then(async (account) => {
              if (account && account.huddle_user_id) {
                const deleted = await archiveUser(account);
                console.log(deleted);
              }
            })
            .catch((error) => {
              console.log(error);
            });
        } else {
          Account.findOneAndUpdate(
            {
              stripe_customer_id: req.body.data.object.customer,
            },
            {
              $set: {
                plan_id: req.body.data.object.plan.id,
                plan_canceled: false,
                payment_failed: false,
              },
            },
            {
              new: true,
            }
          )
            .then(async (account) => {
              if (account && account.huddle_user_id) {
                const reinstated = await unarchiveUser(account);
                console.log(reinstated);
              }
            })
            .catch((error) => {
              console.log(error);
            });
        }

        break;
      default:
      // Unhandled event type
    }

    res.sendStatus(200);
  });

  router.post("/class", async (req, res) => {
    let body = req.body;
    if (body.type === "class" && body.asset_type === "Unsplash") {
      User.updateMany(
        {},
        {
          $set: {
            "customization_content.unsplash_images": null,
          },
        },
        {
          new: true,
          multi: true,
        }
      )
        .then((users) => {})
        .catch((error) => {});
    }
    res.sendStatus(200);
  });

  return router;
};
