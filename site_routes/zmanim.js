const express = require("express");
const router = express.Router();
const fs = require("fs");
const config = require("../config.json");
const path = require("path");
const {
  getDesigns,
  getDesignsCount,
  getBrandedDesign,
  getBrandedDesigns,
} = require("../clyps_api");
const fetchSizesMiddleware = require("./sizes-middleware");
const { getUserFavorites } = require("../clyps_brand_update");

module.exports = () => {
  router.use(fetchSizesMiddleware);

  router.get("/", async (req, res) => {
    const sizes = req.session.sizes;
    const sizeNames = sizes.map((size) => size.name);
    let categorizedDesigns = [];
    const userEmail = req.user.email;

    try {
      const favoritesData = await getUserFavorites(userEmail);
      const favoriteIds = favoritesData
        ? favoritesData.map((fav) => fav.id)
        : [];

      const designsData = await getDesigns({
        where: {
          AND: [
            {
              categories: {
                some: {
                  availableOnPages: {
                    has: "Zmanim",
                  },
                },
              },
            },
          ],
        },
      });

      if (designsData && designsData.designs) {
        // Filter out duplicates (designs with original_id tag)
        const filteredDesigns = designsData.designs.filter(d => !d.tags || !d.tags.some(t => t.startsWith("original_id:")));

        filteredDesigns.forEach((design) => {
          design.isFavorite = favoriteIds.includes(design.id);
          design.categories.forEach((category) => {
            if (!sizeNames.includes(category.name)) {
              let categoryIndex = categorizedDesigns.findIndex(
                (cat) => cat.name === category.name
              );

              if (categoryIndex === -1) {
                categorizedDesigns.push({
                  id: category.id,
                  name: category.name,
                  creatorId: category.creatorId,
                  public: category.public,
                  tags: category.tags,
                  templates: [design],
                  sizes: [],
                  default_size: category.size || 40,
                });
              } else {
                categorizedDesigns[categoryIndex].templates.push(design);
              }
            }
          });
        });
      }
    } catch (error) {
      console.log(error);
    }

    return res.render("templates", {
      sizes: sizes,
      templates: categorizedDesigns,
      row: { templates: [] },
      cache: true,
      filename: "templates",
      pageTitle: "Zmanim",
    });
  });

  router.post("/refetch?", async (req, res) => {
    const sizes = req.session.sizes;
    const sizeNames = sizes.map((size) => size.name);
    let categorizedDesigns = [];

    try {
      const designsData = await getDesigns({
        where: {
          AND: [
            {
              categories: {
                some: {
                  availableOnPages: {
                    has: "Zmanim",
                  },
                },
              },
            },
            {
              categories: {
                some: {
                  name: {
                    contains: req.body.row_name,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        },
      });

      if (designsData && designsData.designs) {
        designsData.designs.forEach((design) => {
          design.categories.forEach((category) => {
            if (!sizeNames.includes(category.name)) {
              let categoryIndex = categorizedDesigns.findIndex(
                (cat) => cat.name === category.name
              );

              if (categoryIndex === -1) {
                categorizedDesigns.push({
                  id: category.id,
                  name: category.name,
                  creatorId: category.creatorId,
                  public: category.public,
                  tags: category.tags,
                  templates: [design],
                  sizes: [],
                  default_size: category.size || 40,
                });
              } else {
                categorizedDesigns[categoryIndex].templates.push(design);
              }
            }
          });
        });
      }
    } catch (error) {
      console.log(error);
    }

    await Promise.all(
      categorizedDesigns.map(async (category) => {
        const sizePromises = sizes.map(async (size) => {
          try {
            const designsCountData = await getDesignsCount({
              where: {
                AND: [
                  {
                    categories: {
                      some: {
                        name: { contains: category.name, mode: "insensitive" },
                      },
                    },
                  },
                  {
                    categories: {
                      some: {
                        name: { contains: size.name, mode: "insensitive" },
                      },
                    },
                  },
                  {
                    categories: {
                      some: {
                        availableOnPages: { has: "Zmanim" },
                      },
                    },
                  },
                ],
              },
            });

            if (designsCountData.designsCount > 0) {
              return size; // Return size if a match is found
            }
          } catch (error) {
            console.log(error);
            return null; // Return null in case of an error
          }

          return null; // Return null if no designs are found
        });

        // Wait for all size checks and filter valid sizes
        const validSizes = (await Promise.all(sizePromises)).filter(Boolean);
        category.sizes.push(...validSizes); // Push valid sizes to the category
      })
    );

    return res.render("templates", {
      sizes,
      templates: [],
      row: categorizedDesigns[0],
      cache: true,
      filename: "templates",
      pageTitle: "Zmanim",
    });
  });

  router.get("/resize?", async (req, res) => {
    const sizes = req.session.sizes;
    const sizeNames = sizes.map((size) => size.name);
    const { row, size } = req.query;
    let newRow = {};

    try {
      const designsData = await getDesigns({
        where: {
          AND: [
            {
              categories: {
                some: {
                  id: {
                    equals: parseInt(row),
                  },
                },
              },
            },
            {
              categories: {
                some: {
                  name: {
                    contains: size,
                    mode: "insensitive",
                  },
                },
              },
            },
            // {
            //   categories: {
            //     some: {
            //       availableOnPages: {
            //         has: "Zmanim",
            //       },
            //     },
            //   },
            // },
          ],
        },
      });

      newRow = {
        templates: designsData.designs,
        sizes: [],
      };

      const sizePromises = sizes.map(async (size) => {
        try {
          const designsCountData = await getDesignsCount({
            where: {
              AND: [
                {
                  categories: {
                    some: {
                      id: { equals: parseInt(row) },
                    },
                  },
                },
                {
                  categories: {
                    some: {
                      name: { contains: size.name, mode: "insensitive" },
                    },
                  },
                },
                // Uncomment this if needed
                // {
                //   categories: {
                //     some: {
                //       availableOnPages: { has: "Zmanim" },
                //     },
                //   },
                // },
              ],
            },
          });

          if (designsCountData.designsCount > 0) {
            return size; // Return size if designs are found
          }
        } catch (error) {
          console.log(error);
          return null; // Return null if an error occurs
        }
        return null; // Return null if no designs are found
      });

      // Wait for all promises to complete and filter valid sizes
      const validSizes = (await Promise.all(sizePromises)).filter(Boolean);
      newRow.sizes.push(...validSizes); // Add valid sizes to newRow
    } catch (error) {
      console.error("Error fetching designs for new size:", error);
      return res.status(500).send("An error occurred while resizing.");
    }

    res.render("templates", {
      row: newRow,
      templates: [],
      cache: true,
      filename: "templates",
      pageTitle: "Zmanim",
    });
  });

  return router;
};
