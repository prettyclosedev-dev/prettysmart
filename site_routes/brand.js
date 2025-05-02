const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const User = require("../schemas/user");
const Account = require("../schemas/account");
const fs = require("fs");
const rp = require("request-promise");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const TextToSVG = require("text-to-svg");
const vectorExpress = require("@smidyo/vectorexpress-nodejs");
const path = require("path");
const openAi = require("../openAi");
const _ = require("lodash");
const { handleBrandChange } = require("../clyps_brand_update");
const stripe = require("stripe")(config.stripe.prod.secret);
const mailchimp = require("@mailchimp/mailchimp_transactional")(
  config.mandrill.apiKey
);

var attributes = {
  fill: "#1A428A",
};

var logo_options = {
  x: 120,
  y: 0,
  fontSize: 70,
  anchor: "top",
  letterSpacing: "-0.03",
  attributes: attributes,
};

var wordmark_options = {
  x: 0,
  y: 0,
  fontSize: 70,
  anchor: "top",
  letterSpacing: "-0.03",
  attributes: attributes,
};

async function setupDefaults(req) {
  let user_path = path.join(__dirname, "../files/" + req.user.account._id);

  if (!fs.existsSync(user_path)) {
    fs.mkdirSync(user_path, { recursive: true });
  }

  await setDefaultInformation(req);
  // await setupDefaultColors(req);
  await setDefaultFonts(req, user_path);
  // await setDefaultAssets(req, user_path);
}

async function setDefaultInformation(req) {
  const user = await User.findById(req.user._id);

  if (!user) {
    return;
  }

  const account = await Account.findById(req.user.account._id);

  if (!account) {
    return;
  }

  if (!account.brand_email) {
    account.brand_email = user.email || "";
  }

  if (!account.brand_phone) {
    account.brand_phone = user.phone || "";
  }

  await account.save();
}

async function setDefaultAssets(req, user_path) {
  let user_logo_path = user_path + "/logos";

  if (!fs.existsSync(user_logo_path)) {
    fs.mkdirSync(user_logo_path, { recursive: true });
  }

  let logos = fs.readdirSync(user_logo_path);

  let logo = logos.find((file) => {
    return file.toLowerCase().indexOf("logo") > -1 && file.endsWith("svg");
  });
  let wordmark = logos.find((file) => {
    return (
      (file.toLowerCase().indexOf("wordmark") > -1 ||
        file.toLowerCase().indexOf("watermark") > -1) &&
      file.endsWith("svg")
    );
  });
  let icon = logos.find((file) => {
    return file.toLowerCase().indexOf("icon") > -1 && file.endsWith("svg");
  });

  if (!logo || !wordmark || !icon) {
    await loadAssets(req, user_logo_path, !logo, !wordmark, !icon);
  }
}

async function loadAssets(
  req,
  user_logo_path,
  setLogo,
  setWordmark,
  setIcon
  // callback = () => {}
) {
  return new Promise((resolve, reject) => {
    let name = req.user.account.name;
    let fontPath = req.user.account.brand.fonts.Bold.path;
    let primaryFill = req.user.account.brand.colors.primary || "#1A428A";
    let secondaryFill = req.user.account.brand.colors.secondary || "#D5BA8C";

    let full_font_path = path.join(__dirname, "../files/" + fontPath);

    if (!fs.existsSync(full_font_path)) {
      full_font_path = path.join(
        __dirname,
        "../google-fonts/poppins/Poppins-SemiBold.ttf"
      );
    }

    TextToSVG.load(full_font_path, async (err, textToSVG) => {
      if (err) {
        console.log(err);
        // callback(false);
        reject(false);
        return;
      }

      if (setLogo) {
        logo_options.attributes.fill = primaryFill;

        const logo_metrics = textToSVG.getMetrics(name, logo_options);
        const logo_path = textToSVG.getPath(name, logo_options);
        const logo = loadSVG(logo_metrics, logo_path, secondaryFill);
        fs.writeFileSync(user_logo_path + "/logo.svg", logo);

        await Account.findOneAndUpdate(
          {
            _id: req.user.account._id,
          },
          {
            $set: {
              "brand.logos.logo": "logo.svg",
            },
          },
          {
            new: true,
          }
        );
      }

      if (setWordmark) {
        wordmark_options.attributes.fill = primaryFill;

        const wordmark_metrics = textToSVG.getMetrics(name, wordmark_options);
        const wordmark_path = textToSVG.getPath(name, wordmark_options);
        const wordmark = loadWordmark(wordmark_metrics, wordmark_path);

        fs.writeFileSync(user_logo_path + "/watermark.svg", wordmark);

        await Account.findOneAndUpdate(
          {
            _id: req.user.account._id,
          },
          {
            $set: {
              "brand.logos.watermark": "watermark.svg",
            },
          },
          {
            new: true,
          }
        );
      }

      if (setIcon) {
        const icon = loadIcon(secondaryFill);
        fs.writeFileSync(user_logo_path + "/icon.svg", icon);
        await Account.findOneAndUpdate(
          {
            _id: req.user.account._id,
          },
          {
            $set: {
              "brand.logos.icon": "icon.svg",
            },
          },
          {
            new: true,
          }
        );
      }

      // callback(true);
      resolve(true);
    });
  });
}

function loadSVG(logo_metrics, logo_path, fill = "#D5BA8C") {
  const logo = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${
        logo_metrics.width + 121.63499999999999
      } ${logo_metrics.height + 10.049999999999983}">
          <g>
              <path id="brand_icon" fill="${fill}" d="M39.5 31.2l10.1 10.1.1.1.1.1c1.1 1.1 2.5 1.7 4 1.7H54.1c1.5 0 3-.6 4.1-1.7L89.7 10c2.3-2.3 2.3-6 0-8.3-2.3-2.3-6-2.3-8.3 0L58.1 25l-4.2 4.2-12.4-12.5c-2.3-2.3-6-2.3-8.3 0-2.3 2.3-2.3 6 0 8.3l6.3 6.2zM106.3 81.4L83 58.1l-4.2-4.2 12.5-12.5c2.3-2.3 2.3-6 0-8.3-2.3-2.3-6-2.3-8.3 0l-6.3 6.3S66.3 49.7 66.3 49.8c-1.1 1.1-1.7 2.5-1.7 4V54.1c0 1.5.6 3 1.7 4.1L98 89.7c2.3 2.3 6 2.3 8.3 0 2.3-2.3 2.3-6 0-8.3zM68.5 76.8L58.2 66.5c-1.1-1.1-2.5-1.7-4-1.7H54h-.1c-1.5 0-3 .6-4.1 1.7L18.3 98c-2.3 2.3-2.3 6 0 8.3 2.3 2.3 6 2.3 8.3 0L49.9 83l4.2-4.2 12.5 12.5c2.3 2.3 6 2.3 8.3 0 2.3-2.3 2.3-6 0-8.3l-6.4-6.2zM16.7 74.8c2.3 2.3 6 2.3 8.3 0l6.3-6.3s10.3-10.4 10.4-10.4c1.1-1.1 1.7-2.5 1.7-4v-.2-.1c0-1.5-.6-3-1.7-4.1L10 18.3c-2.3-2.3-6-2.3-8.3 0-2.3 2.3-2.3 6 0 8.3L25 49.9l4.2 4.2-12.5 12.4c-2.3 2.3-2.3 6 0 8.3z"></path>
              <g id="brand_name">
                  ${logo_path}
              </g>
          </g>
      </svg>
  `;
  return logo;
}

function loadWordmark(wordmark_metrics, wordmark_path) {
  const wordmark = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${wordmark_metrics.width}" height="${wordmark_metrics.height}" viewBox="0 0 ${wordmark_metrics.width} ${wordmark_metrics.height}">
          ${wordmark_path}
      </svg>
  `;
  return wordmark;
}

function loadIcon(fill = "#d5ba8c") {
  const icon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="108.05" height="108.05" viewBox="0 0 108.05 108.05">
          <path id="brand_icon" fill="${fill}" d="M39.5,31.2,49.6,41.3l.1.1.1.1a5.606,5.606,0,0,0,4,1.7h.3a5.835,5.835,0,0,0,4.1-1.7L89.7,10a5.869,5.869,0,0,0-8.3-8.3L58.1,25l-4.2,4.2L41.5,16.7A5.869,5.869,0,0,0,33.2,25Zm66.8,50.2L83,58.1l-4.2-4.2L91.3,41.4A5.869,5.869,0,0,0,83,33.1l-6.3,6.3S66.3,49.7,66.3,49.8a5.606,5.606,0,0,0-1.7,4v.3a5.835,5.835,0,0,0,1.7,4.1L98,89.7a5.869,5.869,0,1,0,8.3-8.3ZM68.5,76.8,58.2,66.5a5.606,5.606,0,0,0-4-1.7h-.3a5.835,5.835,0,0,0-4.1,1.7L18.3,98a5.869,5.869,0,1,0,8.3,8.3L49.9,83l4.2-4.2L66.6,91.3A5.869,5.869,0,0,0,74.9,83l-6.4-6.2Zm-51.8-2a5.855,5.855,0,0,0,8.3,0l6.3-6.3S41.6,58.1,41.7,58.1a5.606,5.606,0,0,0,1.7-4v-.3a5.835,5.835,0,0,0-1.7-4.1L10,18.3a5.869,5.869,0,0,0-8.3,8.3L25,49.9l4.2,4.2L16.7,66.5A5.855,5.855,0,0,0,16.7,74.8Z" transform="translate(0.025 0.025)" />
      </svg>
  `;
  return icon;
}

async function setDefaultFonts(req, user_path) {
  let font_path = user_path + "/fonts";

  if (!fs.existsSync(font_path)) {
    fs.mkdirSync(font_path, { recursive: true });
  }

  let fonts = fs.readdirSync(font_path);

  if (!fs.existsSync(path.join(font_path, "/poppins/"))) {
    fs.mkdirSync(path.join(font_path, "/poppins/"), { recursive: true });
  }

  const defaultFonts = [
    "Poppins-Regular",
    "Poppins-Italic",
    "Poppins-Bold",
    "Poppins-BoldItalic",
  ];

  defaultFonts.map((font) => {
    const source = path.join(
      __dirname,
      "../google-fonts/poppins/" + font + ".ttf"
    );
    
    const destination = path.join(font_path, "/poppins/", font + ".ttf");

    console.log({
      source,
      destination,
    });

    copyFile(source, destination);
  });

  await syncFontsWithAccount(req, ["poppins"]);

  let account = req.user.account;
  let hasFonts = Object.keys(account.brand.fonts).filter((key) => {
    return account.brand.fonts[key].name;
  });

  if (hasFonts.length === 0 && fonts.length) {
    await syncFontsWithAccount(req, fonts);
  }
}

async function setupDefaultColors(req) {
  if (!req.user.account.brand.colors) {
    await Account.findOneAndUpdate(
      {
        _id: req.user.account._id,
      },
      {
        $set: {
          "brand.colors.primary": "#1A428A",
          "brand.colors.secondary": "#D5BA8C",
        },
      },
      {
        new: true,
      }
    );
  }
}

function copyFile(from, to) {
  fs.copyFile(from, to, (err) => {
    if (err) throw err;
  });
}

async function uploadFontToHuddle({
  name,
  upload_path,
  brand_id,
  font_family_name,
  font_file_name,
}) {}

async function syncFontsWithAccount(req, fontFamilies) {
  let user_path = path.join(__dirname, "../files/" + req.user.account._id);
  let fonts = fs.readdirSync(user_path + "/fonts/" + fontFamilies[0]);

  console.log("fonts", fonts);

  let fontObj = {};

  fonts.map((font) => {
    // Poppins-Regular.ttf
    let family = font.split("-")[0]; // Poppins
    let fontType = font.split("-")[1].split(".")[0]; //Regular
    let fileType = font.split(".")[1]; // ttf

    fontObj["brand.fonts." + fontType] = {
      name: family,
      value: font.split(".")[0],
      path: fontFamilies[0] + "/" + font,
      google: true,
    };
  });

  await Account.findOneAndUpdate(
    {
      _id: req.user.account._id,
    },
    {
      $set: fontObj,
    },
    {
      new: true,
    }
  );
}

module.exports = () => {
  router.get("/", async (req, res) => {
    await setupDefaults(req);

    try {
      await handleBrandChange(req.user);
    } catch (e) {
      console.log(e);
    }

    let paymentMethods = [];
    let paymentMethodsList = {};

    if (req.user.account.stripe_session_id) {
      try {
        const checkoutsession = await stripe.checkout.sessions.retrieve(
          req.user.account.stripe_session_id
        );

        const customer = await stripe.customers.retrieve(
          checkoutsession.customer
        );

        paymentMethodsList = await stripe.paymentMethods.list({
          customer: checkoutsession.customer,
          type: "card",
        });
      } catch (e) {
        console.log(e);
      }

      paymentMethods = paymentMethodsList.data || [];
    }

    res.render("brand", {
      templates: [],
      brand: {
        ...(await Huddle.getBrandObject(req.user.account).catch(console.log)),
        brand_phone: "1",
      },
      paymentMethods,
      stripe_pub_key: config.stripe.prod.pub,
      cache: true,
      filename: "brand",
    });
  });

  router.get("/build", async (req, res) => {
    console.log("building brand...");
    try {
      await setupDefaults(req);
      await handleBrandChange(req.user);
    } catch (e) {
      console.log(e);
    }
    finally {
      let url = req.query.url;
      res.redirect(url || "/templates");
    }
  });

  router.post("/mix-colors", async function (req, res) {
    try {
      let success = await rp({
        method: "post",
        url: "https://api.huemint.com/color",
        body: {
          mode: "transformer", // transformer, diffusion or random
          num_colors: 2, // max 12, min 2
          temperature: "1.2", // max 2.4, min 0
          num_results: 50, // max 50 for transformer, 5 for diffusion
          adjacency: ["40", "60", "60", "40"], // nxn adjacency matrix as a flat array of strings
          palette: [
            req.user.account.brand.colors.primaryLocked
              ? req.user.account.brand.colors.primary
              : "-",
            req.user.account.brand.colors.secondaryLocked
              ? req.user.account.brand.colors.secondary
              : "-",
          ],
        },
        json: true,
      });

      if (success && success.results && success.results) {
        var resPallete = success.results[success.results.length - 1];
        if (resPallete && resPallete.palette && resPallete.palette.length > 1) {
          await Account.findOneAndUpdate(
            {
              _id: req.user.account._id,
            },
            {
              $set: {
                "brand.colors.primary": resPallete.palette[0],
                "brand.colors.secondary": resPallete.palette[1],
              },
            },
            {
              new: true,
            }
          );
        }
      }

      res.send(success);
    } catch (e) {
      res.status(400).send(e);
    }
  });

  router.post("/lock-color/:name/:lock", async function (req, res) {
    try {
      let updateObj = {};
      updateObj[`brand.colors.${req.params.name}Locked`] = req.params.lock;

      await Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: updateObj,
        },
        {
          new: true,
        }
      );

      res.send({ success: true, locked: req.params.lock });
    } catch (e) {
      res.status(400).send({ success: false, error: e });
    }
  });

  router.post("/add-card", async (req, res, next) => {
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(
        req.user.account.stripe_session_id
      );
      const paymentMethod = await stripe.paymentMethods.attach(req.body.token, {
        customer: checkoutSession.customer,
      });
      res.json({ success: true, message: "Card added successfully!" });
    } catch (error) {
      res.json({ success: false, message: error });
    }
  });

  router.post("/logo", async (req, res) => {
    let fileName = req.files[req.body.name].name;
    let fileExt = fileName.split(".").pop();
    let logo_path = path.join(__dirname, "../files/" + req.user.account._id);

    if (!fs.existsSync(logo_path)) {
      fs.mkdirSync(logo_path);
    }

    logo_path += "/logos";

    if (!fs.existsSync(logo_path)) {
      fs.mkdirSync(logo_path);
    }

    let upload_path = logo_path + "/" + fileName;

    req.files[req.body.name].mv(upload_path, async (err) => {
      if (fileExt !== "svg") {
        try {
          const file = fs.readFileSync(upload_path);
          const newPath = upload_path.replace(fileExt, "svg");
          const svg = await vectorExpress.convert(fileExt, "svg", {
            file: file,
            save: true,
            path: newPath,
            transformers : ['auto']
          });

          fileName = fileName.replace("." + fileExt, ".svg");
          fileExt = "svg";
        } catch (e) {
          console.log("convert failed");
          // console.log(e);
          res.send({ error: e, success: false });
          return;
        }
      }

      var cleanFile = fs.readFileSync(upload_path);
      cleanFile = cleanFile.toString();

      if (!cleanFile.includes("path") || cleanFile.includes("image")) {
        let exText = "";
        if (!cleanFile.includes("path")) {
          exText = "No path attributes found.";
        } else if (cleanFile.includes("image")) {
          exText = "Image based svg's are not allowed.";
        }
        // check if is true svg
        return res.send({
          success: false,
          error:
            "Wrong file format, incorrect svg!" + exText ? " " + exText : "",
        });
      }

      cleanFile = await Huddle.getOptimizedSVG(
        cleanFile,
        req.user.account.brand
      );
      fs.writeFileSync(upload_path, cleanFile);

      if (req.query.draft) {
        let account = req.user.account;
        account.brand.logos[`${req.body.name}`] = fileName;

        const brand = await Huddle.getBrandObject(account);

        let publicUrl =
          serverUrl + "/files/" + req.user.account._id + "/logos/" + fileName;

        // try {
        //   const contactID = await searchContactByEmail(req.user.email);
        //   if (contactID) {
        //     await updateBrandLogo(contactID, publicUrl);
        //   }
        // } catch(e) {
        //   console.log(e)
        // }

        return res.send({
          success: true,
          brand,
        });
      } else {
        let updateObj = {};
        updateObj[`brand.logos.${req.body.name}`] = fileName;

        Account.findOneAndUpdate(
          {
            _id: req.user.account._id,
          },
          {
            $set: updateObj,
          },
          {
            new: true,
          }
        )
          .then(async (account) => {
            res.send({
              success: true,
              brand: await Huddle.getBrandObject(account),
            });
          })
          .catch((error) => {
            res.send({ error, success: false });
          });
      }

      if (err) {
        res.send({ error: err, success: false });
      }
    });
  });

  router.post("/color", async (req, res) => {
    let updateObj = {};
    updateObj[`brand.colors.${req.body.name}`] = req.body.color;

    Account.findOneAndUpdate(
      {
        _id: req.user.account._id,
      },
      {
        $set: updateObj,
      },
      {
        new: true,
      }
    )
      .then(async (account) => {
        req.user.account.brand.colors[req.body.name] = req.body.color;
        account.brand.colors[req.body.name] = req.body.color;

        // const contactID = await searchContactByEmail(req.user.email);
        // if (contactID) {
        //   await updateBrandColor(
        //     contactID,
        //     account.brand.colors.primary,
        //     account.brand.colors.secondary
        //   );
        // }

        res.send({
          success: true,
          brand: await Huddle.getBrandObject(account).catch(console.log),
        });
        // let user_path = path.join(
        //   __dirname,
        //   "../files/" + req.user.account._id
        // );
        // let user_logo_path = user_path + "/logos";
        // loadAssets(req, user_logo_path, true, true, true, async () => {
        //   res.send({
        //     success: true,
        //     brand: await Huddle.getBrandObject(account).catch(console.log),
        //   });
        // });
      })
      .catch((error) => {
        res.send(error);
      });
  });

  router.post("/font", async (req, res) => {
    try {
      let family;
      let name = req.body.name;
      let familyFolder;
      let fontFileName;
      let font_path;
      let folder;
      let value;
      let isGoogle;

      if (req.files && req.files[name]) {
        let fileName = req.files[name].name;
        let fileExt = fileName.split(".").pop();
        fontFileName = fileName;
        font_path = path.join(__dirname, "../files/" + req.user.account._id);
        family = fileName.split(".")[0];
        familyFolder = family;

        if (fileExt !== "ttf") {
          return res.send({
            message: "Invalid font file use ttf",
            success: false,
          });
        }

        if (!fs.existsSync(font_path)) {
          fs.mkdirSync(font_path);
        }

        font_path += "/fonts";

        if (!fs.existsSync(font_path)) {
          fs.mkdirSync(font_path);
        }

        font_path += "/" + family;

        if (!fs.existsSync(font_path)) {
          fs.mkdirSync(font_path);
        }

        let upload_path = font_path + "/" + fileName;
        folder = await new Promise((resolve, reject) => {
          req.files[name].mv(upload_path, () => {
            resolve(upload_path);
          });
        });
      } else {
        family = req.body.family.replace(/ /g, "");
        familyFolder = family.replace(/ /g, "").toLowerCase();
        fontFileName = family + "-" + name + ".ttf";
        font_path = "./google-fonts/" + familyFolder;
        value = req.body.value;
        isGoogle = true;

        let folderExsist = fs.existsSync(font_path);
        if (folderExsist) {
          let fileExsist = fs.existsSync(font_path + "/" + fontFileName);
          if (fileExsist) {
            folder = fs.readdirSync(font_path);
          } else {
            let fontFiles = fs.readdirSync(font_path);
            fontFiles = fontFiles.filter((file) => file.endsWith(".ttf"));
            fontFileName = fontFiles.find((file) => {
              if (req.body.fontStyle === "italic") {
                return file.includes(family) && file.includes("Italic");
              } else {
                return file.includes(family) && !file.includes("Italic");
              }
            });

            if (fontFileName) {
              // console.log(fontFileName);
            } else {
              //fontFileName = family + '-Regular.ttf';
              fontFileName = fontFiles[0];
            }

            fileExsist = fs.existsSync(font_path + "/" + fontFileName);
            if (fileExsist) {
              folder = fs.readdirSync(font_path);
            }
          }
        }
      }

      if (folder) {
        try {
          // need to upload custom fonts to clyps

          // console.log(upload);

          if (req.query.draft) {
            let account = req.user.account;
            account.brand.fonts[`${req.body.name}`] = {
              name: family,
              value: value,
              path: familyFolder + "/" + fontFileName,
              google: isGoogle,
            };

            return res.send({
              success: true,
              brand: await Huddle.getBrandObject(account).catch(console.log),
            });
          } else {
            let updateObj = {};
            updateObj[`brand.fonts.${req.body.name}`] = {
              name: family,
              value: value,
              path: familyFolder + "/" + fontFileName,
              google: isGoogle,
            };
            Account.findOneAndUpdate(
              {
                _id: req.user.account._id,
              },
              {
                $set: updateObj,
              },
              {
                new: true,
              }
            ).then(async (account) => {
              let publicUrl;

              if (isGoogle) {
                publicUrl = value;
              } else {
                publicUrl =
                  serverUrl +
                  "/files/" +
                  req.user.account._id +
                  "/fonts/" +
                  familyFolder +
                  "/" +
                  fontFileName;
              }

              // const contactID = await searchContactByEmail(req.user.email);
              // if (contactID) {
              //   await updateBrandFont(contactID, publicUrl);
              // }

              res.send({
                success: true,
                brand: await Huddle.getBrandObject(account).catch(console.log),
              });
            });
          }
        } catch (error) {
          console.log(error);
          res.send({
            success: false,
            error,
          });
        }
      } else {
        console.log("Google font not found on server!");
        // download from git
        res.send({
          success: false,
          error: "Google font not found on server!",
        });
      }
    } catch (error) {
      console.log(error);
      res.send({
        error: error.error ? error.error : error,
      });
    }
  });

  router.post("/brand-assets-payment", async (req, res) => {
    console.log("TRYING T PROCESS PAYMENT #43gD");

    try {
      if (!req.body.skipPayment) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 5.99 * 100,
          currency: "usd",
          payment_method: req.query.paymethod,
          customer: req.user.account.stripe_customer_id,
        });
        const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
          paymentIntent.id
        );

        console.log("PAYMENT PROCESSED A*b7");
      }

      await sendBrandAssets({ files: req.files, user: req.user });

      res.json({ message: "OK" });
    } catch (e) {
      console.log("ERROR PROCESSING PAYMENT B%gdft");
      res.status(500).json({ message: "payment error" });
    }
  });

  function sendBrandAssets(data) {
    try {
      // Prepare attachments
      const attachments = Object.keys(data.files).map((key) => ({
        type: data.files[key].mimetype,
        name: data.files[key].name,
        content: data.files[key].data.toString("base64"),
      }));

      // Mailchimp message
      const message = {
        from_email: "hi@prettyclose.co", // Your verified sender
        to: [
          {
            email: "brandhelp@prettyclose.co", // Recipient email
            type: "to",
          },
        ],
        subject: `Brand assets for ${data.user.name},`,
        html: `<div>Please see attached the brand assets for <p>${data.user.name}, email: ${data.user.email}</p></div>`,
        global_merge_vars: [
          {
            name: "TOKEN", // Matches *|TOKEN|* in your Mailchimp template
            content: data.user._id, // Dynamic value
          },
        ],
        attachments: attachments,
      };

      // Send via Mailchimp Transactional
      mailchimp.messages
        .send({ message })
        .then((response) => {
          console.log("Email sent via Mailchimp:", response);
          return "done";
        })
        .catch((error) => {
          console.error("Error sending email via Mailchimp:", error);
          return new Error("error");
        });
    } catch (error) {
      console.error("Unexpected error in sendBrandAssets:", error);
      return new Error(error.message);
    }
  }

  router.post("/info", async (req, res) => {
    let oldAccountData = await Account.findById(req.user.account._id);
    let accountNewData = { ...req.body };

    if (req.user.master) {
      accountNewData.AI = req.body.AI;
    }

    Account.findOneAndUpdate(
      {
        _id: req.user.account._id,
      },
      {
        $set: accountNewData,
      },
      {
        new: true,
      }
    )
      .then(async (account) => {
        if (
          account.industry_description &&
          oldAccountData.industry_description !== account.industry_description
        ) {
          console.log("Update AI Fields");
          Account.findOneAndUpdate(
            {
              _id: account._id,
            },
            {
              $set: {
                generating_ai: true,
              },
            },
            {
              new: true,
            }
          ).then(async () => {
            let aiData = await openAi.getAIFields(account.industry_description);
            console.log("AI Fields Updated");
            await Account.findOneAndUpdate(
              {
                _id: account._id,
              },
              {
                $set: {
                  AI: aiData,
                  generating_ai: false,
                },
              },
              {
                new: true,
              }
            );
          });
        }

        req.user.account = account;

        res.send({
          success: true,
          templates: [],
          brand: await Huddle.getBrandObject(account).catch(console.log),
        });
      })
      .catch((error) => {
        res.send(error);
      });
  });

  return router;
};

module.exports.setupDefaults = setupDefaults;
