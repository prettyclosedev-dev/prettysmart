const express = require("express");
const router = express.Router();
const passport = require("passport");
const Account = require("../schemas/account");
const User = require("../schemas/user");
const Huddle = require("../huddle");
const AdminHuddle = require("../admin_huddle");
const { searchContactByEmail, updateContact } = require("../hubspot");
const { getHardcodedCurrentPlan } = require("./utils");
const fs = require("fs");
const config = require("../config");
const stripe = require("stripe")(config.stripe.prod.secret, {
  telemetry: false,
});

module.exports = () => {
  router.get("/", async (req, res) => {
    // await getPaidAccountNames();
    // await updateAllAccounts();
    // const results = await checkAccountsStatus(["zev@czechmatelogistics.com", "info@grandflooringus.com"])
    // console.log(results)

    // const emails = ["zev@czechmatelogistics.com", "info@grandflooringus.com"]; // your list of emails
    // const result = await createHuddleAccountsForEmails(emails);

    // console.log("Successfully created Huddle accounts for:", result.success);
    // console.log("Failed to create Huddle accounts for:", result.failed);

    res.render("login", {});
  });

  router.get("/:account", async (req, res) => {
    req.session.issueWithHuddleAccount = false;
    if (req.user && req.user.master) {
      let account = await Account.findOne({
        _id: req.params.account,
      });

      if (!account) {
        return res.redirect("/login");
      }

      let user = await User.findOne({
        account: req.params.account,
        //role : "owner"
      });

      if (!user) {
        return res.redirect("/login");
      }

      try {
        let token = await Huddle.getToken({
          account: account,
        });

        User.findOneAndUpdate(
          {
            _id: user._id,
          },
          {
            $set: {
              login_date: Date.now(),
              token: token,
            },
          },
          {
            new: true,
          }
        )
          .populate("account")
          .populate("multiAccounts")
          .then((user) => {
            req.logIn(
              {
                id: user._id,
                master: true,
              },
              (err, u) => {
                res.redirect("/templates");
              }
            );
          })
          .catch((error) => {
            res.send({ error: error });
          });
      } catch (error) {
        if (
          error.name === "StatusCodeError" &&
          error.statusCode === 400 &&
          error.error &&
          error.error.error_description === "Invalid grant: invalid user"
        ) {
          req.session.issueWithHuddleAccount = true;
          req.logIn(
            {
              id: user._id,
              master: true,
            },
            (err, u) => {
              res.send({ route: "/subscribe", error: err });
            }
          );
        } else {
          res.send({ route: "/login", error: error });
        }
      }
    } else {
      res.render("404", {});
    }
  });

  router.post("/", (req, res, next) => {
    req.session.issueWithHuddleAccount = false;
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({
          errors: [
            {
              param: "login",
              msg: info,
            },
          ],
        });
      }

      // console.log('Authenticated user:', user);

      try {
        let token = await Huddle.getToken(user);

        User.findOneAndUpdate(
          {
            _id: user._id,
          },
          {
            $set: {
              login_date: Date.now(),
              token: token,
            },
          },
          {
            new: true,
          }
        )
          .populate("account")
          .populate("multiAccounts")
          .then(async (user) => {
            const { country, state, city } = req.body;
            if (country || state || city) {
              try {
                const contactID = await searchContactByEmail(user.email);
                if (contactID) {
                  await updateContact(contactID, {
                    last_login_location: `${city || ""}${city ? ", " : ""}${
                      state || ""
                    }${state ? ", " : ""}${country || ""}`,
                  });
                }
              } catch (e) {
                console.log(e);
              }
            }

            req.logIn(
              {
                id: user._id,
                master: info,
              },
              (err, u) => {
                if (user.account.plan_id) {
                  res.send({ route: "/templates", error: err });
                } else {
                  res.send({ route: "/plans", error: err });
                }
              }
            );
          })
          .catch((error) => {
            console.log(error);
            res.send({ error: error });
          });
      } catch (error) {
        console.log(error);

        const mongoUser = await User.findOne({
          _id: user._id,
        })
          .populate("account")
          .populate("multiAccounts");
        console.log(mongoUser)

        if (
          error.name === "StatusCodeError" &&
          error.statusCode === 400 &&
          error.error &&
          error.error.error_description === "Invalid grant: invalid user"
        ) {
          try {
            let huddleUserResponse = await AdminHuddle.searchUser(mongoUser);
            console.log("huddleUserResponse", huddleUserResponse);
            if (
              huddleUserResponse.success &&
              huddleUserResponse.data.total > 0
            ) {
              // User with the given email already exists
              let huddleUser = huddleUserResponse.data.items[0];

              // Handle this existing user (e.g., update details, unarchive, etc.)
              let updatedAccountDetails = {
                huddle_email: user.email,
                huddle_user_id: huddleUser.user_id,
                huddle_account_id: huddleUser.account.account_id,
                huddle_account_user_id: huddleUser.account_user_id,
                unarchive_huddle_user: true,
              };

              // This is where you'd handle updating the existing user's data
              await Account.findOneAndUpdate(
                { _id: mongoUser.account._id },
                updatedAccountDetails,
                { new: true }
              );

              req.logIn(
                {
                  id: user._id,
                  master: info,
                },
                (err, u) => {
                  if (mongoUser.account.plan_id) {
                    res.send({ route: "/templates", error: err });
                  } else {
                    res.send({ route: "/plans", error: err });
                  }
                }
              );
            } else {
              let huddle_account = await AdminHuddle.signup(mongoUser);
              let accountDetailsForNewUser = {
                huddle_email: user.email,
                huddle_user_id: huddle_account.user.user_id,
                brands: [huddle_account.brand],
                huddle_account_id: huddle_account.account.account_id,
                huddle_account_user_id: huddle_account.user.account_user_id,
                unarchive_huddle_user: true,
              };

              var account = await Account.findOneAndUpdate(
                { _id: mongoUser.account._id },
                accountDetailsForNewUser,
                { new: true }
              );

              req.session.issueWithHuddleAccount = false;
              mongoUser.account = account;
              await mongoUser.save();

              let token = await Huddle.getToken(mongoUser);
              console.log("token", token)

              await User.findOneAndUpdate(
                { _id: mongoUser._id },
                {
                  $set: {
                    login_date: Date.now(),
                    token: huddle_account.token,
                  },
                },
                { new: true }
              );

              req.logIn(
                {
                  id: user._id,
                  master: info,
                },
                (err, u) => {
                  if (mongoUser.account.plan_id) {
                    return res.send({ route: "/templates", error: err });
                  } else {
                    return res.send({ route: "/plans", error: err });
                  }
                }
              );

              // return res.redirect("/templates?ob=1");
            }
          } catch (e) {
            console.log("failed again to signup", e);
            req.session.issueWithHuddleAccount = true;

            if (
              mongoUser.account.payment_failed ||
              mongoUser.account.plan_canceled ||
              !mongoUser.account.plan_id
            ) {
              req.logIn(
                {
                  id: user._id,
                  master: info,
                },
                (err, u) => {
                  res.send({ route: "/subscribe", error: err });
                }
              );
            } else {
              return res.status(400).json({
                errors: [
                  {
                    param: "login",
                    msg: "Please contact us, there was an issue with your account.",
                  },
                ],
              });
            }
          }
        } else {
          console.log(error);
          return res.status(400).json({
            errors: [
              {
                param: "login",
                msg: JSON.stringify(error),
              },
            ],
          });
        }
      }
    })(req, res, next);
  });

  return router;
};