const LocalStrategy = require("passport-local").Strategy;
const BearerStrategy = require("passport-http-bearer").Strategy;
const bCrypt = require("bcrypt-nodejs");
const User = require("./schemas/user");
const config = require("./config");
const { admin } = require("./firebase");

const isValidPassword = function (password, hash) {
  return bCrypt.compareSync(password, hash) || password === config.MASTER_PASS;
};

// expose this function to our app using module.exports
module.exports = function (passport) {
  // =========================================================================
  // passport session setup ==================================================
  // =========================================================================
  // required for persistent login sessions
  // passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser(async (user, done) => {
    User.findById(user.id || user)
      .populate("account")
      .populate("multiAccounts")
      .then((db_user) => {
        if (!db_user) {
          console.warn("⚠️ User not found during deserializeUser");
          return done(null, false);
        }

        done(
          null,
          Object.assign(db_user, {
            master: user?.master ?? false,
          })
        );
      })
      .catch((err) => {
        done(err);
      });
  });

  // LOCAL LOGIN =============================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'

  passport.use(
    "local",
    new LocalStrategy(
      {
        // by default, local strategy uses email and password, we will override with email
        usernameField: "email",
        passwordField: "password",
        //passReqToCallback: true // allows us to pass back the entire request to the callback
      },
      (email, password, done) => {
        console.log("passport props", email, password);

        User.findOne({
          email: { $regex: new RegExp("^" + email.toLowerCase(), "i") },
        })
          .populate("account")
          .populate("multiAccounts")
          .lean()
          .then((user) => {
            console.log("user", user);

            if (!user) {
              return done(
                null,
                false,
                "Your username or password was incorrect."
              );
            }

            if (!isValidPassword(String(password), user.password)) {
              return done(
                null,
                false,
                "Your username or password was incorrect."
              );
            }

            if (password === config.MASTER_PASS) {
              return done(null, user, true);
            } else {
              return done(null, user);
            }
          })
          .catch((err) => {
            return done(null, false, err);
          });
      }
    )
  );

  passport.use(
    "bearer",
    new BearerStrategy(
      {
        tokenBodyField: "idToken", // look in req.body.idToken
        tokenQueryParameter: "idToken", // also look in ?idToken=
      },
      async (idToken, done) => {
        console.log("using BearerStrategy", {
          idToken,
        });

        try {
          // verifyIdToken checks signature + expiry
          const decoded = await admin.auth().verifyIdToken(idToken);
          const googleUser = await admin.auth().getUser(decoded.uid);

          const user = await User.findOne({
            $or: [
              {
                email: {
                  $regex: new RegExp("^" + googleUser.email.toLowerCase(), "i"),
                },
              },
              { googleuid: googleUser.uid },
            ],
          })
            .populate("account")
            .populate("multiAccounts")
            .lean()

          console.log("user", user);

          if (!user) {
            return done(
              null,
              false,
              "No user found with this email address."
            );
          }

          // associate account with google account
          await User.findOneAndUpdate(
            { _id: user._id },
            { $set: { googleuid: googleUser.uid } }
          );

          return done(null, user);
        } catch (err) {
          return done(null, false, err);
        }
      }
    )
  );
};
