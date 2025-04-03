const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const config = require("../config");
const passport = require("passport");

module.exports = () => {
  router.post("/", (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
      }

      return res.json({ success: true, user });
    })(req, res, next);
  });

  return router;
};
