const path = require("path");

const signupEmailContent = () => {
  return {
    subject: "One more step to unlock your marketing toolkit!",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">

        <!-- Logo centered -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="cid:logoImage" alt="Logo" width="150" />
        </div>

        <!-- Welcome header centered -->
        <h1 style="text-align: center; margin-bottom: 20px;">Unlimited posting is just a click away.</h1>

        <!-- Email image centered -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="cid:emailImage" alt="Email Image" style="width: 100%; max-width: 600px; height: auto;" />
        </div>

        <!-- Main content left-aligned -->
        <div style="max-width: 600px; margin: 0 auto; text-align: left; font-size: 16px;">
          <p>Great news, your Prettyclose account is set up and ready!</p>
          <p>You’re just one quick step away from unlocking <b>full access</b> to our real estate marketing templates.</p>

          <p>Add your card today to:</p>
          <ul>
            <li>Start your 7-day free trial</li>
            <li>Download any template instantly</li>
            <li>Brand your marketing in minutes</li>
            <li>Save hours on design every week</li>
          </ul>

          <p>No commitment. No hassle. Cancel anytime.</p>

          <p>We simply want you to <b>experience how easy marketing can be.</b></p>

          <p>Best regards,<br/>
          The Prettyclose Team</p>
        </div>

      </div>
    `,
    attachments: [
      {
        filename: "logo.png",
        path: path.join(__dirname, "./prettyclose_logo.png"),
        cid: "logoImage"
      },
      {
        filename: "email_image.jpg",
        path: path.join(__dirname, "./signup_email_image.png"),
        cid: "emailImage"
      }
    ]
  };
};

module.exports = { signupEmailContent };
