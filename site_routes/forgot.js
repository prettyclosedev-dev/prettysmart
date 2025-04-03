const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const config = require("../config");
const mailchimp = require("@mailchimp/mailchimp_transactional")(config.mandrill.apiKey);

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
      const message = {
        from_email: "hi@prettyclose.co", // Your verified sender
        to: [{ email: req.body.email, type: "to" }],
        subject: "Reset Password", // Optional: You can omit this if your template has a default subject
        global_merge_vars: [
          {
            name: "TOKEN", // Matches *|TOKEN|* in your template
            content: user._id, // Dynamic value to replace
          },
        ],
      };

      try {
        const response = await mailchimp.messages.sendTemplate({
          template_name: "Reset Password", // Your Mailchimp template name
          template_content: [], // Optional: leave empty unless overriding specific content
          message: message,
        });

        console.log("Email sent via Mailchimp:", response);
        res.render("forgot", {
          sent: true,
        });
      } catch (error) {
        console.error("Error sending email via Mailchimp:", error);
        res.render("forgot", {
          sent: false,
        });
      }
    } else {
      res.render("forgot", {
        sent: false,
      });
    }
  });

  return router;
};
