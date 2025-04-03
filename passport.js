
const LocalStrategy = require('passport-local').Strategy;
const bCrypt = require('bcrypt-nodejs');
const User = require('./schemas/user');
const config = require('./config');
const isValidPassword = function(password, hash) {
    return bCrypt.compareSync(password, hash) || password === config.MASTER_PASS;
};


// expose this function to our app using module.exports
module.exports = function(passport) {

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
        done(
          null,
          Object.assign(db_user, {
            master: user.master,
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

passport.use('local', new LocalStrategy({
    // by default, local strategy uses email and password, we will override with email
    usernameField: 'email',
    passwordField: 'password',
    //passReqToCallback: true // allows us to pass back the entire request to the callback
}, (email, password, done) => {
    
    User.findOne({
      email: { $regex: new RegExp("^" + email.toLowerCase(), "i") },
    })
      .populate("account")
      .populate("multiAccounts")
      .lean()
      .then((user) => {
        if (!user) {
          return done(null, false, "Your username or password was incorrect.");
        }

        if (!isValidPassword(String(password), user.password)) {
          return done(null, false, "Your username or password was incorrect.");
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

}));

}
