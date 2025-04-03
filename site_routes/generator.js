const express = require("express");
const router = express.Router();
const { getFullCategories } = require("../clyps_api");
const config = require("../config");
const { getCurrentPrice, getIsCanceled } = require("./utils");
const Account = require("../schemas/account");

module.exports = () => {
  router.get("/", async (req, res) => {
    let allRows = [];
    let allSizes = [];

    try {
      const categories = await getFullCategories({
        where: {
          availableOnPages: {
            has: "Generator",
          },
        },
      });

      allRows = categories.map((category) => {
        return {
          ...category,
          color: category.color || "#000000", // Default color if none provided
          isNew: category.tags.includes("new"),
        };
      });
    } catch (error) {
      console.log(error);
    }

    const canceledPlan = await getIsCanceled(req);
    if (canceledPlan) {
      Account.findOneAndUpdate(
        {
          _id: req.user.account._id,
        },
        {
          $set: {
            plan_canceled: true,
          },
        },
        {
          new: true,
        }
      ).then((account) => {});
    }

    res.render("generator", {
      sizes: allSizes,
      rows: allRows,
      selectedRow: undefined,
      currentPrice: await getCurrentPrice(req),
      cache: true,
      filename: "generator",
    });
  });

  router.get("/:id", async (req, res, next) => {
    let allRows = [];
    let allSizes = [];
    let selectedRows = {};

    try {
      const categories = await getFullCategories({
        where: {
          availableOnPages: {
            has: "Generator",
          },
        },
      });

      allRows = categories.map((category) => {
        return {
          ...category,
          color: category.color || "#000000", // Default color if none provided
          isNew: category.tags.includes("new"),
        };
      });

      selectedRows = allRows.filter((row) => row.id === req.params.id);
    } catch (error) {
      console.log(error);
    }

    res.render("generator", {
      sizes: allSizes,
      rows: allRows,
      selectedRow:
        selectedRows && selectedRows.length ? selectedRows[0] : undefined,
      currentPrice: await getCurrentPrice(req),
      cache: true,
      filename: "generator",
    });
  });

  return router;
};
