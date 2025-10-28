const nodemailer = require("nodemailer");
const config = require("../config.json");
const { welcomeEmailContent } = require("./assets/welcomeEmailContent");

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: false, // false for port 587
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS
  }
});

const sendWelcomeEmail = async (to, firstName) => {
  const content = welcomeEmailContent(firstName);

  const mailOptions = {
    from: `"PrettySmart" <${config.SMTP_USER}>`,
    to,
    subject: content.subject,
    html: content.html,
    attachments: content.attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
  } catch (err) {
    console.error("Error sending welcome email:", err);
  }
};

module.exports = { sendWelcomeEmail };
