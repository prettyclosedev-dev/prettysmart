const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const fs = require("fs");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const path = require("path");
const User = require("../schemas/user");
const Prompts = require("../schemas/prompts");
const { prompt } = require("../openAi");
const {
  getBrandedDesigns,
  getDesignsCount,
  getBrandedDesign,
  getDesigns,
  getCategories,
} = require("../clyps_api");
const {
  getUserFavorites,
  addFavorite,
  removeFavorite,
} = require("../clyps_brand_update");
const fetchSizesMiddleware = require("./sizes-middleware");

module.exports = () => {
  router.use(fetchSizesMiddleware);

  router.get("/", async (req, res) => {
    try {
      const sizes = req.session.sizes || [];

      return res.render("templates", {
        sizes,
        templates: [],
        loading: true,
        row: { templates: [] },
        cache: true,
        filename: "templates",
        categoryId: null,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Error loading templates");
    }
  });

  router.get("/get-templates", async (req, res) => {
    const sizes = req.session.sizes;

    let categorizedDesigns = [];
    const userEmail = req.user.email;
    const pageSize = 10; // Number of designs to fetch per category per page

    try {
      // Fetch content categories available on the "Templates" page
      const categories = await getCategories({
        where: {
          availableOnPages: {
            has: "Templates",
          },
        },
        orderBy: [{ priority: { sort: "asc" } }],
      });

      const favoritesData = await getUserFavorites(userEmail);
      const favoriteIds = favoritesData
        ? favoritesData.map((fav) => fav.id)
        : [];

      // Loop through each category to fetch its designs
      categorizedDesigns = await Promise.all(
        categories.map(async (category) => {
          let categorizedCategory = {
            id: category.id,
            name: category.name,
            creatorId: category.creatorId,
            public: category.public,
            tags: category.tags,
            templates: [],
            sizes: [],
            default_size: category.size || 40,
            currentPage: 1,
            totalPages: 1,
          };

          // Fetch designs and total design count concurrently
          const [designsData, totalDesigns] = await Promise.all([
            getDesigns({
              take: pageSize,
              skip: 0,
              where: {
                AND: [
                  {
                    categories: { some: { id: { equals: category.id } } },
                  },
                  {
                    categories: {
                      some: {
                        name: { contains: "square", mode: "insensitive" },
                      },
                    },
                  },
                ],
              },
            }),
            getDesignsCount({
              where: {
                AND: [
                  { categories: { some: { id: { equals: category.id } } } },
                  {
                    categories: {
                      some: {
                        name: { contains: "square", mode: "insensitive" },
                      },
                    },
                  },
                ],
              },
            }),
          ]);

          if (designsData?.designs) {
            categorizedCategory.templates = designsData.designs.map(
              (design) => ({
                ...design,
                isFavorite: favoriteIds.includes(design.id),
              })
            );
            categorizedCategory.totalPages = Math.ceil(
              totalDesigns.designsCount / pageSize
            );

            if (totalDesigns.designsCount > 0) {
              const squareSize = sizes.find(
                (size) => size.name.toLowerCase() === "square"
              );
              if (squareSize) categorizedCategory.sizes.push(squareSize);
            }
          }

          // Populate sizes with Promise.all for concurrent size checks
          const sizesWithCounts = await Promise.all(
            sizes.map(async (size) => {
              if (size.name.toLowerCase() === "square") {
                categorizedCategory.default_size = size.id;
                return size; // Return square size to keep it in sizes array
              }

              const designsCountData = await getDesignsCount({
                where: {
                  AND: [
                    { categories: { some: { id: { equals: category.id } } } },
                    {
                      categories: {
                        some: {
                          name: { contains: size.name, mode: "insensitive" },
                        },
                      },
                    },
                  ],
                },
              });

              if (designsCountData.designsCount > 0) {
                return size;
              }

              return null;
            })
          );

          // Filter out null sizes and set default size if not already set
          categorizedCategory.sizes = sizesWithCounts.filter(Boolean);
          if (
            !categorizedCategory.default_size &&
            categorizedCategory.sizes.length > 0
          ) {
            categorizedCategory.default_size = categorizedCategory.sizes[0].id;
          }

          return categorizedCategory;
        })
      );
    } catch (error) {
      console.log(error);
    }

    return res.render("partials/templates-content", {
      sizes,
      templates: categorizedDesigns,
      row: { templates: [] },
      cache: true,
      filename: "templates",
      loading: false,
    });
  });

  // Route to load more designs for a specific category
  router.get("/load-more/:categoryId", async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, sizeName = "square" } = req.query; // Default to 'square' if sizeName is not provided
    const pageSize = 10; // Number of designs to fetch per page
    const offset = (page - 1) * pageSize;

    try {
      // Fetch the designs for the given category, page, and size
      const designsData = await getDesigns({
        take: pageSize,
        skip: offset,
        where: {
          AND: [
            {
              categories: {
                some: {
                  id: {
                    equals: parseInt(categoryId),
                  },
                },
              },
            },
            {
              categories: {
                some: {
                  name: {
                    contains: sizeName, // Filter by the selected size
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        },
      });

      if (designsData && designsData.designs) {
        return res.status(200).json(designsData.designs);
      } else {
        return res.status(500).json({ error: "No designs found." });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Failed to load more designs." });
    }
  });

  router.get("/preview/:id", async (req, res) => {

    console.log({content:req.session});

    const variables = {
      user: req.user,
      where: {
        id: parseInt(req.params.id),
      },
      brandWhere: {
        prettySmartId: req.user.account._id.toString(),
      },
      previewOptions: {
        pixelRatio: 1,
      },
    };

    if (req.session.content) {
      variables.additional = {
        ...req.session.content,
        house: req.session.content.form_file,
      };
      delete variables.form_file; // should we pass form_file instead of house?
    }

    // console.log(variables);

    try {
      let brandedDesignData = await getBrandedDesign(variables);
      if (
        brandedDesignData &&
        brandedDesignData.brandedDesign &&
        brandedDesignData.brandedDesign.preview
      ) {
        return res.status(200).send(brandedDesignData.brandedDesign.preview);
      }

      return res.status(404).send("Preview not found.");
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .send("An error occurred while fetching the preview.");
    }
  });

  // router.post("/preview/:id", async (req, res) => {
  //   const { categoryId } = req.body;

  //   const aiResponse = await runAI(categoryId, req.user);
  //   const additional = JSON.parse(aiResponse)

  //   console.log({ aiResponse });

  //   if (categoryId) {
  //     Prompts.findOne({ id: parseInt(categoryId) }, (err, data) => {
  //       if (data) {
  //         console.log({ data });
  //       }
  //     });
  //   }

  //   const variables = {
  //     user: req.user,
  //     email: req.user.email,
  //     where: {
  //       id: parseInt(req.params.id),
  //     },
  //     brandWhere: {
  //       prettySmartId: req.user.account._id.toString(),
  //     },
  //     previewOptions: {
  //       mimeType: "application/png",
  //       pixelRatio: 2,
  //     },
  //     withPreview: true,
  //     additional,
  //   };

  //   console.log(variables)

  //   if (req.session.content) {
  //     variables.additional = {
  //       ...req.session.content,
  //       house: req.session.content.form_file,
  //     };
  //     delete variables.form_file; // should we pass form_file instead of house?
  //   }

  //   try {
  //     let brandedDesignData = await getBrandedDesign(variables);
  //     if (
  //       brandedDesignData &&
  //       brandedDesignData.brandedDesign &&
  //       brandedDesignData.brandedDesign.preview
  //     ) {
  //       return res.status(200).send(brandedDesignData.brandedDesign.preview);
  //     }

  //     return res.status(404).send("Preview not found.");
  //   } catch (error) {
  //     console.log(error);
  //     return res
  //       .status(500)
  //       .send("An error occurred while fetching the preview.");
  //   }
  // });

  router.get("/export/:templateId", async function (req, res) {
    const { templateId } = req.params;
    const { file_type, file_name } = req.query;

    try {
      // Prepare variables for export
      const variables = {
        user: req.user,
        where: { id: parseInt(templateId) },
        previewOptions: {
          mimeType:
            file_type === "pdf" ? "application/pdf" : `image/${file_type}`,
          pixelRatio: 2, // TODO: - allow user to choose quality?
        },
        brandWhere: {
          prettySmartId: req.user.account._id.toString(),
        },
      };

      // Generate the branded design (image or PDF)
      const brandedDesignData = await getBrandedDesign(variables);

      if (
        brandedDesignData &&
        brandedDesignData.brandedDesign &&
        brandedDesignData.brandedDesign.preview
      ) {
        // Send the file directly
        const fileBuffer = Buffer.from(
          brandedDesignData.brandedDesign.preview,
          "base64"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file_name}.${file_type}"`
        );
        res.setHeader("Content-Type", variables.previewOptions.mimeType);
        return res.send(fileBuffer);
      }

      return res.status(404).send("Export failed, preview not found.");
    } catch (error) {
      console.error("Error exporting:", error);
      return res.status(500).send("Error during export process.");
    }
  });

  router.get("/category/:categoryId", async (req, res) => {
    // we can use this to get ai content to clyps api
    const sizes = req.session.sizes;
    const sizeNames = sizes.map((size) => size.name);
    const categoryId = req.params.categoryId;
    let categorizedDesigns = [];
    const userEmail = req.user.email;

    const favoritesData = await getUserFavorites(userEmail);
    const favoriteIds = favoritesData.map((fav) => fav.id);

    const aiResponse = await runAI(categoryId, req.user);

    if (categoryId) {
      const data = await Prompts.findOne({ category: parseInt(categoryId) })
      
      console.log({data});

      if (data) {
        const additional = JSON.parse(aiResponse)
        console.log({ additional });
        req.session.content = additional;
      }
    }

    try {
      const designsData = await getDesigns({
        // ai data goes here
        where: {
          AND: [
            {
              categories: {
                some: {
                  id: {
                    equals: parseInt(categoryId),
                  },
                },
              },
            },
            {
              categories: {
                some: {
                  name: {
                    contains: "square", // or vertical, square, horizontal based on your logic
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
          design.isFavorite = favoriteIds.includes(design.id);
          design.categories.forEach((category) => {
            if (!sizeNames.includes(category.name)) {
              let categoryIndex = categorizedDesigns.findIndex(
                (cat) => cat.name === category.name
              );

              if (categoryIndex === -1) {
                // Category does not exist, so create it
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
                // Category exists, so push the design into it
                categorizedDesigns[categoryIndex].templates.push(design);
              }
            }
          });
        });
      }
    } catch (error) {
      console.log(error);
    }

    // Now, to iterate over categorizedDesigns to populate sizes
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
                  // Uncomment this if needed
                  // {
                  //   categories: {
                  //     some: {
                  //       availableOnPages: { has: "Templates" },
                  //     },
                  //   },
                  // },
                ],
              },
            });

            if (designsCountData.designsCount > 0) {
              return size; // Return the size if designs are found
            }
          } catch (error) {
            console.log(error);
            return null; // Return null in case of error
          }
          return null; // Return null if no designs are found
        });

        // Wait for all size checks to complete and filter valid sizes
        const validSizes = (await Promise.all(sizePromises)).filter(Boolean);
        category.sizes.push(...validSizes); // Add valid sizes to category
      })
    );

    return res.render("templates", {
      sizes, // This could be a separate query if needed
      categoryId,
      templates: categorizedDesigns,
      row: { templates: [] },
      cache: true,
      filename: "templates",
      loading: false,
    });
  });

  router.get("/resize?", async (req, res) => {
    await handleResize(req, res);
  });

  router.get("/category/:templatesId/resize?", async (req, res) => {
    await handleResize(req, res);
  });

  router.post("/addFavorite", async (req, res) => {
    const { designId } = req.body;
    const userEmail = req.user.email;
    try {
      const response = await addFavorite(userEmail, designId);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/removeFavorite", async (req, res) => {
    const { designId } = req.body;
    const userEmail = req.user.email;
    try {
      const response = await removeFavorite(userEmail, designId);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

async function handleResize(req, res) {
  const sizes = req.session.sizes;
  const { row, size } = req.query; // 'row' is the category ID, 'size' is the desired size ID
  let newRow = {};

  try {
    // First, find the name of the size the user wants to switch to
    const newSize = sizes.find((s) => s.id.toString() === size)?.name;
    if (!newSize) {
      return res.status(400).send("Invalid size specified.");
    }

    // Fetch designs in the specified category and for the new size
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
                name: { contains: newSize, mode: "insensitive" },
              },
            },
          },
          // {
          //   categories: {
          //     some: {
          //       availableOnPages: {
          //         has: "Templates",
          //       },
          //     }
          //   },
          // },
        ],
      },
    });

    // Assuming 'getBrandedDesigns' returns an array of designs
    const designsInNewSize = designsData.designs;

    newRow = {
      templates: designsInNewSize,
      sizes: [], // needs to be fetched again for category
    };

    // Prepare newRow with the fetched designs and initialize sizeOptions
    const sizesWithCounts = await Promise.all(
      sizes.map(async (size) => {
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
                {
                  categories: {
                    some: {
                      availableOnPages: { has: "Templates" },
                    },
                  },
                },
              ],
            },
          });

          if (designsCountData.designsCount > 0) {
            return size; // Return the size if there's a match
          }
        } catch (error) {
          console.log(error);
          return null; // Return null in case of error
        }
        return null; // Return null if no designs are found
      })
    );

    // Filter out null values and populate newRow.sizes
    newRow.sizes = sizesWithCounts.filter(Boolean);
  } catch (error) {
    console.error("Error fetching designs for new size:", error);
    return res.status(500).send("An error occurred while resizing.");
  }

  res.render("templates", {
    sizes, // Pass the size array for the frontend to use
    row: newRow, // Pass the newRow object containing designs in the new size and size options
    templates: [],
    cache: true,
    filename: "templates",
    loading: false,
  });
}

async function runAI(categoryId, user) {
  if(!categoryId) return "{}";

  console.log(categoryId, user);

  const promptObject = await Prompts.findOne({ category: categoryId });

  let newPrompt = promptObject.prompt;

  if (!promptObject) return res.send("Prompt is required");

  // replace fields
  if (newPrompt.indexOf("{{location_city}}") > -1) {
    newPrompt = newPrompt.replace(
      "{{location_city}}",
      user.account.location_city
    );
  }

  if (newPrompt.indexOf("{{location_country}}") > -1) {
    newPrompt = newPrompt.replace(
      "{{location_country}}",
      user.account.location_country
    );
  }

  try {
    return await prompt(newPrompt);
  } catch (error) {
    console.log({ error });
    throw error;
  }
}
