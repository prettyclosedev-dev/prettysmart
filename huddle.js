const rp = require("request-promise");
const config = require("./config.json");
const cd = require("color-difference");
const svgo = require("svgo");
const fs = require("fs");
const path = require("path");
const { getHardcodedCurrentPlan } = require("./site_routes/utils");
const serverUrl = config.BASE_URL;
const { createCanvas, registerFont } = require("canvas");

const svgOutputSettings = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          inlineStyles: {
            onlyMatchedOnce: false,
          },
          convertPathData: false,
          mergePaths: false,
        },
      },
    },
    {
      name: "convertStyleToAttrs",
    },
  ],
};
const SS = require("sunrise-sunset-js");
const locations = {
  10952: {
    lat: 41.11787,
    lng: -74.08205,
  },
  10977: {
    lat: 41.11556,
    lng: -74.04762,
  },
  10950: {
    lat: 41.31839,
    lng: -74.20634,
  },
  12701: {
    lat: 41.65566,
    lng: -74.73973,
  },
  11219: {
    lat: 40.63339,
    lng: -73.99677,
  },
  11205: {
    lat: 40.69437,
    lng: -73.96587,
  },
  9103401: {
    lat: 31.7683,
    lng: 35.2137,
  },
  08701: {
    lat: 40.07211,
    lng: -74.20498,
  },
};
const Hebcal = require("hebcal");

module.exports = {
  getCategories,
  getTemplates,
  getColors,
  getLogos,
  getImages,
  getFonts,
  getCustomizationObjectClasses,
  getCustomizationObject,
  getToken,
  getProjects,
  getProject,
  createProject,
  newExportJob,
  getExportJob,
  getBrandObject,
  getSingleBrandObject,
  getOptimizedSVG,
  replaceSvgSetting,
};

async function getToken(user) {
  let form = {
    grant_type: "password",
    client_id: config.huddle.client_id,
    client_secret: config.huddle.client_secret,
    username: user.account.huddle_email,
  };

  if (user.account.unarchive_huddle_user) {
    form.account_status = "active";
    form.user_status = "active";
  }

  return rp({
    method: "post",
    url: `https://prettysmart.designhuddle.com/oauth/token`,
    form: form,
    json: true,
  });
}

async function getCategories(user) {
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/template/categories`,
    headers: {
      Authorization: `Bearer ${user.token.access_token}`,
    },
    json: true,
  });
}

async function getTemplates(options) {
  if (!options.size) {
    options.size = {};
  }

  if (!options.event) {
    options.event = {};
  }

  let qs = {
    width: options.size.width,
    height: options.size.height,
    limit: options.limit,
  };

  if (options.page) {
    qs.page = options.page;
  }

  if (options.category) {
    qs.primary_template_category_item_id = options.category;
  }

  if (options.ids) {
    qs.primary_template_category_item_ids = options.ids;
  }

  if (options.search) {
    qs.search = options.search;
  }

  try {
    if (options.event._id) {
      let categories = await getCategories(options.user);
      let subCategories = categories.data.items[0].template_category_items;
      let keysCategoryId = subCategories.find((category) => {
        let eventName = options.event.name;

        if (options.form_file) {
          eventName += " Image";
        }

        return category.item_name.toLowerCase() === eventName.toLowerCase();
      });
      if (keysCategoryId) {
        qs.primary_template_category_item_id =
          keysCategoryId.template_category_item_id;
      }
    }
  } catch (error) {
    console.log(error);
  }

  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/gallery/templates`,
    qs: qs,
    headers: {
      Authorization: `Bearer ${options.user.token.access_token}`,
    },
    json: true,
  });
}

async function getColors(user) {
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/colors`,
    headers: {
      Authorization: `Bearer ${user.token.access_token}`,
    },
    json: true,
  });
}

async function getLogos(user) {
  let links = await rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/logos`,
    headers: {
      Authorization: `Bearer ${user.token.access_token}`,
    },
    json: true,
  });

  if (links.data.items.length) {
    links.data.items.forEach(async (logo) => {
      let logoSvg = await rp({
        method: "get",
        url: logo.thumbnail_url,
        headers: {
          Authorization: `Bearer ${user.token.access_token}`,
        },
      });

      let optimizedSvg = await svgo.optimize(logoSvg, svgOutputSettings);

      logo.thumbnail_url = "data:image/svg+xml;utf8," + optimizedSvg.data;
    });
  }

  return links;
}

async function getImages(user) {
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/photos`,
    headers: {
      Authorization: `Bearer ${user.token.access_token}`,
    },
    json: true,
  });
}

async function getFonts(user) {
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/fonts`,
    headers: {
      Authorization: `Bearer ${user.token.access_token}`,
    },
    json: true,
  });
}

async function getProjects(options) {
  let qs = {
    limit: options.limit,
  };

  if (options.page) {
    qs.page = options.page;
  }

  let project = await rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/projects`,
    headers: {
      Authorization: `Bearer ${options.user.token.access_token}`,
    },
    qs: qs,
    json: true,
  });
  return project;
}

async function getProject(options) {
  let project = await rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/projects/${options.id}`,
    headers: {
      Authorization: `Bearer ${options.user.token.access_token}`,
    },
    json: true,
  });
  return project;
}

async function createProject(options) {
  let project = await rp({
    method: "post",
    url: `https://prettysmart.designhuddle.com/api/projects/${options.id}`,
    headers: {
      Authorization: `Bearer ${options.user.token.access_token}`,
    },
    body: {
      customizations_hash: options.project,
      template_id: options.template,
    },
    json: true,
  });
  return project;
}

async function newExportJob(options) {
  let new_job = await rp({
    method: "post",
    url: `https://prettysmart.designhuddle.com/api/projects/${options.project}/export`,
    headers: {
      Authorization: `Bearer ${options.user.token.access_token}`,
    },
    body: {
      format: options.format || "pdf",
      filename: options.filename,
      cropmarks: options.cropmarks,
    },
    json: true,
  });

  return new_job;
}

async function getExportJob(options) {
  let job_export = await rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/api/projects/${options.project}/export/jobs/${options.job}`,
    headers: {
      Authorization: `Bearer ${options.user.token.access_token}`,
    },
    json: true,
  });

  return job_export;
}

async function getCustomizationObjectClasses(assets, user) {
  let dynamic_color_classes = {
    primary_on_secondary: getColor("primary", 0, "secondary"),
    secondary_on_primary: getColor("secondary", 0, "primary"),
    primary_on_black: getColor("primary", 0, "#000000", "secondary"),
    primary_on_white: getColor("primary", 0, "#ffffff", "secondary"),
    secondary_on_black: getColor("secondary", 0, "#000000", "primary"),
    secondary_on_white: getColor("secondary", 0, "#ffffff", "primary"),
    light_color: getLighterColor("primary", "secondary"),
    dark_color: getDarkerColor("primary", "secondary"),
    white: "#ffffff",
    black: "#000000",
  };

  let classes = {
    auto_fit: {
      auto_fit: true,
    },
    primary_color: {
      color: getColor("primary", 0),
      stroke: {
        color: getColor("primary", 0),
      },
    },
    secondary_color: {
      color: getColor("secondary", 0),
      stroke: {
        color: getColor("secondary", 0),
      },
    },
    horizontal_align_left: {
      position_relative_to_original: {
        horizontal_align: "left",
      },
    },
    horizontal_align_right: {
      position_relative_to_original: {
        horizontal_align: "right",
      },
    },
    horizontal_align_center: {
      position_relative_to_original: {
        horizontal_align: "center",
      },
    },
    vertical_align_top: {
      position_relative_to_original: {
        vertical_align: "top",
      },
    },
    vertical_align_bottom: {
      position_relative_to_original: {
        vertical_align: "bottom",
      },
    },
    vertical_align_center: {
      position_relative_to_original: {
        vertical_align: "center",
      },
    },
  };

  if (getHardcodedCurrentPlan(user.account.plan_id) === "Free") {
    classes.freemark = {
      url: encodeURI(serverUrl + "/static/images/watermark.png"),
    };
  }

  for (let dc in dynamic_color_classes) {
    classes[dc] = {
      color: dynamic_color_classes[dc],
      stroke: {
        color: dynamic_color_classes[dc],
      },
    };
  }

  if (assets.default_colors) {
    assets.default_colors.forEach((color) => {
      classes[color.class.toLowerCase()] = {
        color: "#" + color.description.replace("#", ""),
      };
    });
  }

  if (assets.logos.length) {
    assets.logos.forEach((logo) => {
      let logo_name = logo.logo_name.toLowerCase();

      classes[logo_name] = {
        url: logo.thumbnail_url,
      };

      for (let dc in dynamic_color_classes) {
        let replaceFill = replaceSvgSetting(
          logo.thumbnail_url,
          "fill",
          dynamic_color_classes[dc]
        );
        let replaceStroke = replaceSvgSetting(
          replaceFill,
          "stroke",
          dynamic_color_classes[dc]
        );
        classes[logo_name + "_" + dc] = {
          url: replaceStroke,
        };
      }

      if (assets.default_logos) {
        let default_logo = assets.default_logos.filter((dl) => {
          return dl.class.startsWith(logo_name);
        });

        default_logo.forEach((dl) => {
          let replacmentColor = dl.brand_class
            ? getColor(dl.brand_class, 0)
            : dl.description;

          let replaceFill = replaceSvgSetting(
            logo.thumbnail_url,
            "fill",
            replacmentColor
          );
          let replaceStroke = replaceSvgSetting(
            replaceFill,
            "stroke",
            replacmentColor
          );

          classes[dl.class.toLowerCase()] = {
            url: replaceStroke,
          };
        });
      }
    });
  }

  if (assets.fonts.length) {
    let brandFonts = user.account.brand.fonts;
    let regularFont = assets.fonts.find((font) => {
      return font.font_faces.Regular;
    });
    let italicFont = assets.fonts.find((font) => {
      return font.font_faces.Italic;
    });
    let boldFont = assets.fonts.find((font) => {
      return font.font_faces.Bold;
    });
    let boldItalicFont = assets.fonts.find((font) => {
      return font.font_faces.BoldItalic;
    });

    if (regularFont) {
      classes.font = {
        font: {
          family: regularFont.font_family_name,
        },
      };
    } else {
      classes.font = { font: { family: "Poppins" } };
    }

    if (boldFont) {
      classes.font_bold = {
        font: {
          family: boldFont.font_family_name,
          bold: true,
        },
      };
    } else {
      classes.font_bold = { font: { family: "Poppins", bold: true } };
    }

    if (italicFont) {
      classes.font_italic = {
        font: {
          family: italicFont.font_family_name,
          italic: true,
        },
      };
    } else {
      classes.font_italic = { font: { family: "Poppins", italic: true } };
    }

    if (boldItalicFont) {
      classes.font_bold_italic = {
        font: {
          family: boldItalicFont.font_family_name,
          italic: true,
          bold: true,
        },
      };
    } else {
      classes.font_bold_italic = {
        font: { family: "Poppins", italic: true, bold: true },
      };
    }
  } else {
    classes.font = { font: { family: "Poppins" } };
    classes.font_bold = { font: { family: "Poppins", bold: true } };
    classes.font_italic = { font: { family: "Poppins", italic: true } };
    classes.font_bold_italic = {
      font: { family: "Poppins", italic: true, bold: true },
    };
  }

  if (assets.content) {
    let content = assets.content;
    for (cls in content) {
      classes[cls.toLowerCase()] = {
        text: content[cls],
      };

      if (assets.font_classes) {
        let fontClasses = assets.font_classes.filter(
          (fc) => fc.text_class === cls.toLowerCase()
        );
        if (fontClasses) {
          await Promise.all(
            fontClasses.map(async (fontClass) => {
              const { text_class, name } = fontClass;
              try {
                const font_size = await getFontSizesWithDynamic(
                  user,
                  fontClass,
                  content[cls]
                );
                if (font_size) {
                  classes[`${text_class}_${name}`] = {
                    font_size,
                  };
                }
              } catch (e) {}
            })
          );
        }
      }
    }
  }

  if (assets.custom_content) {
    await Promise.all(
      assets.custom_content.map(async (custom_cls) => {
        if (custom_cls.content_classes) {
          await Promise.all(
            custom_cls.content_classes.map(async function (cls) {
              try {
                let templateFn = _.template(cls.content.trim(), {
                  interpolate: /\{\{(.+?)\}\}/g,
                });
                let templateData = user;
                templateData.AI = user.account.AI || {};
                templateData.HC = HC;
                let text = templateFn(templateData);
                classes[cls.index] = {
                  text,
                };

                if (assets.font_classes) {
                  let fontClasses = assets.font_classes.filter(
                    (fc) => fc.text_class === cls.index
                  );
                  if (fontClasses) {
                    await Promise.all(
                      fontClasses.map(async (fontClass) => {
                        const { text_class, name } = fontClass;
                        try {
                          const font_size = await getFontSizesWithDynamic(
                            user,
                            fontClass,
                            text
                          );
                          if (font_size) {
                            classes[`${text_class}_${name}`] = {
                              font_size,
                            };
                          }
                        } catch (e) {}
                      })
                    );
                  }
                }
              } catch (error) {}
            })
          );
        }
      })
    );
  }

  if (assets.content && assets.content.form_file) {
    classes.image = {
      masked_media: {
        url: encodeURI(assets.content.form_file),
      },
    };
  }

  if (assets.user_fields) {
    await Promise.all(
      assets.user_fields.map(async (field) => {
        let text = _.get(user, field.field);
        classes[field.class] = {
          text,
        };

        if (assets.font_classes) {
          let fontClasses = assets.font_classes.filter(
            (fc) => fc.text_class === field.class
          );
          if (fontClasses) {
            await Promise.all(
              fontClasses.map(async (fontClass) => {
                const { text_class, name } = fontClass;
                try {
                  const font_size = await getFontSizesWithDynamic(
                    user,
                    fontClass,
                    text
                  );
                  if (font_size) {
                    classes[`${text_class}_${name}`] = {
                      font_size,
                    };
                  }
                } catch (e) {}
              })
            );
          }
        }
      })
    );
  }

  if (user && user.user_title) {
    classes.user_title = {
      text: user.user_title,
    };

    if (assets.font_classes) {
      let fontClasses = assets.font_classes.filter(
        (fc) => fc.text_class === "user_title"
      );
      if (fontClasses) {
        await Promise.all(
          fontClasses.map(async (fontClass) => {
            const { text_class, name } = fontClass;
            try {
              const font_size = await getFontSizesWithDynamic(
                user,
                fontClass,
                user.user_title
              );
              if (font_size) {
                classes[`${text_class}_${name}`] = {
                  font_size,
                };
              }
            } catch (e) {}
          })
        );
      }
    }
  }

  if (user && user.user_additional) {
    classes.user_additional = {
      text: user.user_additional,
    };

    if (assets.font_classes) {
      let fontClasses = assets.font_classes.filter(
        (fc) => fc.text_class === "user_additional"
      );
      if (fontClasses) {
        await Promise.all(
          fontClasses.map(async (fontClass) => {
            const { text_class, name } = fontClass;
            try {
              const font_size = await getFontSizesWithDynamic(
                user,
                fontClass,
                user.user_additional
              );
              if (font_size) {
                classes[`${text_class}_${name}`] = {
                  font_size,
                };
              }
            } catch (e) {}
          })
        );
      }
    }
  }

  if (user && user.avatar) {
    let avatarUrl = encodeURI(serverUrl + user.avatar);
    let local_path = path.join(__dirname, "." + user.avatar);

    if (fs.existsSync(local_path)) {
      classes.user_avatar = {
        masked_media: {
          url: avatarUrl,
        },
      };
    }
  }

  if (user && user.account && user.account.brand_footer) {
    classes.brand_footer = {
      text: user.account.brand_footer,
    };

    if (assets.font_classes) {
      let fontClasses = assets.font_classes.filter(
        (fc) => fc.text_class === "brand_footer"
      );
      if (fontClasses) {
        await Promise.all(
          fontClasses.map(async (fontClass) => {
            const { text_class, name } = fontClass;
            try {
              const font_size = await getFontSizesWithDynamic(
                user,
                fontClass,
                user.account.brand_footer
              );
              if (font_size) {
                classes[`${text_class}_${name}`] = {
                  font_size,
                };
              }
            } catch (e) {}
          })
        );
      }
    }
  }

  if (assets.unsplash_images) {
    assets.unsplash_images.forEach((field) => {
      classes[field.class] = {
        masked_media: {
          url: encodeURI(field.url),
        },
      };
    });
  }

  if (assets.icons) {
    assets.icons.forEach((field) => {
      classes[field.class] = {
        url: field.url,
      };

      for (let dc in dynamic_color_classes) {
        let replaceFill = replaceSvgSetting(
          field.url,
          "fill",
          dynamic_color_classes[dc]
        );
        classes[field.class + "_" + dc] = {
          url: replaceFill,
        };
      }
    });
  }

  if (assets.vectors) {
    assets.vectors.forEach((field) => {
      classes[field.class] = {
        url: field.url,
      };

      for (let dc in dynamic_color_classes) {
        classes[field.class + "_" + dc] = {
          masked_media: {
            url: encodeURI(field.url),
          },
        };
      }
    });
  }

  if (assets.news) {
    classes.news_title = {
      text: assets.news.title,
    };
    classes.news_body = {
      text: assets.news.body,
    };
    classes.news_source = {
      text: assets.news.source,
    };

    if (assets.news.media) {
      classes.news_image = {
        masked_media: {
          url: encodeURI(assets.news.media),
        },
      };
    }

    if (assets.font_classes) {
      await Promise.all(
        Object.keys(assets.news).map(async (key) => {
          let fontClasses = assets.font_classes.filter(
            (fc) => fc.text_class === "news_" + key
          );
          if (fontClasses) {
            await Promise.all(
              fontClasses.map(async (fontClass) => {
                const { text_class, name } = fontClass;
                try {
                  const font_size = await getFontSizesWithDynamic(
                    user,
                    fontClass,
                    assets.news[key]
                  );
                  if (font_size) {
                    classes[`${text_class}_${name}`] = {
                      font_size,
                    };
                  }
                } catch (e) {}
              })
            );
          }
        })
      );
    }
  }

  if (assets.articles) {
    await Promise.all(
      assets.articles.map(async (art, index) => {
        if (art.title) {
          classes[`mu_title_${index + 1}`] = {
            text: art.title,
          };
        }
        // classes[`mu_${index + 1}`] = {
        //   text: art.body,
        // };
        if (art.source) {
          classes[`mu_source_${index + 1}`] = {
            text: art.source,
          };
        }
        if (art.image) {
          classes[`mu_image_${index + 1}`] = {
            masked_media: {
              url: encodeURI(art.image),
            },
          };
        }

        if (assets.font_classes) {
          await Promise.all(
            Object.keys(art).map(async (key) => {
              let fontClasses = assets.font_classes.filter(
                (fc) => fc.text_class.replace("_index", "") === "mu_" + key
              );

              if (fontClasses) {
                await Promise.all(
                  fontClasses.map(async (fontClass) => {
                    const { text_class, name } = fontClass;
                    try {
                      const font_size = await getFontSizesWithDynamic(
                        user,
                        fontClass,
                        art[key]
                      );
                      if (font_size) {
                        classes[
                          `${text_class.replace("_index", "")}_${
                            index + 1
                          }_${name}`
                        ] = {
                          font_size,
                        };
                      }
                    } catch (e) {}
                  })
                );
              }
            })
          );
        }
      })
    );
  }

  if (assets.rates) {
    const rate_titles = {
      "30fixed": "30 Yr. Fixed",
      "15fixed": "15 Yr. Fixed",
      "30fha": "30 Yr. FHA",
      "51arm": "5/1 ARM",
    };
    let keys = Object.keys(rate_titles);

    await Promise.all(
      assets.rates.map(async (r, index) => {
        let titleIndex = Object.values(rate_titles).indexOf(r.title);

        classes[`${keys[titleIndex]}`] = {
          text: r.title,
        };
        classes[`${keys[titleIndex]}_rate`] = {
          text: r.rate,
        };
        classes[`${keys[titleIndex]}_change`] = {
          text: r.change,
        };

        classes[`${keys[titleIndex]}_range`] = {
          url: r.range,
        };

        if (titleIndex === 0) {
          if (r.small_chart)
            classes[`30fixed_svg`] = {
              url: r.small_chart,
            };
        }

        if (r.large_chart) {
          classes[`30fixed_chart`] = {
            masked_media: {
              url: r.large_chart,
            },
          };
        }

        if (assets.font_classes) {
          await Promise.all(
            Object.keys(r).map(async (key) => {
              let fontClasses = assets.font_classes.filter(
                (fc) =>
                  fc.text_class === `${keys[titleIndex]}_` + key ||
                  fc.text_class === `${keys[titleIndex]}` // this is for title that we don't use the _title
              );
              if (fontClasses) {
                await Promise.all(
                  fontClasses.map(async (fontClass) => {
                    const { text_class, name } = fontClass;
                    try {
                      const font_size = await getFontSizesWithDynamic(
                        user,
                        fontClass,
                        r[key]
                      );
                      if (font_size) {
                        classes[`${text_class}_${name}`] = {
                          font_size,
                        };
                      }
                    } catch (e) {}
                  })
                );
              }
            })
          );
        }
      })
    );
  }

  if (assets.reviews && assets.reviews.length > 0) {
    await Promise.all(
      assets.reviews.map(async (review, index) => {
        classes[`review_text_${index + 1}`] = {
          text: removeEmojis(review.text),
        };
        classes[`review_author_${index + 1}`] = {
          text: review.author_name,
        };
        classes[`review_profile_${index + 1}`] = {
          masked_media: {
            url: encodeURI(review.profile_photo_url),
          },
        };

        if (assets.font_classes) {
          await Promise.all(
            Object.keys(review).map(async (key) => {
              let fontClasses = assets.font_classes.filter(
                (fc) =>
                  fc.text_class.replace("_index", "") === "review_" + key ||
                  fc.text_class === "review_author"
              );
              if (fontClasses) {
                await Promise.all(
                  fontClasses.map(async (fontClass) => {
                    const { text_class, name } = fontClass;
                    try {
                      const font_size = await getFontSizesWithDynamic(
                        user,
                        fontClass,
                        field[key]
                      );
                      if (font_size) {
                        classes[
                          `${text_class.replace("_index", "")}_${
                            index + 1
                          }_${name}`
                        ] = {
                          font_size,
                        };
                      }
                    } catch (e) {}
                  })
                );
              }
            })
          );
        }
      })
    );
  }

  if (assets.open_ai_content) {
    await Promise.all(
      assets.open_ai_content.map(async (field) => {
        if (field.url) {
          if (field.svg) {
            let newUrl;
            if (field.noWhiteSpace) {
              newUrl = field.url;
            } else {
              newUrl = removeWhiteSpace(field.url);
            }
            classes[field.class] = {
              url: newUrl,
            };

            for (let dc in dynamic_color_classes) {
              let replaceFill = replaceSvgSetting(
                newUrl,
                "fill",
                dynamic_color_classes[dc]
              );
              classes[field.class + "_" + dc] = {
                url: replaceFill,
              };
            }
          } else {
            if (field.vector) {
              classes[field.class] = {
                url: encodeURI(field.url),
              };
            } else {
              classes[field.class] = {
                masked_media: {
                  url: encodeURI(field.url),
                },
              };
            }
          }
        } else {
          classes[field.class] = {
            text: field.text,
          };

          if (assets.font_classes && field.class) {
            let fontClasses = assets.font_classes.filter(
              (fc) => fc.text_class === field.class.replace(/[0-9]/g, "index")
            );
            if (fontClasses) {
              await Promise.all(
                fontClasses.map(async (fontClass) => {
                  const { text_class, name } = fontClass;
                  try {
                    const font_size = await getFontSizesWithDynamic(
                      user,
                      fontClass,
                      field.text
                    );
                    if (font_size) {
                      classes[`${field.class}_${name}`] = {
                        font_size,
                      };
                    }
                  } catch (e) {}
                })
              );
            }
          }
        }
      })
    );
  }

  if (assets.random_quotes) {
    await Promise.all(
      assets.random_quotes.map(async (field, index) => {
        if (field.name) {
          classes[`quote_${index + 1}_title`] = {
            text: field.name,
          };
        }

        if (field.content) {
          classes[`quote_${index + 1}_content`] = {
            text: field.content,
          };
        }

        if (field.image) {
          classes[`quote_${index + 1}_image`] = {
            masked_media: {
              url: encodeURI(field.image),
            },
          };
        }

        if (assets.font_classes) {
          await Promise.all(
            Object.keys(field).map(async (key) => {
              let fontClasses = assets.font_classes.filter(
                (fc) =>
                  fc.text_class.replace("_index_", "") ===
                  "quote_" + key.replace("name", "title")
              );
              if (fontClasses) {
                await Promise.all(
                  fontClasses.map(async (fontClass) => {
                    const { text_class, name } = fontClass;
                    try {
                      const font_size = await getFontSizesWithDynamic(
                        user,
                        fontClass,
                        field[key]
                      );
                      if (font_size) {
                        classes[
                          `${text_class.replace("_index_", "")}_${
                            index + 1
                          }_${name}`
                        ] = {
                          font_size,
                        };
                      }
                    } catch (e) {}
                  })
                );
              }
            })
          );
        }
      })
    );
  }

  return classes;

  function getColor(top, _index, bottom, fallback) {
    let topColors = assets.colors.find((color) => {
      return color.color_palette_name.trim().toLowerCase().includes(top);
    });
    let index = _index || 0;
    let hex = topColors ? topColors.colors[index] : undefined;

    if (topColors && bottom) {
      let bottomColors = assets.colors.find((color) => {
        return color.color_palette_name.trim().toLowerCase().includes(bottom);
      });
      if (bottomColors) {
        let pass = colorPass(
          topColors.colors[index],
          bottomColors.colors[index]
        );
        //let diff = cd.compare(topColors.colors[index], bottomColors.colors[index]);

        if (!pass) {
          // if(diff <= 85){
          let brightnes = lightOrDark(bottomColors.colors[index]);

          if (brightnes === "light") {
            hex = "#000000";
          } else {
            hex = "#ffffff";
          }
        }
      } else if (fallback) {
        //let topDiff = cd.compare(topColors.colors[index], bottom);
        let pass = colorPass(topColors.colors[index], bottom);

        // if(topDiff < 82){
        if (!pass) {
          let bottomColors = assets.colors.find((color) => {
            return color.color_palette_name
              .trim()
              .toLowerCase()
              .includes(fallback);
          });
          let fallBackBrightnes = lightOrDark(bottom);

          if (bottomColors) {
            //let bottomDiff = cd.compare(bottom, bottomColors.colors[index]);
            let bottomPass = colorPass(bottom, bottomColors.colors[index]);

            if (fallBackBrightnes === "light") {
              // if(bottomDiff < 82){
              if (!bottomPass) {
                hex = "#000000";
              } else {
                hex = bottomColors.colors[index];
              }
            }

            if (fallBackBrightnes === "dark") {
              // if(bottomDiff < 82){
              if (!bottomPass) {
                hex = "#ffffff";
              } else {
                hex = bottomColors.colors[index];
              }
            }
          }
        }
      }
    }

    return hex;
  }

  function getDarkerColor(top, bottom, _index) {
    let topColors = assets.colors.find((color) => {
      return color.color_palette_name.trim().toLowerCase().includes(top);
    });
    let bottomColors = assets.colors.find((color) => {
      return color.color_palette_name.trim().toLowerCase().includes(bottom);
    });
    let index = _index || 0;

    if (topColors && bottomColors) {
      let topLuminance = luminance(hexToRgb(topColors.colors[index]));
      let botomLuminance = luminance(hexToRgb(bottomColors.colors[index]));
      if (topLuminance < botomLuminance) {
        return topColors.colors[index];
      } else {
        return bottomColors.colors[index];
      }
    } else {
      return undefined;
    }
  }

  function getLighterColor(top, bottom, _index) {
    let topColors = assets.colors.find((color) => {
      return color.color_palette_name.trim().toLowerCase().includes(top);
    });
    let bottomColors = assets.colors.find((color) => {
      return color.color_palette_name.trim().toLowerCase().includes(bottom);
    });
    let index = _index || 0;

    if (topColors && bottomColors) {
      let topLuminance = luminance(hexToRgb(topColors.colors[index]));
      let botomLuminance = luminance(hexToRgb(bottomColors.colors[index]));
      if (topLuminance > botomLuminance) {
        return topColors.colors[index];
      } else {
        return bottomColors.colors[index];
      }
    } else {
      return undefined;
    }
  }
}

async function getCustomizationObject(classes, user) {
  await rp({
    method: "post",
    url: `https://prettysmart.designhuddle.com/api/template/customization-objects`,
    headers: {
      Authorization: `Bearer ${user.token.access_token}`,
    },
    body: {
      object: {
        classes: classes,
      },
    },
    json: true,
  });
}

function replaceSvgSetting(svg, key, val) {
  let newSvg = svg;
  if (svg.indexOf(key) > -1) {
    let regex = new RegExp(`${key}=".*?"`, "g");
    newSvg = svg.replace(regex, `${key}="${val}"`); // `fill="${val}"`
  } else {
    const split = svg.split("<svg");
    if (split && split.length > 1) {
      if (!split[1].includes("fill")) {
        // check if we have defined fill on main svg attr
        newSvg = svg.replace("viewBox", `fill="${val}" viewBox`);
      }
    }
  }

  return newSvg;
}

function removeWhiteSpace(svg) {
  let newSvg = svg;
  let regex = new RegExp(`viewBox=".*?"`, "g");
  newSvg = svg.replace(regex, `viewBox="8.8 13.99 85.88 70.36"`);
  return newSvg;
}

function lightOrDark(color) {
  // Variables for red, green, blue values
  var r, g, b, hsp;

  // Check the format of the color, HEX or RGB?
  if (color.match(/^rgb/)) {
    // If RGB --> store the red, green, blue values in separate variables
    color = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/
    );

    r = color[1];
    g = color[2];
    b = color[3];
  } else {
    // If hex --> Convert it to RGB: http://gist.github.com/983661
    color = +("0x" + color.slice(1).replace(color.length < 5 && /./g, "$&$&"));

    r = color >> 16;
    g = (color >> 8) & 255;
    b = color & 255;
  }

  // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
  hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

  // Using the HSP value, determine whether the color is light or dark
  if (hsp > 127.5) {
    return "light";
  } else {
    return "dark";
  }
}

function hexToRgb(hex) {
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

function luminance(rgb) {
  var a = rgb.map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrast(rgb1, rgb2) {
  const luminanceFront = luminance(rgb1);
  const luminanceBack = luminance(rgb2);
  return luminanceBack > luminanceFront
    ? (luminanceFront + 0.05) / (luminanceBack + 0.05)
    : (luminanceBack + 0.05) / (luminanceFront + 0.05);
}

function colorPass(color1, color2) {
  const ratio = contrast(hexToRgb(color1), hexToRgb(color2));
  //return ratio < 0.14285 ? true : false;
  return ratio < 0.22222 ? true : false;
}

function HC(zip) {
  const day = new Hebcal.HDate();
  const hc = {};
  if (zip && locations[zip]) {
    const location = locations[zip];
    day.setLocation(location.lat, location.lng);

    hc.parsha = day.getParsha().join("/");
    hc.sunset = (weekDay, minutAdjustment) => {
      let sunset = SS.getSunset(
        location.lat,
        location.lng,
        getNextDayOfWeek(weekDay)
      );
      if (minutAdjustment) {
        let minutes = sunset.getMinutes();
        sunset.setMinutes(minutes + minutAdjustment);
      }

      sunset = sunset.toLocaleTimeString().split(":");
      return `${sunset[0]}:${sunset[1]}`;
    };
  }

  return hc;
}

function getNextDayOfWeek(dayOfWeek) {
  if (!dayOfWeek && dayOfWeek !== 0) {
    return new Date();
  }

  const date = new Date();
  const resultDate = new Date(date.getTime());

  resultDate.setDate(date.getDate() + ((7 + dayOfWeek - date.getDay()) % 7));

  return resultDate;
}

async function getBrandObject(account) {
  let brand = account.brand ? account.brand.toJSON() : {};

  for (let item in brand.logos) {
    try {
      brand.logos[item] = await getSingleBrandObject(
        brand.logos[item],
        account
      );
    } catch (error) {}
  }

  return brand;
}

async function getOptimizedSVG(svg, brand) {
  svg = await svgo.optimize(svg, svgOutputSettings).data;

  let classStyleFill = new RegExp("cls-.*?;}", "g");
  let classStyleMatches = svg.match(classStyleFill); //[ 'cls-1{fill:#fe5e15;}', 'cls-2{fill:#131545;}' ]
  if (classStyleMatches && classStyleMatches.length) {
    let classes = classStyleMatches.map((cs) => {
      let classReg = new RegExp("cls-.*?{", "g");
      let classMatches = svg.match(classReg); // [ 'cls-1{', 'cls-2{' ]
      classMatches = classMatches.map((c) => c.replace("{", ""));

      let fillReg = new RegExp("fill:.*?;}", "g");
      let fillMatches = svg.match(fillReg); // [ 'fill:#fe5e15;}', 'fill:#131545;}' ]
      fillMatches = fillMatches.map((f) =>
        f.replace("fill:", "").replace(";}", "")
      );

      if (
        classMatches &&
        classMatches.length &&
        fillMatches &&
        fillMatches.length === classMatches.length
      ) {
        classMatches.map((cm, index) => {
          let classesReg = new RegExp(`class="${cm}"`, "g");
          svg = svg.replace(classesReg, `fill="${fillMatches[index]}"`);
        });
      }
    });
  }

  // remove g and defs tags to remove masks
  let openG = new RegExp("<g.*?>", "g");
  let closeG = new RegExp(`</g.*?>`, "g");
  svg = svg.replace(openG, "");
  svg = svg.replace(closeG, "");

  let defs = new RegExp(`<defs.*?defs>`, "g");
  svg = svg.replace(defs, "");

  // If is all white then use primary color
  let fills = new RegExp(`fill=".*?"`, "g");
  let matches = svg.match(fills);

  let allWhite =
    matches &&
    matches.filter((match) => {
      return (
        match.includes('"#fff"') ||
        match.includes('"#ffffff"') ||
        match.includes('"white"') ||
        match.includes('"rgba(255, 255, 255, 1)"') ||
        match.includes('"rgb(255, 255, 255)"') ||
        match.includes('"rgba(255,255,255,1)"') ||
        match.includes('"rgb(255,255,255)"')
      );
    }).length === matches.length;

  if (allWhite) {
    svg = svg.replace(
      fills,
      `fill="${(brand && brand.colors && brand.colors.primary) || "000000"}"`
    );
  }

  // to split single path use svg.match("d=".*?"")
  //d.replace("M", '"></path><path d=M"')

  return svg;
}

async function getSingleBrandObject(item, account) {
  return new Promise((resolve, reject) => {
    getAsyncSvgFromImage(
      path.join(__dirname, `files/${account._id}/logos/${item}`),
      async (data, error) => {
        if (data) {
          item = data;

          let optimizedSvg = await svgo.optimize(item, svgOutputSettings);
          item = optimizedSvg.data;

          // item = additionalCleanup(item);

          resolve(item);
        } else {
          reject(error);
        }
      }
    );
  });
}

function additionalCleanup(svg) {
  // remove width and height attr
  let wRegex = new RegExp(`width=".*?"`, "g");
  let hRegex = new RegExp(`height=".*?"`, "g");
  svg = svg.replace(wRegex, "");
  svg = svg.replace(hRegex, "");

  return svg;
}

async function getSvgFromImage(path) {
  let data = fs.readFileSync(path);
  return data.toString();
}

async function getAsyncSvgFromImage(path, cb) {
  fs.readFile(path, (err, data) => {
    if (err) {
      console.log(err);
      if (cb) {
        cb(null, err);
      }
    } else {
      let file_content = data.toString();
      if (cb) {
        cb(file_content, null);
      }
    }
  });
}

function removeEmojis(str) {
  return str.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    ""
  );
}

async function getFontSizesWithDynamic(user, fontRules, text) {
  try {
    const { font_class, width, height, line_space } = fontRules;

    const isCap = font_class.includes("cap");
    const isItalic = font_class.includes("italic");
    const isBold = font_class.includes("bold");

    const hasCustom = font_class.includes("custom");

    let fullFontPath = "";
    let fontName = "";

    if (hasCustom) {
      let split = font_class.split("custom_");
      if (split && split.length > 1) {
        fontName = split[1].charAt(0).toUpperCase() + split[1].slice(1);
        fullFontPath = path.join(__dirname, `custom-fonts/${fontName}.ttf`);
      }
    } else {
      const prefFontType =
        isItalic && isBold
          ? "BoldItalic"
          : isItalic
          ? "Italic"
          : isBold
          ? "Bold"
          : "Regular";

      let brand = user.account.brand;

      fontName =
        brand &&
        brand.fonts &&
        brand.fonts[prefFontType] &&
        brand.fonts[prefFontType].name;

      let fontPath =
        brand &&
        brand.fonts &&
        brand.fonts[prefFontType] &&
        brand.fonts[prefFontType].path;
      let isGoogleFont =
        brand &&
        brand.fonts &&
        brand.fonts[prefFontType] &&
        brand.fonts[prefFontType].google;

      fullFontPath = isGoogleFont
        ? path.join(__dirname, `google-fonts/${fontPath}`)
        : path.join(__dirname, `files/${user.account.id}/fonts/${fontPath}`);
    }

    if (fs.existsSync(fullFontPath)) {
      try {
        registerFont(fullFontPath, {
          family: fontName,
        });
      } catch (e) {
        console.log(e);
      }
    }

    const font_size = await getDynamicFontSize({
      text: isCap ? text.toUpperCase() : text,
      fontVariants: `${isItalic ? "italic" : ""}${isItalic ? " " : ""}${
        isBold ? "bold" : ""
      }`,
      fontName: fontName || "Arial",
      maxWidth: parseInt(width),
      maxHeight: parseInt(height),
      lineHeight: parseFloat(line_space),
    });

    return font_size;
  } catch (e) {
    console.log(e);
  }
}

async function getDynamicFontSize({
  text,
  maxWidth = 770,
  maxHeight = 548,
  fontName = "Arial", // italic bold 10pt Courier
  fontVariants,
  fontSize = 120,
  lineHeight = 1.22,
}) {
  const finalLineHeight = lineHeight + 0.2; // needed for huddle lineHeight diffs
  return await new Promise((resolve, reject) => {
    try {
      const canvas = createCanvas(maxWidth, maxHeight);
      const ctx = canvas.getContext("2d");
      ctx.textBaseline = "top";
      ctx.font = `${fontVariants ? fontVariants + " " : ""}${String(
        fontSize
      )}px ${fontName}`;

      function getLines(ctx, text, maxWidth, maxHeight) {
        var words = text.split(" ");
        var lines = [];
        var currentLine = words[0];

        for (var i = 1; i < words.length; i++) {
          var word = words[i];
          var width = ctx.measureText(currentLine + " " + word).width;

          if (width < maxWidth) {
            currentLine += " " + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        lines.push(currentLine);
        return lines;
      }

      let lines = getLines(ctx, text, maxWidth, maxHeight);

      let pixelsLineHeight = finalLineHeight
        ? Math.floor(fontSize * finalLineHeight)
        : fontSize;

      function checkHeight() {
        var height = pixelsLineHeight * lines.length;

        if (height > maxHeight) {
          fontSize--;
          pixelsLineHeight = finalLineHeight
            ? Math.floor(fontSize * finalLineHeight)
            : fontSize;
          ctx.font = `${fontVariants ? fontVariants + " " : ""}${String(
            fontSize
          )}px ${fontName}`;
          lines = getLines(ctx, text, maxWidth, maxHeight);
          checkHeight();
        } else {
          let exceeds = lines.filter((line) => {
            var width = ctx.measureText(line).width;
            return width > maxWidth;
          });

          if (exceeds && exceeds.length) {
            fontSize--;
            pixelsLineHeight = finalLineHeight
              ? Math.floor(fontSize * finalLineHeight)
              : fontSize;
            ctx.font = `${fontVariants ? fontVariants + " " : ""}${String(
              fontSize
            )}px ${fontName}`;
            checkHeight();
            return;
          }

          for (var i = 0; i < lines.length; i++) {
            let y = i > 0 ? pixelsLineHeight * i : 0;
            ctx.fillText(lines[i], 0, y);
          }

          var splitFont = ctx.font.split(" ");
          splitFont = splitFont.find((sf) => sf.includes("px"));
          var fontArr = splitFont.match(/^(.*?)px/); // TODO: - change regex
          if (fontArr && fontArr.length) {
            resolve(parseInt(fontArr[1]));
          }
        }
      }

      checkHeight();
    } catch (e) {
      console.log(e);
    }
  });
}
