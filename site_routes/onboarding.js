const fs = require("fs");
const express = require("express");
const router = express.Router();
const rp = require("request-promise");
const config = require("../config.json");
const HuddleAdmin = require("../admin_huddle");
const Huddle = require("../huddle");
const Account = require("../schemas/account");
const TextToSVG = require("text-to-svg");
const vectorExpress = require("@smidyo/vectorexpress-nodejs");
const sgMail = require("@sendgrid/mail");
const {
  searchContactByEmail,
  getContactById,
  updateBrandColor,
  updateBrandLogo,
  updateBrandFont,
} = require("../hubspot");
const stripe = require("stripe")(config.stripe.prod.secret);

const attributes = {
  fill: "#1A428A",
};
const logo_options = {
  x: 120,
  y: 0,
  fontSize: 70,
  anchor: "top",
  letterSpacing: "-0.03",
  attributes: attributes,
};

const wordmark_options = {
  x: 0,
  y: 0,
  fontSize: 70,
  anchor: "top",
  letterSpacing: "-0.03",
  attributes: attributes,
};

module.exports = () => {
  router.get("/", async (req, res) => {
    // if(!req.user.account.brand.logos.logo){
    //     return res.redirect('/onboarding/transfer')
    // }

    // let name = req.user.account.name;
    // let user_path = __dirname + "/../files/" + req.user.account._id;

    let templates = await Huddle.getTemplates({
      category: 44,
      user: req.user,
    });

    // if (!fs.existsSync(user_path)) {
    //   fs.mkdirSync(user_path);
    // }

    // user_path += "/logos";

    // if (!fs.existsSync(user_path)) {
    //   fs.mkdirSync(user_path);
    // }

    // let logos = fs.readdirSync(user_path);

    // let logo = logos.find((file) => {
    //   return file.toLowerCase().indexOf("logo") > -1 && file.endsWith("svg");
    // });
    // let wordmark = logos.find((file) => {
    //   return (
    //     file.toLowerCase().indexOf("wordmark") > -1 ||
    //     (file.toLowerCase().indexOf("watermark") > -1 && file.endsWith("svg"))
    //   );
    // });
    // let icon = logos.find((file) => {
    //   return file.toLowerCase().indexOf("icon") > -1 && file.endsWith("svg");
    // });

    // if (!logo || !wordmark || !icon) {
    //   TextToSVG.load(
    //     "../google-fonts/poppins/Poppins-SemiBold.ttf",
    //     async (err, textToSVG) => {
    //       if (!logo) {
    //         const logo_metrics = textToSVG.getMetrics(name, logo_options);
    //         const logo_path = textToSVG.getPath(name, logo_options);
    //         const logo = `
    //                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${
    //                       logo_metrics.width + 121.63499999999999
    //                     } ${logo_metrics.height + 10.049999999999983}">
    //                         <g>
    //                             <path id="brand_icon" fill="#D5BA8C" d="M39.5 31.2l10.1 10.1.1.1.1.1c1.1 1.1 2.5 1.7 4 1.7H54.1c1.5 0 3-.6 4.1-1.7L89.7 10c2.3-2.3 2.3-6 0-8.3-2.3-2.3-6-2.3-8.3 0L58.1 25l-4.2 4.2-12.4-12.5c-2.3-2.3-6-2.3-8.3 0-2.3 2.3-2.3 6 0 8.3l6.3 6.2zM106.3 81.4L83 58.1l-4.2-4.2 12.5-12.5c2.3-2.3 2.3-6 0-8.3-2.3-2.3-6-2.3-8.3 0l-6.3 6.3S66.3 49.7 66.3 49.8c-1.1 1.1-1.7 2.5-1.7 4V54.1c0 1.5.6 3 1.7 4.1L98 89.7c2.3 2.3 6 2.3 8.3 0 2.3-2.3 2.3-6 0-8.3zM68.5 76.8L58.2 66.5c-1.1-1.1-2.5-1.7-4-1.7H54h-.1c-1.5 0-3 .6-4.1 1.7L18.3 98c-2.3 2.3-2.3 6 0 8.3 2.3 2.3 6 2.3 8.3 0L49.9 83l4.2-4.2 12.5 12.5c2.3 2.3 6 2.3 8.3 0 2.3-2.3 2.3-6 0-8.3l-6.4-6.2zM16.7 74.8c2.3 2.3 6 2.3 8.3 0l6.3-6.3s10.3-10.4 10.4-10.4c1.1-1.1 1.7-2.5 1.7-4v-.2-.1c0-1.5-.6-3-1.7-4.1L10 18.3c-2.3-2.3-6-2.3-8.3 0-2.3 2.3-2.3 6 0 8.3L25 49.9l4.2 4.2-12.5 12.4c-2.3 2.3-2.3 6 0 8.3z"></path>
    //                             <g id="brand_name">
    //                                 ${logo_path}
    //                             </g>
    //                         </g>
    //                     </svg>
    //                 `;
    //         fs.writeFileSync(user_path + "/logo.svg", logo);

    //         await Account.findOneAndUpdate(
    //           {
    //             _id: req.user.account._id,
    //           },
    //           {
    //             $set: {
    //               "brand.logos.logo": "logo.svg",
    //             },
    //           },
    //           {
    //             new: true,
    //           }
    //         );
    //       }

    //       if (!wordmark) {
    //         const wordmark_metrics = textToSVG.getMetrics(
    //           name,
    //           wordmark_options
    //         );
    //         const wordmark_path = textToSVG.getPath(name, wordmark_options);
    //         const wordmark = `
    //                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wordmark_metrics.width} ${wordmark_metrics.height}"  width="${wordmark_metrics.width}" height="${wordmark_metrics.height}">
    //                         ${wordmark_path}
    //                     </svg>
    //                 `;
    //         fs.writeFileSync(user_path + "/watermark.svg", wordmark);

    //         await Account.findOneAndUpdate(
    //           {
    //             _id: req.user.account._id,
    //           },
    //           {
    //             $set: {
    //               "brand.logos.watermark": "watermark.svg",
    //             },
    //           },
    //           {
    //             new: true,
    //           }
    //         );
    //       }

    //       if (!icon) {
    //         const icon = `
    //                     <svg xmlns="http://www.w3.org/2000/svg" width="108.05" height="108.05" viewBox="0 0 108.05 108.05">
    //                         <path id="brand_icon" fill="#d5ba8c" d="M39.5,31.2,49.6,41.3l.1.1.1.1a5.606,5.606,0,0,0,4,1.7h.3a5.835,5.835,0,0,0,4.1-1.7L89.7,10a5.869,5.869,0,0,0-8.3-8.3L58.1,25l-4.2,4.2L41.5,16.7A5.869,5.869,0,0,0,33.2,25Zm66.8,50.2L83,58.1l-4.2-4.2L91.3,41.4A5.869,5.869,0,0,0,83,33.1l-6.3,6.3S66.3,49.7,66.3,49.8a5.606,5.606,0,0,0-1.7,4v.3a5.835,5.835,0,0,0,1.7,4.1L98,89.7a5.869,5.869,0,1,0,8.3-8.3ZM68.5,76.8,58.2,66.5a5.606,5.606,0,0,0-4-1.7h-.3a5.835,5.835,0,0,0-4.1,1.7L18.3,98a5.869,5.869,0,1,0,8.3,8.3L49.9,83l4.2-4.2L66.6,91.3A5.869,5.869,0,0,0,74.9,83l-6.4-6.2Zm-51.8-2a5.855,5.855,0,0,0,8.3,0l6.3-6.3S41.6,58.1,41.7,58.1a5.606,5.606,0,0,0,1.7-4v-.3a5.835,5.835,0,0,0-1.7-4.1L10,18.3a5.869,5.869,0,0,0-8.3,8.3L25,49.9l4.2,4.2L16.7,66.5A5.855,5.855,0,0,0,16.7,74.8Z" transform="translate(0.025 0.025)" />
    //                     </svg>
    //                 `;
    //         fs.writeFileSync(user_path + "/icon.svg", icon);
    //         await Account.findOneAndUpdate(
    //           {
    //             _id: req.user.account._id,
    //           },
    //           {
    //             $set: {
    //               "brand.logos.icon": "icon.svg",
    //             },
    //           },
    //           {
    //             new: true,
    //           }
    //         );
    //       }

    //       res.render("onboarding", {
    //         templates: templates.data.items,
    //         brand: await Huddle.getBrandObject(req.user.account),
    //         cache: true,
    //         filename: "onboarding",
    //       });
    //     }
    //   );
    // } else {
    res.render("onboarding", {
      templates: templates.data.items,
      brand: await Huddle.getBrandObject(req.user.account),
      cache: true,
      filename: "onboarding",
    });
    // }
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

      Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            isBoarded: true,
          },
        },
        {
          new: true,
        }
      )
        .then((account) => {
          return res.redirect("back");
        })
        .catch((error) => {
          console.log(error)
          return res.send(error);
        });

      return res.json({ message: "OK" });
    } catch (e) {
      console.log("ERROR PROCESSING PAYMENT B%gdft");
      return res.status(500).json({ message: "payment error" });
    }
  });

  router.get("/transfer", async (req, res) => {
    let user_path = __dirname + "/../files/" + req.user.account._id;
    let colors = await Huddle.getColors(req.user);
    let logos = await Huddle.getLogos(req.user);
    let fonts = await Huddle.getFonts(req.user);

    if (!logos.data.items.length) {
      return res.redirect("/onboarding");
    }

    if (!fs.existsSync(user_path)) {
      fs.mkdirSync(user_path);
    }

    user_path += "/logos";

    if (!fs.existsSync(user_path)) {
      fs.mkdirSync(user_path);
    }

    let regularFont = fonts.data.items.find((font) => {
      return font.font_faces.Regular;
    });
    let italicFont = fonts.data.items.find((font) => {
      return font.font_faces.Italic;
    });
    let boldFont = fonts.data.items.find((font) => {
      return font.font_faces.Bold;
    });
    let boldItalicFont = fonts.data.items.find((font) => {
      return font.font_faces.BoldItalic;
    });

    logos.data.items.forEach(async (logo) => {
      if (logo.logo_name.toLowerCase() === "logo") {
        fs.writeFileSync(
          user_path + "/logo.svg",
          logo.thumbnail_url.replace("data:image/svg+xml;utf8,", "")
        );

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

      if (logo.logo_name.toLowerCase() === "icon") {
        fs.writeFileSync(
          user_path + "/icon.svg",
          logo.thumbnail_url.replace("data:image/svg+xml;utf8,", "")
        );
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

      if (logo.logo_name.toLowerCase() === "wordmark") {
        fs.writeFileSync(
          user_path + "/watermark.svg",
          logo.thumbnail_url.replace("data:image/svg+xml;utf8,", "")
        );
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
    });

    colors.data.items.forEach(async (color) => {
      if (color.color_palette_name.toLowerCase().indexOf("primary") > -1) {
        await Account.findOneAndUpdate(
          {
            _id: req.user.account._id,
          },
          {
            $set: {
              "brand.colors.primary": color.colors[0],
            },
          },
          {
            new: true,
          }
        );
      }

      if (color.color_palette_name.toLowerCase().indexOf("secondary") > -1) {
        await Account.findOneAndUpdate(
          {
            _id: req.user.account._id,
          },
          {
            $set: {
              "brand.colors.secondary": color.colors[0],
            },
          },
          {
            new: true,
          }
        );
      }
    });

    if (fonts.data.items.length) {
      let fontObj = {
        "brand.fonts.Regular": {},
        "brand.fonts.Italic": {},
        "brand.fonts.Bold": {},
        "brand.fonts.BoldItalic": {},
      };

      if (regularFont) {
        fontObj["brand.fonts.Regular"].name = regularFont.font_family_name;
        fontObj["brand.fonts.Regular"].url = regularFont.font_faces.Regular;
      }

      if (italicFont) {
        fontObj["brand.fonts.Italic"].name = italicFont.font_family_name;
        fontObj["brand.fonts.Italic"].url = italicFont.font_faces.Italic;
      }

      if (boldFont) {
        fontObj["brand.fonts.Bold"].name = boldFont.font_family_name;
        fontObj["brand.fonts.Bold"].url = boldFont.font_faces.Bold;
      }

      if (boldItalicFont) {
        fontObj["brand.fonts.BoldItalic"].name =
          boldItalicFont.font_family_name;
        fontObj["brand.fonts.BoldItalic"].url =
          boldItalicFont.font_faces.BoldItalic;
      }

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

    console.log("redirect");
    res.redirect("/templates");
  });

  router.post("/logo", async (req, res) => {
    let fileName = req.files[req.body.name].name;
    let fileExt = fileName.split(".").pop();
    let logo_path = __dirname + "/../files/" + req.user.account._id;

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
        const file = fs.readFileSync(upload_path);
        const svg = await vectorExpress.convert(fileExt, "svg", {
          file: file,
          save: true,
          path: upload_path.replace(fileExt, "svg"),
          //transformers : ['auto']
        });

        fileExt = "svg";
      }

      if (req.query.draft) {
        let account = req.user.account;
        account.brand.logos[`${req.body.name}`] = fileName.replace(
          "." + fileExt,
          ".svg"
        );

        return res.send({
          success: true,
          brand: await Huddle.getBrandObject(account),
        });
      } else {
        let updateObj = {};
        updateObj[`brand.logos.${req.body.name}`] = fileName.replace(
          "." + fileExt,
          ".svg"
        );

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
          res.send({
            success: true,
            brand: await Huddle.getBrandObject(account),
          });
        });
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
    ).then(async (account) => {
      res.send({
        success: true,
        brand: await Huddle.getBrandObject(account),
      });
    });
  });

  router.post("/font", async (req, res) => {
    if (!req.user.account.brands || !req.user.account.brands.length) {
      req.user.account.brands = [config.huddle_account.brand]; // TODO: - ADD TO ACCOUNT
    }

    if (req.user.account.brands && req.user.account.brands.length) {
      try {
        let family;
        let name = req.body.name;
        let brand_id = req.user.account.brands[0].brand_id;
        let familyFolder;
        let fontFileName;
        let font_path;
        let folder;
        let value;
        let isGoogle;

        if (req.files && req.files[name]) {
          let fileName = req.files[req.body.name].name;
          let fileExt = fileName.split(".").pop();
          fontFileName = fileName;
          font_path = __dirname + "/../files/" + req.user.account._id;
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
                console.log(fontFileName);
              } else {
                //fontFileName = family + '-Regular.ttf';
                fontFileName = fontFiles[0];
              }

              console.log(fontFileName);

              fileExsist = fs.existsSync(font_path + "/" + fontFileName);
              if (fileExsist) {
                folder = fs.readdirSync(font_path);
              }
            }
          }
        }

        if (folder) {
          try {
            let upload = await HuddleAdmin.uploadFont({
              name: name,
              upload_path: font_path + "/" + fontFileName,
              brand_id: brand_id,
              font_family_name: family,
              font_file_name: fontFileName,
            });

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
                brand: await Huddle.getBrandObject(account),
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
                res.send({
                  success: true,
                  brand: await Huddle.getBrandObject(account),
                });
              });
            }
          } catch (error) {
            console.log(error.error ? error.error : error);
            res.send({
              success: false,
            });
          }
        } else {
          res.send({
            success: false,
          });
        }
      } catch (error) {
        console.log(error.error ? error.error : error);
        res.send({
          error: error.error ? error.error : error,
        });
      }
    } else {
      res.send("Error");
    }
  });

  return router;
};

function sendBrandAssets(data) {
  try {
    let attachments = [];
    Object.keys(data.files).forEach((key) => {
      attachments.push({
        content: data.files[key].data.toString("base64"),
        filename: data.files[key].name,
        type: data.files[key].mimetype,
        disposition: "attachment",
      });
    });

    const msg = {
      to: "brandhelp@prettysmart.co",
      from: "hi@prettysmart.co",
      subject: `Brand assets for ${data.user.name},`,
      html: `<div>Please see attached the brand assets for <p>${data.user.name}, email: ${data.user.email}</p></div>`,
      dynamic_template_data: {
        TOKEN: "user._id",
      },
      attachments: attachments,
    };
    sgMail
      .send(msg)
      .then(() => {
        console.log("Email sent");
        return "done";
      })
      .catch((error) => {
        console.log("KOKOK");
        console.error(error.response.body.errors[0]);
        return new Error("error");
      });
  } catch (e) {
    return Error(e);
  }
}
