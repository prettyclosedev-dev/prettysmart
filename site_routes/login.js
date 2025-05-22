const express = require("express");
const router = express.Router();
const passport = require("passport");
const Account = require("../schemas/account");
const User = require("../schemas/user");
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

    if(req.user && req.user.account) {
      if (req.user.account.plan_id) {
        res.redirect("/templates");
      } else {
        res.redirect("/plans");
      }
    }
    
    res.render("login", { firebaseConfig: config.firebaseConfig });
  });

  router.get("/:account", async (req, res) => {
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
        User.findOneAndUpdate(
          {
            _id: user._id,
          },
          {
            $set: {
              login_date: Date.now(),
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
        res.send({ route: "/login", error: error });
      }
    } else {
      res.render("404", {});
    }
  });

  router.post("/", (req, res, next) => {

    console.log(req.headers);

    if(req.body.googleuid && req.body.idToken) {
      console.log("google login")
      
      req.session.google = req.body
      req.headers.authorization = `Bearer ${req.body.idToken}`
      
      passport.authenticate("bearer", async (err, user, info) => {
        console.log({ err, user, info })

        if (err) return next(err);

        if (!user) return res.send({ route: "/signup" });

        req.logIn(
          {
            id: user._id,
          },
          (err, u) => {
            if (user.account.plan_id) {
              res.send({ route: "/templates", error: err });
            } else {
              res.send({ route: "/plans", error: err });
            }
          }
        );
      })(req, res, next);
    }
    else {
      passport.authenticate("local", async (err, user, info) => {
        if (err) {
          return next(err);
        }

        console.log({
          err,
          user,
          info,
        })

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
          User.findOneAndUpdate(
            {
              _id: user._id,
            },
            {
              $set: {
                login_date: Date.now(),
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

          return res.status(400).json({
            errors: [
              {
                param: "login",
                msg: JSON.stringify(error),
              },
            ],
          });
        }
      })(req, res, next);
    }
    
  });

  return router;
};