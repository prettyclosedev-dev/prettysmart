const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config.json");
const Account = require("../schemas/account");
const User = require("../schemas/user");
const { body, validationResult } = require("express-validator");
const openAi = require("../openAi");
const { firebaseConfig } = require('../firebase')

module.exports = () => {
  router.get("/", async (req, res) => {
    res.render("signup", { firebaseConfig, googleInfo: req.session.google });
  });

  router.post(
    "/",
    async(req, res, next) => {
      console.log(req.body)
      next();
    },
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
     body("password")
      // 1) If googleuid exists, treat empty‐string as “optional”
      .if((_, { req }) => !!req.body.googleuid)
        .optional({ nullable: true, checkFalsy: true })
      // 2) If googleuid is _absent_, enforce confirm‐match
      .if((_, { req }) => !req.body.googleuid)
        .custom((value, { req }) => {
          if (!value) {
            throw new Error("Password is required");
          }
          if (value !== req.body.confirm_password) {
            throw new Error("Passwords don't match");
          }

          /*
            at least 1 uppercase character (A-Z)
            at least 1 lowercase character (a-z)
            at least 1 digit (0-9)
            at least 1 special character(punctuation) — do not forget to treat space as special characters too

            10 chars min
          */

          if(value.length < 10)
            throw new Error("Password must be at least be 10 characters.");
          

          if(new RegExp(/[^A-Za-z0-9!@#$%^&*()+=]/).test(value) === true)
            throw new Error("Password contains invalid characters.");

          if(new RegExp(/[^A-Za-z0-9!@#$%^&*()+=]/).test(value) === true)
            throw new Error("Password contains invalid characters.");

          // strong password validation
          const rules = [
            {
              error: "Password must contain at least one uppercase character",
              regex: /[A-Z]{1}/,
            },
            {
              error: "Password must contain at least one lowercase character",
              regex: /[a-z]{1}/,
            },
            {
              error: "Password must contain at least one digit",
              regex: /[0-9]{1}/,
            },
            {
              error: "Password must contain at least one special character",
              regex: /[!@#$%^&*()+=]{1}/,
            },
          ];

          rules.forEach((rule) => {
            if(new RegExp(rule.regex).test(value) === false)
              throw new Error(rule.error);
          })

          return true;
      }),
    async (req, res, next) => {
      const errors = validationResult(req);
      console.log("errors", errors)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let data = req.body;
      let new_user = new User(data);
      console.log("new_user", new_user)
      let new_account = new Account({
        name: data.company,
        industry_description: data.industry_description,
        isDraft: true,
      });
      new_user.account = new_account;

      try {
        new_account
          .save()
          .then(async (account) => {
            new_user.account = account;
            new_user.role = "owner";
            new_user.login_date = Date.now();

            new_user
              .save()
              .then(async (user) => {
                let tagline = null;
                let aiFields = null;

                // Handle OpenAI errors or null responses
                // try {
                //   tagline = await openAi.getTagline(account.industry_description);
                // } catch (error) {
                //   console.log("OpenAI getTagline failed:", error);
                // }

                // try {
                //   aiFields = await openAi.getAIFields(account.industry_description);
                // } catch (error) {
                //   console.log("OpenAI getAIFields failed:", error);
                // }

                Account.findOneAndUpdate(
                  {
                    _id: account._id,
                  },
                  {
                    $set: {
                      AI: aiFields || {}, // Fallback to an empty object if aiFields is null
                      tagline: data.tagline
                        ? data.tagline
                        : tagline
                        ? tagline.slogan
                        : "",
                      industry: tagline ? tagline.industry : "",
                      what_we_are: tagline ? tagline.whatWeAre : "",
                    },
                  },
                  {
                    new: true,
                  }
                )
                  .then((updatedAccount) => {
                    // Account updated successfully, proceed with login
                    req.logIn(user._id, (err, u) => {
                      if (err) {
                        console.log("Login error:", err);
                        return res.status(500).send({ error: "Login failed" });
                      }
                      res.send({ route: "subscribe", error: null });
                    });
                  })
                  .catch((err) => {
                    console.log("Error updating account:", err);
                    return res
                      .status(500)
                      .send({ error: "Account update failed" });
                  });
              })
              .catch((err) => {
                next(err);
              });
          })
          .catch((err) => {
            next(err);
          });
      } catch (error) {
        console.log("Error processing signup:", error);
        res.status(400).send(error);
      }
    }
  );

  return router;
};
