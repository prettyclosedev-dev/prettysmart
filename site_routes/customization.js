const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const User = require("../schemas/user");
const Unsplash = require("unsplash-js");
const config = require("../config");
const nodeFetch = require("node-fetch");
const unsplash = new Unsplash.createApi({
  accessKey: config.unsplash.key,
  fetch: nodeFetch,
});
const openAi = require("../openAi");
const rp = require("request-promise");

module.exports = () => {
  router.post("/", async (req, res) => {
    let user = req.user;
    let open_ai_content;
    let unsplash_images;
    let random_quotes;
    let icons;
    let vectors;
    let news;
    let reviews;
    let articles = req.body.articles;
    let rates = req.body.rates;
    let ai_error;

    console.log("Start 1", Date.now());

    if (req.body.ai_fields) {
      if (!user.account.AI) {
        user.account.AI = {};
      }

      for (key in req.body.ai_fields) {
        user.account.AI[key] = req.body.ai_fields[key];
      }
    }

    let class_types = [
      "Logo",
      "Color",
      "User",
      "Custom Content",
      "Unsplash",
      "Icon8",
    ];
    let class_query = {
      type: "class",
    };

    if (req.query.row_class_name && req.query.row_class_name !== "Quote") {
      class_query.$or = [
        {
          name: req.query.row_class_name,
          asset_type: "OpenAi",
        },
        {
          asset_type: {
            $in: class_types,
          },
        },
      ];
    }

    if (req.query.row_class_name === "mu") {
      if (!class_query.$or) {
        class_query.$or = [];
      }

      for (var i = 1; i < 5; i++) {
        class_query.$or.push({
          name: req.query.row_class_name + "_image_" + i,
          asset_type: "OpenAi",
        });
      }
    }

    if (req.query.row_class_name === "Chanukah") {
      if (!class_query.$or) {
        class_query.$or = [];
      }

      class_query.$or.push({
        name: "Chanukah pun",
        asset_type: "OpenAi",
      });

      class_query.$or.push({
        name: "Chanukah Short",
        asset_type: "OpenAi",
      });
    }

    if (req.query.row_class_name === "Clyps") {
      if (!class_query.$or) {
        class_query.$or = [];
      }

      class_query.$or.push({
        name: "clyps",
        asset_type: "OpenAi",
      });

      // class_query.$or.push({
      //   name: "Simple Clyps",
      //   asset_type: "OpenAi",
      // });

      // class_query.$or.push({
      //   name: "Elegant Clyps",
      //   asset_type: "OpenAi",
      // });

      // class_query.$or.push({
      //   name: "Trendy Clyps",
      //   asset_type: "OpenAi",
      // });
    }

    db.pages.find(class_query, async function (err, default_classes) {
      if (err) {
        res.send(err);
      } else {
        db.pages.aggregate(
          [{ $match: { type: "quote" } }, { $sample: { size: 6 } }],
          async function (err, quotes) {
            if (err) {
              res.send(err);
            } else {
              db.pages.find(
                { type: "font size" },
                async function (err, font_classes) {
                  if (err) {
                    res.send(err);
                  } else {
                    let default_logos = default_classes.filter((cls) => {
                      return cls.asset_type === "Logo";
                    });

                    let default_colors = default_classes.filter((cls) => {
                      return cls.asset_type === "Color";
                    });

                    let user_fields = default_classes.filter((cls) => {
                      return cls.asset_type === "User";
                    });

                    let custom_content = default_classes.filter((cls) => {
                      return cls.asset_type === "Custom Content";
                    });

                    let unsplash_content = default_classes.filter((cls) => {
                      return cls.asset_type === "Unsplash";
                    });

                    let open_ai_content_classes = default_classes.filter(
                      (cls) => {
                        return cls.asset_type === "OpenAi";
                      }
                    );

                    // let icons_content = default_classes.filter((cls) => {
                    //   return cls.asset_type === "Icon8";
                    // });

                    // let vectors_content = default_classes.filter((cls) => {
                    //   return cls.asset_type === "Illustration8";
                    // });

                    try {
                      if (!req.query.onboarding) {
                        if (
                          req.query.row_class_name !== "Quote" &&
                          (req.query.row_class_name !== "Newsroom" ||
                            (req.body.news_fields &&
                              req.body.news_fields.isUrl)) &&
                          (!req.query.row_class_name ||
                            !req.query.row_class_name.includes("Reviews"))
                        ) {
                          if (req.query.row_class_name === "mu") {
                            for (var i = 1; i < 5; i++) {
                              open_ai_content_classes.push({
                                class: ["mu_" + i],
                                description: `{{AI.mu_${i}}}\n---\nTl;dr for 2nd grader worth sharing:`,
                                settings: {
                                  engine: "text-davinci-003",
                                  temperature: 0,
                                  max_tokens: 256,
                                  top_p: 1,
                                  stop: "&&&&",
                                  frequency_penalty: 0,
                                  presence_penalty: 0,
                                },
                              });
                            }
                          }

                          console.log("Start 2", Date.now());

                          try {
                            open_ai_content = await getOpenAiContent(
                              open_ai_content_classes,
                              user,
                              res
                            );
                          } catch (e) {
                            console.log(e);
                          }

                          if (open_ai_content.length) {
                            try {
                              ai_error = open_ai_content.find(
                                (ai) => ai.failed
                              );
                              console.log("ai_error", ai_error)
                              if (ai_error) {
                                open_ai_content.splice(
                                  open_ai_content.indexOf(ai_error),
                                  1
                                );
                              }
                            } catch (e) {
                              console.log(e);
                            }
                          }
                        }

                        console.log("Start 3", Date.now());
                        try {
                          unsplash_images = await getUnsplashImages(
                            unsplash_content,
                            user
                          );
                        } catch(e) {
                          console.log(e)
                        }

                        if (req.query.row_class_name === "Quote") {
                          console.log("Start 4", Date.now());
                          try {
                            random_quotes = await getRandomQuotes(quotes, user);
                          } catch(e) {
                            console.log(e)
                          }
                        } else {
                          console.log("Skipping 4", Date.now());
                        }

                        // console.log("Start 5", Date.now());
                        // icons = await getIcons8(icons_content, "", user);

                        // console.log("Start 6", Date.now());
                        // vectors = await getIcons8Vector(
                        //   vectors_content,
                        //   "",
                        //   user
                        // );

                        if (
                          req.query.row_class_name === "Newsroom" ||
                          req.query.row_class_name === "Link"
                        ) {
                          console.log("Start 5", Date.now());
                          if (
                            req.body.news_fields.body &&
                            (req.query.row_class_name !== "Newsroom" ||
                              req.body.news_fields.isUrl)
                          ) {
                            news = req.body.news_fields;
                          } else {
                            let term = req.body.ai_fields
                              ? req.body.ai_fields.news
                              : null;
                            news = await getNews(term, user);
                          }
                        } else {
                          console.log("Skipping 5", Date.now());
                        }

                        if (req.query.row_class_name && req.query.row_class_name.includes("Reviews")) {
                          console.log("Start 6", Date.now());
                          let placeId = req.body.ai_fields
                            ? req.body.ai_fields.reviews
                            : null;
                          reviews = await getReviews(placeId);
                        } else {
                          console.log("Skipping 6", Date.now());
                        }
                      }

                      console.log("Start 7", Date.now());

                      let brand = await Huddle.getBrandObject(user.account);

                      if (req.body.brand) {
                        brand = Object.assign(brand, req.body.brand);
                      }

                      let colors = [
                        {
                          color_palette_name: "primary",
                          colors: [brand.colors.primary],
                        },
                        {
                          color_palette_name: "secondary",
                          colors: [brand.colors.secondary],
                        },
                      ];

                      let logos = [];

                      if (brand.logos.logo) {
                        logos.push({
                          logo_name: "logo",
                          thumbnail_url:
                            "data:image/svg+xml;utf8," + brand.logos.logo,
                        });
                      }

                      if (brand.logos.icon) {
                        logos.push({
                          logo_name: "icon",
                          thumbnail_url:
                            "data:image/svg+xml;utf8," + brand.logos.icon,
                        });
                      }

                      if (brand.logos.watermark) {
                        logos.push({
                          logo_name: "watermark",
                          thumbnail_url:
                            "data:image/svg+xml;utf8," + brand.logos.watermark,
                        });
                        logos.push({
                          logo_name: "wordmark",
                          thumbnail_url:
                            "data:image/svg+xml;utf8," + brand.logos.watermark,
                        });
                      }

                      let fonts = [];

                      if (brand.fonts.Regular && brand.fonts.Regular.name) {
                        fonts.push({
                          font_family_name: brand.fonts.Regular.name,
                          font_faces: {
                            Regular: brand.fonts.Regular.url || true,
                          },
                        });
                      }

                      if (brand.fonts.Italic && brand.fonts.Italic.name) {
                        fonts.push({
                          font_family_name: brand.fonts.Italic.name,
                          font_faces: {
                            Italic: brand.fonts.Italic.url || true,
                          },
                        });
                      }

                      if (brand.fonts.Bold && brand.fonts.Bold.name) {
                        fonts.push({
                          font_family_name: brand.fonts.Bold.name,
                          font_faces: {
                            Bold: brand.fonts.Bold.url || true,
                          },
                        });
                      }

                      if (
                        brand.fonts.BoldItalic &&
                        brand.fonts.BoldItalic.name
                      ) {
                        fonts.push({
                          font_family_name: brand.fonts.BoldItalic.name,
                          font_faces: {
                            BoldItalic: brand.fonts.BoldItalic.url || true,
                          },
                        });
                      }

                      let new_customization_content = {
                        content: req.session.content,
                        user_fields: user_fields,
                        custom_content: custom_content,
                        open_ai_content: open_ai_content,
                        random_quotes: random_quotes,
                        news: news,
                        reviews: reviews,
                        articles: articles,
                        rates: rates,
                        font_classes: font_classes,
                        unsplash_images: unsplash_images,
                        icons: icons,
                        logos: logos,
                        default_logos: default_logos,
                        default_colors: default_colors,
                        colors: colors,
                        fonts: fonts,
                        vectors: vectors,
                      };

                      let customization_content = user.customization_content
                        ? Object.assign(
                            user.customization_content,
                            new_customization_content
                          )
                        : new_customization_content;
                      let classes = await Huddle.getCustomizationObjectClasses(
                        customization_content,
                        user
                      );

                      res.send({
                        classes,
                        reviews_amount: (reviews && reviews.length) || 0,
                        ai_error,
                      });
                    } catch (e) {
                      console.log(e)
                      res.send(e);
                    }
                  }
                }
              );
            }
          }
        );
      }
    });
  });

  return router;
};

async function getUnsplashImages(content, user) {
  let unsplash_images = [];

  let templateData = user;
  templateData.AI = user.account.AI || {};

  try {
    await Promise.all(
      content.map(async (unsplashClass) => {
        if (unsplashClass.description) {
          let templateFn = _.template(unsplashClass.description.trim(), {
            interpolate: /\{\{(.+?)\}\}/g,
          });

          let description = templateFn(templateData);

          let classes =
            typeof unsplashClass.class === "string"
              ? [unsplashClass.class]
              : unsplashClass.class;

          if (description.indexOf("collection_") > -1) {
            const collectionId = description.split("_")[1];
            await Promise.all(
              classes.map(async (cls) => {
                let collections = await unsplash.collections.getPhotos({
                  collectionId: collectionId,
                });
                if (
                  collections.response &&
                  collections.response.results &&
                  collections.response.results.length > 0
                ) {
                  function generateRandom(max = 100, min = 0) {
                    let difference = max - min;
                    let rand = Math.random();
                    rand = Math.floor(rand * difference);
                    rand = rand + min;
                    return rand;
                  }

                  unsplash_images.push({
                    class: cls,
                    url: collections.response.results[
                      generateRandom(collections.response.results.length - 1)
                    ].urls.regular,
                  });
                }
              })
            );
          } else {
            await Promise.all(
              classes.map(async (cls) => {
                let random_photo = await unsplash.photos.getRandom({
                  query: description,
                  featured: true,
                });
                if (random_photo.response) {
                  unsplash_images.push({
                    class: cls,
                    url: random_photo.response.urls.regular,
                  });
                }
              })
            );
          }
        }
      })
    );
  } catch (error) {
    console.log(error);
  }

  return unsplash_images;
}

async function getOpenAiContent(content, user, res) {
  let open_ai_content = [];
  let count = 0;
  try {
    await Promise.all(
      content.map(async (contentClass) => {
        if (contentClass.description) {
          let templateFn = _.template(contentClass.description, {
            interpolate: /\{\{(.+?)\}\}/g,
          });
          let templateData = user;
          templateData.AI = user.account.AI || {};

          let description = templateFn(templateData);
          let classes =
            typeof contentClass.class === "string"
              ? [contentClass.class]
              : contentClass.class;

          await Promise.all(
            classes.map(async (cls) => {
              try {
                if (description) {
                  let shortSlogan = await openAi.getShortSlogan({
                    description: description + "\n",
                    settings: contentClass.settings,
                  });

                  if (shortSlogan && shortSlogan.text) {
                    if (contentClass.suffix) {
                      let fields = shortSlogan.text.split("~");
                      await Promise.all(
                        fields.map(async (field) => {
                          let split = field.split(":");

                          if (split.length > 1) {
                            let fieldKey = field.split(":")[0];
                            let fieldValue = field.split(":");
                            fieldValue.shift();
                            fieldValue = fieldValue.join(":").trim();

                            let hasImageSuffix =
                              contentClass.image_siffix &&
                              contentClass.image_siffix.length &&
                              contentClass.image_siffix.includes(fieldKey);
                            let hasIconSuffix =
                              contentClass.icon_siffix &&
                              contentClass.icon_siffix.length &&
                              contentClass.icon_siffix.includes(fieldKey);
                            let hasIconStyles =
                              contentClass.icon_styles &&
                              contentClass.icon_styles.length;
                            let hasVectorSuffix =
                              contentClass.illustration_siffix &&
                              contentClass.illustration_siffix.length &&
                              contentClass.illustration_siffix.includes(
                                fieldKey
                              );
                            let hasVectorStyles =
                              contentClass.illustration_styles &&
                              contentClass.illustration_styles.length;

                            if (
                              hasImageSuffix ||
                              hasIconSuffix ||
                              hasVectorSuffix
                            ) {
                              if (hasImageSuffix) {
                                // if (!contentClass.name.includes("mu_image_")) {
                                //   let random_photo =
                                //     await unsplash.photos.getRandom({
                                //       query: fieldValue,
                                //       featured: true,
                                //     });
                                //   if (random_photo.response) {
                                //     open_ai_content.push({
                                //       class: cls + "_" + fieldKey,
                                //       url: random_photo.response.urls.regular,
                                //     });
                                //   }
                                // } else {
                                let random_photo =
                                  await unsplash.search.getPhotos({
                                    query: fieldValue,
                                    page: 1,
                                    per_page: 1,
                                  });
                                if (
                                  random_photo.response &&
                                  random_photo.response.results &&
                                  random_photo.response.results.length > 0
                                ) {
                                  open_ai_content.push({
                                    class: cls + "_" + fieldKey,
                                    url: random_photo.response.results[0].urls
                                      .regular,
                                  });
                                }
                                // }
                              }

                              if (hasIconSuffix && false) {
                                if (hasIconStyles) {
                                  await Promise.all(
                                    contentClass.icon_styles.map(
                                      async (style) => {
                                        let platform = style;
                                        if (platform.split("_").length > 1) {
                                          platform = platform.split("_")[1];
                                        }
                                        let random_icon = await getIcon(
                                          fieldValue,
                                          platform
                                        );

                                        if (random_icon && random_icon.icon) {
                                          open_ai_content.push({
                                            class:
                                              cls +
                                              "_" +
                                              fieldKey +
                                              "_" +
                                              style,
                                            url:
                                              "data:image/svg+xml;utf8," +
                                              random_icon.icon.svg,
                                            svg: true,
                                            noWhiteSpace: style === "plumpy",
                                          });
                                        } else {
                                          let random_icon = await getIcon(
                                            user.account.industry,
                                            platform
                                          );

                                          if (random_icon && random_icon.icon) {
                                            open_ai_content.push({
                                              class:
                                                cls +
                                                "_" +
                                                fieldKey +
                                                "_" +
                                                style,
                                              url:
                                                "data:image/svg+xml;utf8," +
                                                random_icon.icon.svg,
                                              svg: true,
                                              noWhiteSpace: style === "plumpy",
                                            });
                                          }
                                        }
                                      }
                                    )
                                  );
                                } else {
                                  let random_icon = await getIcon(fieldValue);
                                  if (random_icon && random_icon.icon) {
                                    open_ai_content.push({
                                      class: cls + "_" + fieldKey,
                                      url:
                                        "data:image/svg+xml;utf8," +
                                        random_icon.icon.svg,
                                      svg: true,
                                    });
                                  } else {
                                    let random_icon = await getIcon(
                                      user.account.industry
                                    );
                                    if (random_icon && random_icon.icon) {
                                      open_ai_content.push({
                                        class: cls + "_" + fieldKey,
                                        url:
                                          "data:image/svg+xml;utf8," +
                                          random_icon.icon.svg,
                                        svg: true,
                                      });
                                    }
                                  }
                                }
                              }

                              if (hasVectorSuffix && false) {
                                if (hasVectorStyles) {
                                  await Promise.all(
                                    contentClass.illustration_styles.map(
                                      async (style) => {
                                        let random_vec = await getVector(
                                          fieldValue,
                                          style
                                        );

                                        if (random_vec) {
                                          open_ai_content.push({
                                            class: cls + "_" + fieldKey, // + "_" + style,
                                            url: random_vec,
                                            vector: true,
                                          });
                                        } else {
                                          let random_vec = await getVector(
                                            user.account.industry,
                                            style
                                          );

                                          if (random_vec) {
                                            open_ai_content.push({
                                              class: cls + "_" + fieldKey, // + "_" + style,
                                              url: random_vec,
                                              vector: true,
                                            });
                                          }
                                        }
                                      }
                                    )
                                  );
                                } else {
                                  let random_vec = await getVector(fieldValue);
                                  if (random_vec) {
                                    open_ai_content.push({
                                      class: cls + "_" + fieldKey,
                                      url: random_vec,
                                      vector: true,
                                    });
                                  } else {
                                    let random_vec = await getVector(
                                      user.account.industry
                                    );

                                    if (random_vec) {
                                      open_ai_content.push({
                                        class: cls + "_" + fieldKey,
                                        url: random_vec,
                                        vector: true,
                                      });
                                    }
                                  }
                                }
                              }
                            } else {
                              open_ai_content.push({
                                class: cls + "_" + fieldKey,
                                text: fieldValue,
                              });
                            }
                          }
                        })
                      );
                    } else {
                      open_ai_content.push({
                        class: cls,
                        text: shortSlogan.text,
                      });
                    }
                  }
                }
              } catch (e) {
                open_ai_content.push({ failed: true, error: e });
              }
            })
          );
        }
      })
    );
  } catch (error) {
    console.log(error);
  }

  return open_ai_content;
}

async function getRandomQuotes(quotes, user) {
  let random_quotes = [];
  let templateData = user;
  templateData.AI = user.account.AI || {};
  try {
    await Promise.all(
      quotes.map(async (quote) => {
        let image_templateFn = _.template(quote.image_query.trim(), {
          interpolate: /\{\{(.+?)\}\}/g,
        });
        let image_query = image_templateFn(templateData);
        let random_photo = await unsplash.photos.getRandom({
          query: image_query,
          featured: true,
        });

        let name_templateFn = _.template(quote.name.trim(), {
          interpolate: /\{\{(.+?)\}\}/g,
        });
        let name = name_templateFn(templateData);

        let description_templateFn = _.template(quote.content.trim(), {
          interpolate: /\{\{(.+?)\}\}/g,
        });
        let description = description_templateFn(templateData);

        if (random_photo.response && random_photo.response.urls) {
          random_quotes.push({
            name: name,
            content: description,
            image: random_photo.response.urls.regular,
          });
        }
      })
    );
  } catch (error) {
    console.log(error);
  }

  return shuffle(random_quotes);
}

async function getIcons8(content, style, user) {
  let icons = [];

  let templateData = user;
  templateData.AI = user.account.AI || {};

  try {
    await Promise.all(
      content.map(async (iconClass) => {
        let templateFn = _.template(iconClass.description.trim(), {
          interpolate: /\{\{(.+?)\}\}/g,
        });

        let description = templateFn(templateData);

        let classes =
          typeof iconClass.class === "string"
            ? [iconClass.class]
            : iconClass.class;

        await Promise.all(
          classes.map(async (cls) => {
            let icon = await getIcon(description, style);

            if (icon) {
              icons.push({
                class: cls,
                url: "data:image/svg+xml;utf8," + icon.icon.svg,
              });
            }
          })
        );
      })
    );
  } catch (error) {
    console.log(error);
  }

  return icons;
}

async function getIcons8Vector(content, style, user) {
  let vectors = [];

  let templateData = user;
  templateData.AI = user.account.AI || {};

  try {
    await Promise.all(
      content.map(async (vecClass) => {
        let templateFn = _.template(vecClass.description.trim(), {
          interpolate: /\{\{(.+?)\}\}/g,
        });

        let description = templateFn(templateData);

        let classes =
          typeof vecClass.class === "string"
            ? [vecClass.class]
            : vecClass.class;

        await Promise.all(
          classes.map(async (cls) => {
            let vector = await getVector(description, style);
            if (vector) {
              vector.push({
                class: cls,
                url: vector,
              });
            }
          })
        );
      })
    );
  } catch (error) {
    console.log(error);
  }

  return vectors;
}

async function getIcon(term, style) {
  return;

  if (!term || !term.length || typeof term !== "string") {
    return;
  }

  try {
    let iconSearch = await rp({
      uri: "https://search.icons8.com/api/iconsets/v5/search",
      qs: {
        token: config.icons8.icons_key,
        term: term,
        amount: 1,
        platform: style,
      },
      json: true,
    });

    if (iconSearch.success && iconSearch.icons.length) {
      let icon = await rp({
        uri: "https://api-icons.icons8.com/publicApi/icons/icon",
        qs: {
          token: config.icons8.icons_key,
          id: iconSearch.icons[0].id,
        },
        json: true,
      });

      return icon;
    }
  } catch (error) {
    console.log("error", error);
  }
}

function getVectorFromSize(vector, size) {
  if (vector.urls) {
    return vector.urls[size].url;
  }
}

async function getVector(term, style) {
  return;
  if (!term || !term.length || typeof term !== "string") {
    return;
  }

  try {
    let vecSearch = await rp({
      uri: "https://api-illustrations.icons8.com/api/v2/illustrations/search",
      qs: {
        token: config.icons8.vectors_key,
        query: term,
        // perPage: 1,
        styles: style,
      },
      json: true,
    });

    if (vecSearch.illustrations && vecSearch.illustrations.length) {
      let vector = getVectorFromSize(
        vecSearch.illustrations[
          Math.floor(Math.random() * vecSearch.illustrations.length)
        ],
        "large"
      );
      return vector;
    }
  } catch (error) {
    console.log("error", error);
  }
}

async function getNews(term, user) {
  try {
    let newsSearch = await rp({
      uri: "https://api.newscatcherapi.com/v2/search",
      qs: {
        q: term || user.account.industry,
        page_size: 1,
      },
      headers: {
        "x-api-key": config.newscatcher.api_key,
      },
      json: true,
    });
    if (
      newsSearch.status === "ok" &&
      newsSearch.articles &&
      newsSearch.articles.length > 0
    ) {
      return newsSearch.articles[0];
    }
  } catch (e) {}
}

async function getReviews(placeId) {
  try {
    let placeSearch = await rp({
      uri: "https://maps.googleapis.com/maps/api/place/details/json",
      qs: {
        place_id: placeId,
        key: config.google.maps.api_key,
      },
      json: true,
    });
    if (
      placeSearch.status === "OK" &&
      placeSearch.result &&
      placeSearch.result.reviews &&
      placeSearch.result.reviews.length > 0
    ) {
      return placeSearch.result.reviews.filter(
        (review) => review.text && review.text.length
      );
    }
  } catch (e) {}
}

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}