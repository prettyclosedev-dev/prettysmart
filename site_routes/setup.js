const express = require("express");
const Huddle = require("../huddle");
const router = express.Router();
const Account = require("../schemas/account");
const fs = require("fs");
const rp = require("request-promise");
const config = require("../config.json");
const HuddleAdmin = require("../admin_huddle");
const TextToSVG = require("text-to-svg");
const path = require("path");
const { searchContactByEmail, updateContact } = require("../hubspot");

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

  await setupDefaultColors(req);
  await setDefaultFonts(req, user_path);
  await setDefaultAssets(req, user_path);
}

async function setDefaultAssets(req, user_path) {
  let user_logo_path = user_path + "/logos";

  if (!fs.existsSync(user_logo_path)) {
    fs.mkdirSync(user_logo_path, { recursive: true });
  }

  // let logos = fs.readdirSync(user_logo_path);

  // let logo = logos.find((file) => {
  //   return file.toLowerCase().indexOf("logo") > -1 && file.endsWith("svg");
  // });
  // let wordmark = logos.find((file) => {
  //   return (
  //     (file.toLowerCase().indexOf("wordmark") > -1 ||
  //       file.toLowerCase().indexOf("watermark") > -1) &&
  //     file.endsWith("svg")
  //   );
  // });
  // let icon = logos.find((file) => {
  //   return file.toLowerCase().indexOf("icon") > -1 && file.endsWith("svg");
  // });

  await loadAssets(req, user_logo_path, true, true, true);
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

      let overrideIcon;

      if (setLogo) {
        logo_options.attributes.fill = primaryFill;

        const logo_metrics = textToSVG.getMetrics(name, logo_options);
        const logo_path = textToSVG.getPath(name, logo_options);

        let random_icon = await getIcon(
          req.user.account.industry,
          "glyph-neue" //"material-rounded" // "android" // "plumpy" // "carbon-copy"
        );

        if (random_icon && random_icon.icon) {
          overrideIcon = random_icon.icon.svg;
        }

        const logo = loadSVG(
          logo_metrics,
          logo_path,
          secondaryFill,
          overrideIcon
        );
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
        const icon = overrideIcon
          ? manipulateIcon(overrideIcon, secondaryFill, true)
          : loadIcon(secondaryFill);
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

function manipulateIcon(svg, fill, keepViewBox) {
  if (!keepViewBox) {
    // var regex = /viewBox="(.*?)"/i;
    // var matched = svg.match(regex);
    // if (matched && matched.length > 1) {
    //   var viewBox = matched[1].split(" ");
    //   if (viewBox.length > 3) {
    //     svg = svg.replace(
    //       /viewBox="(.*?)"/i,
    //       `viewBox="41 2 ${viewBox[2]} ${viewBox[3]}"`
    //     );
    //   }
    // }
    // svg = svg.replace(/viewBox="(.*?)"/i, `viewBox="45 0 28 28"`);
    svg = svg.replace(/<svg(.*?)>/i, "").replace("</svg>", "");
    svg = svg
      .split("<path")
      .join(`<path fill="${fill}" transform="scale(1.5, 1.5)"`); // stroke-width="1" stroke="${fill}"
    svg = svg
      .split("<circle")
      .join(`<circle fill="${fill}" transform="scale(1.5)"`);
    svg = svg
      .split("<ellipse")
      .join(`<ellipse fill="${fill}" transform="scale(1.5)"`);
  } else {
    svg = svg.split("<path").join(`<path fill="${fill}"`); // stroke-width="1" stroke="${fill}"
    svg = svg.split("<circle").join(`<circle fill="${fill}"`);
    svg = svg.split("<ellipse").join(`<ellipse fill="${fill}"`);
  }
  return svg;
}

function loadSVG(logo_metrics, logo_path, fill = "#D5BA8C", overrideIcon) {
  const logo = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${
        logo_metrics.width + 121.63499999999999
      } ${logo_metrics.height + 10.049999999999983}">
          <g>
              ${
                overrideIcon
                  ? manipulateIcon(overrideIcon, fill)
                  : `<path id="brand_icon" fill="${fill}" d="M39.5 31.2l10.1 10.1.1.1.1.1c1.1 1.1 2.5 1.7 4 1.7H54.1c1.5 0 3-.6 4.1-1.7L89.7 10c2.3-2.3 2.3-6 0-8.3-2.3-2.3-6-2.3-8.3 0L58.1 25l-4.2 4.2-12.4-12.5c-2.3-2.3-6-2.3-8.3 0-2.3 2.3-2.3 6 0 8.3l6.3 6.2zM106.3 81.4L83 58.1l-4.2-4.2 12.5-12.5c2.3-2.3 2.3-6 0-8.3-2.3-2.3-6-2.3-8.3 0l-6.3 6.3S66.3 49.7 66.3 49.8c-1.1 1.1-1.7 2.5-1.7 4V54.1c0 1.5.6 3 1.7 4.1L98 89.7c2.3 2.3 6 2.3 8.3 0 2.3-2.3 2.3-6 0-8.3zM68.5 76.8L58.2 66.5c-1.1-1.1-2.5-1.7-4-1.7H54h-.1c-1.5 0-3 .6-4.1 1.7L18.3 98c-2.3 2.3-2.3 6 0 8.3 2.3 2.3 6 2.3 8.3 0L49.9 83l4.2-4.2 12.5 12.5c2.3 2.3 6 2.3 8.3 0 2.3-2.3 2.3-6 0-8.3l-6.4-6.2zM16.7 74.8c2.3 2.3 6 2.3 8.3 0l6.3-6.3s10.3-10.4 10.4-10.4c1.1-1.1 1.7-2.5 1.7-4v-.2-.1c0-1.5-.6-3-1.7-4.1L10 18.3c-2.3-2.3-6-2.3-8.3 0-2.3 2.3-2.3 6 0 8.3L25 49.9l4.2 4.2-12.5 12.4c-2.3 2.3-2.3 6 0 8.3z"></path>`
              }
              <g id="brand_name">
                  ${logo_path}
              </g>
          </g>
      </svg>
  `;
  return logo;
}

async function recolor(req) {
  return new Promise(async (resolve, reject) => {
    try {
      let user_path = path.join(__dirname, "../files/" + req.user.account._id);

      if (!fs.existsSync(user_path)) {
        fs.mkdirSync(user_path, { recursive: true });
      }

      let user_logo_path = user_path + "/logos";

      if (!fs.existsSync(user_logo_path)) {
        fs.mkdirSync(user_logo_path, { recursive: true });
      }

      var svg = fs.readFileSync(user_logo_path + "/logo.svg");
      svg = svg.toString();

      // let fills = new RegExp(`fill=".*?"`, "g");
      // let paths = svg.split("<path");
      // if (paths && paths.length > 1) {

      // } else {
      svg = Huddle.replaceSvgSetting(
        svg,
        "fill",
        req.user.account.brand.colors.primary
      );
      // }

      fs.writeFileSync(user_logo_path + "/logo.svg", svg);

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

      resolve(true);
    } catch (e) {
      reject(e);
    }
  });
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

  if (!fonts.length) {
    let fontFamily = "poppins";

    if (!fs.existsSync(font_path + "/" + fontFamily)) {
      fs.mkdirSync(font_path + "/" + fontFamily, { recursive: true });
    }

    let type = ".ttf";
    let regName = "Poppins-Regular";
    let italicName = "Poppins-Italic";
    let boldName = "Poppins-Bold";
    let boldItalicName = "Poppins-BoldItalic";

    font_path += "/" + fontFamily + "/";

    let googleFontPath = path.join(
      __dirname,
      "../google-fonts/" + fontFamily + "/"
    );

    copyFile(googleFontPath + regName + type, font_path + regName + type);
    copyFile(googleFontPath + italicName + type, font_path + italicName + type);
    copyFile(googleFontPath + boldName + type, font_path + boldName + type);
    copyFile(
      googleFontPath + boldItalicName + type,
      font_path + boldItalicName + type
    );

    fontFamily = fontFamily.charAt(0).toUpperCase() + fontFamily.slice(1);

    // await uploadFontToHuddle({
    //   name: "Regular",
    //   brand_id,
    //   upload_path: font_path + regName + type,
    //   font_family_name: fontFamily,
    //   font_file_name: regName + type,
    // });
    // await uploadFontToHuddle({
    //   name: "Italic",
    //   brand_id,
    //   upload_path: font_path + italicName + type,
    //   font_family_name: fontFamily,
    //   font_file_name: italicName + type,
    // });
    // await uploadFontToHuddle({
    //   name: "Bold",
    //   brand_id,
    //   upload_path: font_path + boldName + type,
    //   font_family_name: fontFamily,
    //   font_file_name: boldName + type,
    // });
    // await uploadFontToHuddle({
    //   name: "BoldItalic",
    //   brand_id,
    //   upload_path: font_path + boldItalicName + type,
    //   font_family_name: fontFamily,
    //   font_file_name: boldItalicName + type,
    // });

    await syncFontsWithAccount(req, ["poppins"]);
  }

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
}) {
  await HuddleAdmin.uploadFont({
    name,
    upload_path,
    brand_id,
    font_family_name,
    font_file_name,
  }).catch(console.log);
}

async function syncFontsWithAccount(req, fontFamilies) {
  let user_path = path.join(__dirname, "../files/" + req.user.account._id);
  let fonts = fs.readdirSync(user_path + "/fonts/" + fontFamilies[0]);

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
    res.render("setup", {
      stripe_pub_key: config.stripe.prod.pub,
      brand: await Huddle.getBrandObject(req.user.account).catch(console.log),
    });
  });

  router.post("/random", async (req, res) => {
    try {
      await setupDefaults(req);

      const contactID = await searchContactByEmail(req.user.email);
      if (contactID) {
        await updateContact(contactID, {
          generated_logos: "Yes",
        });
      }

      res.send({
        success: true,
        brand: await Huddle.getBrandObject(req.user.account).catch(console.log),
      });
    } catch (e) {
      res.send({ success: false, error: e });
    }
  });

  router.post("/recolor", async (req, res) => {
    try {
      await recolor(req);

      res.send({
        success: true,
        brand: await Huddle.getBrandObject(req.user.account).catch(console.log),
      });
    } catch (e) {
      res.send({ success: false, error: e });
    }
  });

  return router;
};

async function getIcon(term, style) {
  if (!term || !term.length || typeof term !== "string") {
    return;
  }

  try {
    let iconSearch = await rp({
      uri: "https://search.icons8.com/api/iconsets/v5/search",
      qs: {
        token: config.icons8.icons_key,
        term: term,
        // amount: 10,
        platform: style,
      },
      json: true,
    });

    if (iconSearch.success && iconSearch.icons.length) {
      let icon = await rp({
        uri: "https://api-icons.icons8.com/publicApi/icons/icon",
        qs: {
          token: config.icons8.icons_key,
          id: iconSearch.icons[
            Math.floor(Math.random() * iconSearch.icons.length)
          ].id,
        },
        json: true,
      });

      return icon;
    }
  } catch (error) {
    console.log("error", error);
  }
}
