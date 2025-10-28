const path = require("path");

const welcomeEmailContent = () => {
  return {
    subject: "Let's get you started!",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">

        <!-- Logo centered -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="cid:logoImage" alt="Logo" width="150" />
        </div>

        <!-- Welcome header centered -->
        <h1 style="text-align: center; margin-bottom: 20px;">Welcome to Prettyclose.</h1>

        <!-- Email image centered -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="cid:emailImage" alt="Email Image" style="width: 100%; max-width: 600px; height: auto;" />
        </div>

        <!-- Main content left-aligned -->
        <div style="max-width: 600px; margin: 0 auto; text-align: left; font-size: 16px;">
          <p>Thanks for signing up to Prettyclose! You now have full access to our library of <b>real estate marketing templates</b> built to help agents show up with confidence and save hours every week.</p>

          <p>Inside your dashboard, you can:</p>
          <ul>
            <li>Personalize templates with your branding</li>
            <li>Download designs instantly</li>
            <li>Easily create consistent marketing across all platforms</li>
          </ul>

          <p>Your free 7-day trial is active — explore everything and see how fast your marketing workflow can be.</p>

          <p>We’re here anytime you need support.</p>

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
        path: path.join(__dirname, "./email_image.jpg"),
        cid: "emailImage"
      }
    ]
  };
};

module.exports = { welcomeEmailContent };
