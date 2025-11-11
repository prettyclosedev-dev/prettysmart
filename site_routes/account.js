const fs = require("fs");
const express = require("express");
const router = express.Router();
const Account = require("../schemas/account");
const User = require("../schemas/user");
const config = require("../config");
const openAi = require("../openAi");
const stripe = require("stripe")(config.stripe.test.secret);
const { body, validationResult } = require("express-validator");
const TEAM_PRICES = [config.stripe.plans.team.year, config.stripe.plans.team.month];

// for(let i = 0;i<4000;i++){
//     setTimeout(() => {
//         generateCodes(i)
//     }, (i * 100))
// }

//getCodes()
async function getCodes(after) {
  const query = {
    limit: 100,
    coupon: "8eeSVFe5",
  };

  if (after) {
    query.starting_after = after;
  }

  const promotionCodes = await stripe.promotionCodes.list(query);

  const codes = promotionCodes.data.map((code) => {
    return code.code;
  });

  fs.appendFileSync("../codes.txt", "\n" + codes.join("\n"));

  if (promotionCodes) {
    const after = promotionCodes.data.pop().id;
    getCodes(after);
  }
}

async function generateCodes(i) {
  const promotionCode = await stripe.promotionCodes.create({
    coupon: "8eeSVFe5",
    max_redemptions: 1,
  });
  console.log(i);
}

module.exports = () => {
  router.get("/", async (req, res) => {
    let locals = {
      plan: {},
    };

    db.pages.findOne(
      {
        stripe_id: req.user.account.plan_id,
      },
      async function (err, plan) {
        if (plan) {
          locals.plan = plan;
          res.render("account", locals);
        } else {
          res.redirect("/plans");
        }
      }
    );
  });

  router.post("/", async (req, res) => {
    let oldAccountData = await Account.findById(req.user.account._id);
    let accountNewData = {
      name: req.body.name,
      industry: req.body.industry,
      brand_email: req.body.brand_email,
      industry_description: req.body.industry_description,
      tagline: req.body.tagline,
    };

    if (req.user.master) {
      accountNewData.AI = req.body.AI;
    }

    Account.findOneAndUpdate(
      {
        _id: req.user.account._id,
      },
      {
        $set: accountNewData,
      },
      {
        new: true,
      }
    )
      .then(async (account) => {
        if (
          account.industry_description &&
          oldAccountData.industry_description !== account.industry_description
        ) {
          console.log("Update AI Fields");
          Account.findOneAndUpdate(
            {
              _id: account._id,
            },
            {
              $set: {
                generating_ai: true,
              },
            },
            {
              new: true,
            }
          ).then(async () => {
            let aiData = await openAi.getAIFields(account.industry_description);
            console.log("AI Fields Updated");
            await Account.findOneAndUpdate(
              {
                _id: account._id,
              },
              {
                $set: {
                  AI: aiData,
                  generating_ai: false,
                },
              },
              {
                new: true,
              }
            );
          });
        }

        res.redirect("back");
      })
      .catch((error) => {
        res.send(error);
      });
  });

  router.get("/generate-tagline", async (req, res) => {
    if (!req.user.master) {
      return res.redirect("back");
    } else {
      let tagline = await openAi.getTagline(
        req.user.account.industry_description
      );
      console.log(tagline);
      Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            tagline: tagline.slogan,
          },
        },
        {
          new: true,
        }
      )
        .then((account) => {
          return res.redirect("back");
        })
        .catch((error) => {
          res.send(error);
        });
    }
  });

  router.get("/generate-ai", async (req, res) => {
    if (!req.user.master) {
      return res.redirect("back");
    } else {
      let aiFields = await openAi.getAIFields(
        req.user.account.industry_description
      );
      Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            AI: aiFields,
          },
        },
        {
          new: true,
        }
      )
        .then((account) => {
          res.redirect("back");
        })
        .catch((error) => {
          res.send(error);
        });
    }
  });

  router.get("/toggle-draft", async (req, res) => {
    if (!req.user.master) {
      return res.redirect("back");
    } else {
      Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            isDraft: !req.user.account.isDraft,
            isBoarded: !req.user.account.isBoarded,
          },
        },
        {
          new: true,
        }
      )
        .then((account) => {
          return res.redirect("back");
        })
        .catch((error) => {
          res.send(error);
        });
    }
  });

  router.get("/toggle-waiting", async (req, res) => {
    if (!req.user.master) {
      return res.redirect("back");
    } else {
      Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            isWaiting: !req.user.account.isWaiting,
          },
        },
        {
          new: true,
        }
      )
        .then((account) => {
          return res.redirect("back");
        })
        .catch((error) => {
          res.send(error);
        });
    }
  });

  router.get("/subscription", async (req, res) => {
    try {
      const checkoutsession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );
      const portalsession = await stripe.billingPortal.sessions.create({
        customer: checkoutsession.customer,
        return_url: "https://prettyclose.co/account",
      });
      res.redirect(portalsession.url);
    } catch (error) {
      console.log(error);
      return res.redirect("/plans");
    }
  });

  router.get("/brand", async (req, res) => {
    res.render("brand");
  });

  router.get("/users", async (req, res) => {
    User.find({
      account: req.user.account,
    }).then((users) => {
      res.render("users", {
        users: users,
      });
    });
  });

  router.get("/users/clear", async (req, res) => {
    User.findOneAndUpdate(
      {
        _id: req.user._id,
      },
      {
        $set: {
          customization_content: null,
        },
      },
      {
        new: true,
      }
    )
      .then((user) => {
        res.redirect("back");
      })
      .catch((error) => {
        res.redirect("back");
      });
  });

  router.get("/users/:id", async (req, res) => {
    if (req.params.id === "new") {
      res.render("user", {
        user_form: {},
      });
    } else {
      User.findById(req.params.id).then((user) => {
        res.render("user", {
          user_form: user,
        });
      });
    }
  });

  router.post(
    "/users/new",
    body("email")
      .isEmail()
      .custom((value) => {
        return User.findOne({
          email: { $regex: new RegExp("^" + value.toLowerCase(), "i") },
        }).then((user) => {
          if (user) {
            return Promise.reject("E-mail already in use");
          }
        });
      }),
    async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let user = req.body;

      if (req.user.role !== "owner") {
        delete user.role;
      }

      const currentPlanId = req.user.account.plan_id;

      // Check if the current plan is part of the TEAM_PRICES
      if (!TEAM_PRICES.includes(currentPlanId)) {
        // Disable adding users and redirect with a message
        return res.status(403).json({
          success: false,
          message: "You need to upgrade to the Teams plan to add users.",
        });
      }

      user.account = req.user.account;
      let newUser = new User(user);

      newUser
        .save()
        .then(async (user) => {
          // Update the subscription quantity based on the number of users in the account
          const accountUsers = await User.find({
            account: req.user.account._id,
          });
          const userCount = Math.max(accountUsers.length, 2); // Ensure minimum of 2 users

          if (req.user.account.stripe_session_id) {
            const session = await stripe.checkout.sessions.retrieve(
              req.user.account.stripe_session_id
            );
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription
            );

            // Update the subscription quantity for the Team plan
            await stripe.subscriptions.update(subscription.id, {
              items: [
                {
                  id: subscription.items.data[0].id,
                  quantity: userCount,
                },
              ],
            });
          }

          res.send({ success: true });
        })
        .catch((err) => {
          console.log(err);
          next(err);
        });
    }
  );

  router.post("/users/:id", async (req, res, next) => {
    let user = req.body;

    // If the current user is not an owner, don't allow role updates
    if (req.user.role !== "owner") {
      delete user.role;
    }

    // Avoid updating sensitive fields like email or avatar directly from the form
    delete user.email;
    delete user.avatar;

    try {
      let updatedUser = await User.findOneAndUpdate(
        {
          _id: req.params.id,
        },
        {
          $set: user,
        },
        {
          new: true,
        }
      );

      // Respond with JSON indicating success
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      // Handle any errors and return a JSON error response
      console.error("Error updating user:", error);
      res.status(500).json({ success: false, error: "Failed to update user" });
    }
  });

  router.get("/users/:id/delete", async (req, res, next) => {
    let deletedUser = await User.remove({
      _id: req.params.id,
    });

    res.redirect("/settings/account");
  });

  router.post("/select/:id", async (req, res) => {
    try {
      let account = await Account.findOne({
        _id: req.params.id,
      });
      if (account) {
        req.user.account = account;
        await req.user.save();
        res.locals.user = req.user;
      }
    } catch (e) {
      console.log(e);
    } finally {
      res.redirect(req.get("referer"));
    }
  });

  return router;
};
