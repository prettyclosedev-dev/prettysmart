const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config.json");
const Account = require("../schemas/account");
const User = require("../schemas/user");
const Huddle = require("../huddle");
const AdminHuddle = require("../admin_huddle");
const { body, validationResult } = require("express-validator");
const openAi = require("../openAi");
const { searchContactByEmail, updateContact } = require("../hubspot");

// User.find({}).then(users => {
//     users.forEach(async user => {
//         // let account = new Account({
//         //     name : user.company ? user.company : (user.email + ' - C'),
//         //     brands : user.brands,
//         //     industry : user.industry,
//         //     huddle_account_id : user.account_id,
//         //     huddle_user_id : user.user_id,
//         //     huddle_account_user_id : user.account_user_id,
//         //     plan_id : user.plan_id,
//         //     stripe_customer_id : user.stripe_customer_id,
//         //     stripe_session_id : user.stripe_session_id
//         // });
//         // let savedAcount = await account.save();
//         let updateAccount = await Account.findOneAndUpdate({
//             _id : user.account
//         }, {
//             $set : {
//                 huddle_email : user.email
//             }
//         }, {
//             new : true
//         });
//         console.log('==============')
//         // console.log(savedAcount)
//         console.log(updateAccount)
//         console.log('==============')
//     })
// })

// Account.remove({}).then(accounts => {
//     console.log(accounts)
// })

module.exports = () => {
  router.get("/", async (req, res) => {
    res.render("signup", {});
  });

  router.post(
    "/",
    /* body('company').exists().custom(value => {
        return Account.findOne({
            name : value
        }).then(user => {
            if (user) {
                return Promise.reject('Company already in use');
            }
        });
    }),*/ body("email")
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
    body("password").custom((value, { req, loc, path }) => {
      if (value !== req.body.confirm_password) {
        throw new Error("Passwords don't match");
      } else {
        return value;
      }
    }),
    async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let data = req.body;
      // let huddle_account = config.huddle_account;
      let new_user = new User(data);
      let new_account = new Account({
        name: data.company,
        industry_description: data.industry_description,
        isDraft: true,
      });
      new_user.account = new_account;

      try {
        let huddle_account = await AdminHuddle.signup(new_user, true);

        new_account.huddle_email = data.email;
        new_account.huddle_account_id = huddle_account.account.account_id;
        new_account.huddle_user_id = huddle_account.user.user_id;
        new_account.huddle_account_user_id =
          huddle_account.user.account_user_id;
        new_account.brands = [huddle_account.brand];

        new_account
          .save()
          .then(async (account) => {
            new_user.account = account;
            let token = await Huddle.getToken(new_user);
            new_user.role = "owner";
            new_user.login_date = Date.now();
            new_user.token = token;

            new_user
              .save()
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
                  } catch (e) {}
                }

                req.logIn(user._id, (err, u) => {
                  res.send({ route: "subscribe", error: err }); // req.session.affiliate ? "go-pro" : "setup"
                });

                let tagline = await openAi.getTagline(
                  account.industry_description
                );
                let aiFields = await openAi.getAIFields(
                  account.industry_description
                );

                // console.log(account._id)
                // console.log(tagline)
                // console.log(aiFields)

                Account.findOneAndUpdate(
                  {
                    _id: account._id,
                  },
                  {
                    $set: {
                      AI: aiFields || {},
                      tagline: data.tagline ? data.tagline : tagline.slogan,
                      industry: tagline.industry,
                      what_we_are: tagline.whatWeAre,
                      // plan_id: config.stripe.plans.free.month,
                    },
                  },
                  {
                    new: true,
                  }
                )
                  .then((account) => {
                    //console.log(account)
                  })
                  .catch((err) => {
                    console.log(err);
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
        console.log(error);
        res.status(400).send(error);
      }
    }
  );

  return router;
};
