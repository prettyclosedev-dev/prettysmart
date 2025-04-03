const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config");
const stripe = require("stripe")(config.stripe.prod.secret);
const { getPricePerProduct, getCurrentInterval } = require("./utils");
const User = require("../schemas/user");
const Account = require("../schemas/account");
const { handleBrandChange } = require("../clyps_brand_update");
const { setupDefaults } = require("./brand");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const OLD_DOMAIN = "https://prettysmart.co";
const NEW_DOMAIN = "https://prettyclose.co";
const ROOT_FILES_PATH = path.join(__dirname, "../files"); // Root directory for files

module.exports = () => {
  router.get("/", async (req, res) => {
    // if (req.query.migrate === "true") {
    //   console.log("Starting migration process...");
    //   await callHandleBrandChangeOnAllUsers();
    //   console.log("Migration completed.");
    // }

    req.session.affiliate = req.query.affiliate;
    const plans = await getPlans();
    let currentInterval = getCurrentInterval(plans, null, req);
    res.render("landing", {
      signup_root: "/landing",
      signup_text: "Signup",
      signup_link: "/signup",
      authenticated: req.isAuthenticated(),
      products: plans,
      interval: currentInterval,
      cache: true,
      filename: "landing",
    });
  });

  router.get("/landing", async (req, res) => {
    req.session.affiliate = req.query.affiliate;
    const plans = await getPlans(req.query.affiliate);
    let currentInterval = getCurrentInterval(plans, null, req);
    res.render("landing", {
      signup_root: "/landing",
      signup_text: "Signup",
      signup_link: "/signup",
      authenticated: req.isAuthenticated(),
      products: plans,
      interval: currentInterval,
      cache: true,
      filename: "landing",
    });
  });

  router.post("/interval/:interval", async (req, res) => {
    const interval = req.params.interval;

    try {
      const plans = await getPlans();
      if (plans && plans.data && plans.data.length) {
        res.render("landing", {
          products: plans,
          interval,
          authenticated: req.isAuthenticated(),
          cache: true,
          filename: "landing",
        });
      } else {
        res.render("landing", {
          products: {},
          authenticated: req.isAuthenticated(),
          error: {
            message: "Failed to get plans.",
          },
          cache: true,
          filename: "landing",
        });
      }
    } catch (error) {
      res.render("landing", {
        products: {},
        authenticated: req.isAuthenticated(),
        interval,
        error,
        cache: true,
        filename: "landing",
      });
    }
  });

  router.post("/landing/interval/:interval", async (req, res) => {
    const interval = req.params.interval;

    try {
      const plans = await getPlans();
      if (plans && plans.data && plans.data.length) {
        res.render("landing", {
          products: plans,
          interval,
          authenticated: req.isAuthenticated(),
          cache: true,
          filename: "landing",
        });
      } else {
        res.render("landing", {
          products: {},
          authenticated: req.isAuthenticated(),
          error: {
            message: "Failed to get plans.",
          },
          cache: true,
          filename: "landing",
        });
      }
    } catch (error) {
      res.render("landing", {
        products: {},
        authenticated: req.isAuthenticated(),
        interval,
        error,
        cache: true,
        filename: "landing",
      });
    }
  });

  return router;
};

async function getPlans() {
  try {
    const plans = await stripe.plans.list({ active: true, limit: 40 });
    const products = await stripe.products.list({ active: true });

    const indexOfBasic = products.data
      .map((prod) => prod.name)
      .indexOf("Basic");
    if (indexOfBasic > -1) {
      products.data.splice(indexOfBasic, 1);
    }

    const indexOfBrandHelpProd = products.data
      .map((prod) => prod.id)
      .indexOf("prod_LFnXWepOlSCWVD");
    if (indexOfBrandHelpProd > -1) {
      products.data.splice(indexOfBrandHelpProd, 1);
    }

    const indexOfFree = products.data.map((p) => p.name).indexOf("Free");
    if (indexOfFree > -1) {
      products.data.splice(indexOfFree, 1);
    }

    const indexOfStarter = products.data.map((p) => p.name).indexOf("Starter");
    if (indexOfStarter > -1) {
      products.data.splice(indexOfStarter, 1);
    }

    const indexOfUnlimited = products.data
      .map((p) => p.name)
      .indexOf("Unlimited");
    if (indexOfUnlimited > -1) {
      products.data.splice(indexOfUnlimited, 1);
    }

    const indexOfPro = products.data.map((p) => p.name).indexOf("Pro");
    if (indexOfPro > -1) {
      products.data.splice(indexOfPro, 1);
    }

    const indexOfBusiness = products.data
      .map((p) => p.name)
      .indexOf("Business");
    if (indexOfBusiness > -1) {
      products.data.splice(indexOfBusiness, 1);
    }

    const indexOfAgency = products.data.map((p) => p.name).indexOf("Agency");
    if (indexOfAgency > -1) {
      products.data.splice(indexOfAgency, 1);
    }

    if (products && products.data) {
      products.data.map((product) => {
        product.prices = {
          year: getPricePerProduct(product.id, plans, "year"),
          month: getPricePerProduct(product.id, plans, "month"),
        };

        if (product.name === "Team") {
          product.prices.month.amount *= 2; // Minimum of 2 agents
          product.prices.year.amount *= 2; // Minimum of 2 agents
        }
      });

      products.data.sort((a, b) => {
        return a.prices.month.amount - b.prices.month.amount;
      });

      return products;
    }
  } catch (error) {}
}

async function downloadFile(url, dest) {
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });
    const writer = fs.createWriteStream(dest);

    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(true));
      writer.on("error", (err) => {
        console.error(`Download error for ${url}:`, err.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
    return false;
  }
}

async function migrateAssets(user) {
  if (!user.account || !user.account.brand || !user.account.brand.logos) return;

  const userId = user.account._id.toString();
  const logosDir = path.join(ROOT_FILES_PATH, userId, "logos");

  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  const assets = ["logo", "icon", "watermark"];
  let updatedFields = {};

  for (const asset of assets) {
    try {
      const filename = user.account.brand.logos[asset];

      if (!filename || filename.trim() === "") {
        console.warn(
          `Skipping ${asset} for user ${userId} due to missing filename.`
        );
        continue;
      }

      const oldUrl = `${OLD_DOMAIN}/files/${user.account._id}/logos/${filename}`;
      const localPath = path.join(logosDir, filename);

      console.log(`Downloading: ${oldUrl}`);
      const downloadSuccess = await downloadFile(oldUrl, localPath);

      if (!downloadSuccess) {
        console.warn(
          `Skipping update for ${asset} (not found) for User ${userId}`
        );
        continue;
      }

      updatedFields[`brand.logos.${asset}`] = filename;

      console.log(
        `Migrated: ${oldUrl} -> ${NEW_DOMAIN}/files/${userId}/logos/${filename}`
      );
    } catch (error) {
      console.error(
        `Failed to process asset '${asset}' for User ${userId}:`,
        error
      );
    }

    if (Object.keys(updatedFields).length > 0) {
      await Account.updateOne(
        { _id: user.account._id },
        { $set: updatedFields }
      );
    }
  }
}

async function callHandleBrandChangeOnAllUsers() {
  try {
    const allowedEmails = [
      "nd@kfum-kfuk.dk",
      "office@speedycleaningny.com",
      "yanky@ashpamgt.com",
      "glendakozlowski@me.com",
      "pinchoskaufman@gmail.com",
      "info@kylanthomson.dev",
      "ryan.jamestop2005@gmail.com",
      "sol@myitcrewny.com",
      "Info@grandflooringus.com",
      "mosheburk@gmail.com",
      "info@wallworksus.com",
      "Hershi@excelaaba.com",
      "cstendig@iconictitleagency.com",
      "yidi@metrodoorsny.com",
      "wes@wesleyharrison.com",
      "chezkyw@gmail.com",
      "Refreshfruits1@gmail.com",
      "fishel@bookitsmartly.com",
      "sales@punchlistusa.info",
      "joel@powershinelighting.com",
      "crm@bloomingrealty.com",
      "Herman@AtlanticStoneUSA.com",
      "Info@grandflooringus.com",
      "Yossi@strategicnj.com",
      "Eli@lightbridgetitle.com",
      "martin.perzul@googlemail.com",
      "yitzy@freightersco.com",
      "mendyrotenberg2@gmail.com",
      "joel@prestigert.com",
      "eli@whiteaidmedical.com",
      "elyemoskowits@gmail.com",
      "Nathan@boundlogistics.com",
      "David@cobblestonenj.com",
      "bfried@realdealcapital.com",
      "mutty@envisionoptical.com",
    ].map((email) => email.toLowerCase());
    const users = await User.find({ email: { $in: allowedEmails } })
      .populate("account")
      .populate("multiAccounts");

    console.log(`Found ${users.length} matching users. Starting updates...`);

    for (const user of users) {
      try {
        if (!user.account) {
          console.warn(`User ${user.email} has no account. Skipping.`);
          continue;
        }
        await setupDefaults({ user });
        await handleBrandChange(user);
        await migrateAssets(user);
        console.log(`Processed User ${user.email}`);
      } catch (error) {
        console.error(`Error processing User ${user.email}:`, error);
      }
    }

    console.log("All matching users processed.");
  } catch (err) {
    console.error("Error fetching users:", err);
  }
}
