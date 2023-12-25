const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const fs = require("fs");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const path = require("path");
const rp = require("request-promise");
const cheerio = require("cheerio");
const { createCanvas } = require("canvas");
const Fred = require("node-fred");

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
            pageTitle: "Mortgage Rates",
            rates: await getRates(req),
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
    templates_category: 57,
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

async function getRates(req) {
  const rate_titles = ["30 Yr. Fixed", "15 Yr. Fixed", "30 Yr. FHA", "5/1 ARM"];
  let mBaseUrl = "https://www.mortgagenewsdaily.com";
  let mBaseRatesUrl = mBaseUrl + "/mortgage-rates";
  const data = await rp(mBaseRatesUrl);
  let $ = cheerio.load(data);

  // var styles = data.match(/<style.*?>[\s\S]*?<\/style>/gi);
  // $("head").append(styles.join(""));

  let rates = [];

  await Promise.all(
    $(".body-content .rate-options")
      .find(".rate-product")
      .each(async (index, elm) => {
        let aElm = $(elm).find(".rate-product-name a");

        let rateTitle = $(aElm).text().trim().split("\n")[0];

        let titleIndex = rate_titles.indexOf(rateTitle);
        if (titleIndex > -1) {
          let link = $(aElm).attr("href");

          let rate = $(elm)
            .find(".clearfix .rate")
            .text()
            .trim()
            .split("\n")[0];
          let change = $(elm)
            .find(".clearfix .change")
            .text()
            .trim()
            .split("\n")[0];

          let rangeElm = $(elm).find(".clearfix .data-range .row");
          let rangeLow = rangeElm.find(".low").html();
          let rangeHigh = rangeElm.find(".high").html();
          let rateRange = rangeElm
            .find(".rate-range .range-border .range-area .current")
            .css();

          let rangeImg = getRangeSvg(
            rangeLow,
            rangeHigh,
            rateRange.left.replace("%", ""),
            req.user.account.brand
          );

          rates.push({
            title: rateTitle,
            rate,
            change,
            small_chart:
              titleIndex === 0
                ? mBaseUrl + $(".header-chart .chart img").attr("src")
                : "",
            small_chart_white: "",
            range: rangeImg,
            large_chart: "",
          });
        }
      })
  );

  let small_chart = "";
  if (rates.length) {
    small_chart = await rp(rates[0].small_chart);
    let small_chart_orig = small_chart.substring(small_chart.indexOf("<svg"));
    small_chart = small_chart_orig.replace(
      'preserveAspectRatio="none">',
      `preserveAspectRatio="none">\n<style>
              polyline.rate-better,polyline.rate-down{stroke:#4caf50}
              polyline.rate-worse,polyline.rate-up{stroke:#d32F2f}
              polyline.rate-unchanged,polyline.rate-unch{stroke:#bbb}
            </style>`
    );

    let small_chart_white = small_chart_orig.replace(
      'preserveAspectRatio="none">',
      `preserveAspectRatio="none">\n<style>
              polyline.rate-better,polyline.rate-down{stroke:white}
              polyline.rate-worse,polyline.rate-up{stroke:white}
              polyline.rate-unchanged,polyline.rate-unch{stroke:white}
            </style>`
    );

    rates[0].small_chart = "data:image/svg+xml;utf8," + small_chart;
    rates[0].small_chart_white = "data:image/svg+xml;utf8," + small_chart_white;
  }

  if (rates.length) {
    const large_chart_url = `https://shot.screenshotapi.net/screenshot?token=XYHPPPE-99SMX68-GCW1H91-STP42SA&url=https%3A%2F%2Fwww.mortgagenewsdaily.com%2Fcharts%2Fembed%2Fmnd-mtg-rates-30&full_page=true&fresh=true&output=json&file_type=png&wait_for_event=load`;
    const large_chart_data = await rp(large_chart_url);
    if (large_chart_data) {
      const toJson = JSON.parse(large_chart_data);
      if (toJson && toJson.screenshot) {
        rates[0].large_chart = toJson.screenshot;
      }
    }

    try {
      const fred = new Fred(config.fred.api_key);
      //https://fred.stlouisfed.org/graph/api/series/?obs=true&id=MORTGAGE30US&api_key=cc65811f7f5ca4a97848ce040646c8f5
      const res = await fred.series.getObservationsForSeries("MORTGAGE30US", {
        units: "lin",
      });
      if (res && res.observations && res.observations.length) {
        rates[0].large_chart_data = res.observations
      }
    } catch(e) {
      console.log(e)
    }
  }

  return rates;
}

function getRangeSvg(low, high, rateRange, brand) {
  const maxHeight = 32.5;
  const canvas = createCanvas(300, maxHeight);
  const ctx = canvas.getContext("2d");
  const barWidth = 195;
  const barX = 15;
  const textY = 8.125;
  const textMargin = 10;

  ctx.textBaseline = "top";
  ctx.font = "12px " + brand.fonts.Regular.name;

  ctx.fillText(low, 0, textY);

  var lW = ctx.measureText(low).width;
  ctx.beginPath();
  ctx.moveTo(lW + textMargin, barX);
  ctx.lineTo(barWidth, barX);

  ctx.lineWidth = 12;
  ctx.strokeStyle = brand.colors.primary || "#1A428A";
  ctx.stroke();

  const percent = (barWidth / 100) * parseInt(rateRange);

  ctx.beginPath();
  ctx.moveTo(percent, 0);
  ctx.lineTo(percent, maxHeight);

  ctx.lineWidth = 3;
  ctx.strokeStyle = brand.colors.secondary || "#D5BA8C";

  ctx.stroke();

  ctx.fillText(high, barWidth + textMargin, textY);

  trimCanvas(ctx);

  const img = canvas.toDataURL("image/png");
  return img;
}

function trimCanvas(ctx) {
  // removes transparent edges
  var x, y, w, h, top, left, right, bottom, data, idx1, idx2, found, imgData;
  w = ctx.canvas.width;
  h = ctx.canvas.height;
  if (!w && !h) {
    return false;
  }
  imgData = ctx.getImageData(0, 0, w, h);
  data = new Uint32Array(imgData.data.buffer);
  idx1 = 0;
  idx2 = w * h - 1;
  found = false;
  // search from top and bottom to find first rows containing a non transparent pixel.
  for (y = 0; y < h && !found; y += 1) {
    for (x = 0; x < w; x += 1) {
      if (data[idx1++] && !top) {
        top = y + 1;
        if (bottom) {
          // top and bottom found then stop the search
          found = true;
          break;
        }
      }
      if (data[idx2--] && !bottom) {
        bottom = h - y - 1;
        if (top) {
          // top and bottom found then stop the search
          found = true;
          break;
        }
      }
    }
    if (y > h - y && !top && !bottom) {
      return false;
    } // image is completely blank so do nothing
  }
  top -= 1; // correct top
  found = false;
  // search from left and right to find first column containing a non transparent pixel.
  for (x = 0; x < w && !found; x += 1) {
    idx1 = top * w + x;
    idx2 = top * w + (w - x - 1);
    for (y = top; y <= bottom; y += 1) {
      if (data[idx1] && !left) {
        left = x + 1;
        if (right) {
          // if left and right found then stop the search
          found = true;
          break;
        }
      }
      if (data[idx2] && !right) {
        right = w - x - 1;
        if (left) {
          // if left and right found then stop the search
          found = true;
          break;
        }
      }
      idx1 += w;
      idx2 += w;
    }
  }
  left -= 1; // correct left
  if (w === right - left + 1 && h === bottom - top + 1) {
    return true;
  } // no need to crop if no change in size
  w = right - left + 1;
  h = bottom - top + 1;
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.putImageData(imgData, -left, -top);
  return true;
}
