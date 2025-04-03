const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const { body, validationResult } = require("express-validator");

module.exports = () => {
  router.get("/:token", async (req, res) => {
    res.render("reset", {
      token: req.params.token,
    });
  });

  router.post(
    "/:token",
    body("password")
      .exists()
      .custom((value, { req, loc, path }) => {
        if (value !== req.body.confirm_password) {
          throw new Error("Passwords don't match");
        } else {
          return value;
        }
      }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.send({
          success: false,
          errors: errors.errors,
        });
        return;
      }

      let user = await User.findOne({
        _id: req.params.token,
      });

      if (user) {
        User.findOneAndUpdate(
          {
            _id: user._id,
          },
          {
            $set: {
              password: req.body.password,
            },
          },
          {
            new: true,
          }
        ).then(() => {
          res.send({ success: true, href: "/login" });
        });
      } else {
        res.send({
          success: false,
          error: { message: "User not found!" },
        });
      }
    }
  );

  return router;
};
