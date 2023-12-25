const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const config = require("../config");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(config.sendgrid.token);

module.exports = () => {
  router.get("/", async (req, res) => {
    res.render("forgot", {
      sent: false,
    });
  });

  router.post("/", async (req, res) => {
    let user = await User.findOne({
      email: req.body.email,
    });

    if (user) {
      const msg = {
        to: req.body.email, // Change to your recipient
        from: "hi@prettysmart.co", // Change to your verified sender
        subject: "Reset Password",
        template_id: "d-135aeb46b34f47548662aed5f7f3c6a3",
        dynamic_template_data: {
          TOKEN: user._id,
        },
      };

      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent");
        })
        .catch((error) => {
          console.error(error);
        });

      res.render("forgot", {
        sent: true,
      });
    } else {
      res.render("forgot", {
        sent: false,
      });
    }
  });

  return router;
};
