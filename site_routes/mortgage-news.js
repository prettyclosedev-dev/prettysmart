const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const fs = require("fs");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const path = require("path");
const rp = require("request-promise");
const cheerio = require("cheerio");
const Mercury = require("@postlight/mercury-parser");

module.exports = () => {
  router.get("/", async (req, res) => {
    db.pages.find(
      {
        type: "size",
      },
      async function (err, sizes) {
        sizes = _.orderBy(sizes, "order");
        let carouselQuery = getCarouselQuery(sizes);

        db.pages.find(carouselQuery, async function (err, rows) {
          await Promise.all(
            rows.map(async (row) => {
              let rowQuery = getQuery(req, row, sizes);
              let rowTemplates = await Huddle.getTemplates(rowQuery);
              let templateItems = rowTemplates.data.items;
              row.templates = templateItems;
              row.rowQuery = rowQuery;
            })
          );

          res.render("templates", {
            sizes: sizes,
            templates: _.orderBy(rows, "position"),
            row: { templates: [] },
            cache: true,
            filename: "templates",
            pageTitle: "Mortgage News",
            articles: await getArticles(),
          });
        });
      }
    );
  });

  return router;
};

function getQuery(req, row, sizes) {
  if (row.sizes && row.sizes.length) {
    row.sizes = row.sizes.map((size) => {
      return sizes.find((s) => s._id === size);
    });
  }

  let rowQuery = {
    user: req.user,
    category: row.templates_category,
  };

  if (row.sizes && row.sizes.length) {
    if (!row.default_size) {
      row.default_size = row.sizes[0]._id;
    }

    let default_size = row.sizes.find((size) => {
      return size._id === row.default_size;
    });

    if (default_size) {
      rowQuery.size = {
        width: default_size.width,
        height: default_size.height,
      };
    } else {
      rowQuery.size = {
        width: row.sizes[0].width,
        height: row.sizes[0].height,
      };
    }
  }

  if (row.default_tag) {
    rowQuery.search = row.default_tag;
  }

  return rowQuery;
}

function getCarouselQuery(sizes) {
  let today = new Date();

  let carouselQuery = {
    type: "carousel",
    templates_category: 56,
    $or: [
      {
        start_date: null,
        end_date: null,
      },
      {
        start_date: {
          $lte: today,
        },
        end_date: {
          $gte: today,
        },
      },
      {
        start_date: {
          $lte: today,
        },
        end_date: null,
      },
      {
        start_date: null,
        end_date: {
          $gte: today,
        },
      },
    ],
  };

  if (!global.isDev) {
    carouselQuery.isDev = {
      $ne: true,
    };
  }

  return carouselQuery;
}

async function getArticles() {
  let mBaseUrl = "https://www.mortgagenewsdaily.com";
  const data = await rp(mBaseUrl);

  if (!data) {
    return [];
  }

  let $ = cheerio.load(data);
  let links = [];
  $(".news-article-list.view-section")
    .find(".article.clearfix .article-content .article-title a")
    .each((index, elm) => {
      if (links.length < 4) {
        links.push($(elm).attr("href"));
      }
    });

  let articles = [];
  await Promise.all(
    links.map(async (link) => {
      let finalLink = link;
      if (finalLink.indexOf(mBaseUrl) === -1) {
        finalLink = mBaseUrl + link;
      }

      try {
        const response = await Mercury.parse(finalLink);
        if (!response || !response.content) {
          return;
        }

        $ = cheerio.load(response.content);
        var body = $("body:first").text();
        var finalText = body
          // .substr(0, 1800)
          .replace(/[^\w ]/, "-")
          .replace(/  |\r\n|\n|\r/gm, "-");
        articles.push({
          body: finalText,
          title: response.title,
          image: response.lead_image_url,
          source: response.domain,
        }); // response.excerpt
      } catch (e) {
        console.log(e);
      }
    })
  );
  return articles;
}
