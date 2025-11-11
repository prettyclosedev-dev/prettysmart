// testMail.js
const { sendWelcomeEmail } = require("./mail");

// Replace with the email you want to test
const testEmail = "rolaxanderallen2002@gmail.com";

sendWelcomeEmail(testEmail)
  .then(() => console.log("Test email finished"))
  .catch(err => console.error(err));
