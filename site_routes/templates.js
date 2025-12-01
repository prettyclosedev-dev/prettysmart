const express = require("express");
const router = express.Router();
const Huddle = require("../huddle");
const fs = require("fs");
const config = require("../config.json");
const serverUrl = config.BASE_URL;
const path = require("path");
const User = require("../schemas/user");
const Project = require("../schemas/project");
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
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Error loading templates");
    }
  });

  router.get("/get-templates", async (req, res) => {
    const sizes = req.session.sizes || [];
    const userEmail = req.user.email;
    const userId = req.user && (req.user._id?.toString?.() || String(req.user._id || ""));
    // Real static folder location (images): site_static/templates/{userId}
    const baseDir = path.join(__dirname, "../site_static/templates", userId);
    const pageSize = 10;

    let categorizedDesigns = [];

    try {
      const favoritesData = await getUserFavorites(userEmail).catch(() => []);
      const favoriteIds = Array.isArray(favoritesData)
        ? favoritesData.map((fav) => fav.id)
        : [];

      const dirExists = fs.existsSync(baseDir) && fs.lstatSync(baseDir).isDirectory();
      if (dirExists) {
        const catDirents = fs.readdirSync(baseDir, { withFileTypes: true }).filter((d) => d.isDirectory());
        let categoryMap = [];

        categorizedDesigns = catDirents.map((catDir, idx) => {
          const categoryName = catDir.name;
          const categoryPath = path.join(baseDir, categoryName);
          const subDirents = fs.readdirSync(categoryPath, { withFileTypes: true }).filter((d) => d.isDirectory());
          const availableSizeNames = subDirents.map((s) => s.name.toLowerCase());
          const matchedSizes = sizes.filter((s) => availableSizeNames.includes(s.name.toLowerCase()));
          const squareSize = matchedSizes.find((s) => s.name.toLowerCase() === "square");
          const defaultSizeId = (squareSize || matchedSizes[0])?.id;
          const defaultSizeName = (sizes.find((s) => s.id === defaultSizeId) || {}).name;
          const defaultSubName = defaultSizeName ? defaultSizeName.toLowerCase() : null;
          const defaultSubPath = defaultSubName ? path.join(categoryPath, defaultSubName) : null;

          let templates = [];
          let totalPages = 1;
          if (defaultSubPath && fs.existsSync(defaultSubPath) && fs.lstatSync(defaultSubPath).isDirectory()) {
            const files = fs
              .readdirSync(defaultSubPath, { withFileTypes: true })
              .filter((f) => f.isFile() && /(\.jpg|\.jpeg|\.png)$/i.test(f.name));
            totalPages = Math.ceil(files.length / pageSize) || 1;
            const pageFiles = files.slice(0, pageSize);
            for (const f of pageFiles) {
              const fileName = f.name;
              const base = fileName.replace(/\.(jpg|jpeg|png)$/i, "");
              const parts = base.split("_");
              const idToken = parts.shift();
              const tmplId = parseInt(idToken);
              const displayName = parts.join("_") || idToken;
              const previewPath = `/site_static/templates/${userId}/${encodeURIComponent(categoryName)}/${defaultSubName}/${encodeURIComponent(fileName)}`;
              const tmpl = {
                id: tmplId,
                name: displayName,
                file_name: fileName,
                preview: previewPath,
                isFavorite: favoriteIds.includes(tmplId),
              };
              templates.push(tmpl);
            }
          }

          const cat = {
            id: idx + 1,
            name: categoryName,
            creatorId: null,
            public: true,
            tags: [],
            templates,
            sizes: matchedSizes,
            default_size: defaultSizeId || (matchedSizes[0] && matchedSizes[0].id) || null,
            currentPage: 1,
            totalPages,
          };

            categoryMap.push({ id: cat.id, name: categoryName, sizes: matchedSizes.map((s) => s.name) });
          return cat;
        });

        req.session.templateCategoryMap = categoryMap;
      }
    } catch (error) {
      console.log(error);
    }

    const hasAnyTemplates = Array.isArray(categorizedDesigns) && categorizedDesigns.some((c) => c.templates && c.templates.length);
    if (!hasAnyTemplates) {
      return res.status(200).send('<div class="empty-state" style="padding: 24px; text-align:center;">set up your brand in the My Brand page</div>');
    }

    return res.render("partials/templates-content", { sizes, templates: categorizedDesigns, row: { templates: [] }, cache: true, filename: "templates", loading: false });
  });

  // Route to load more designs for a specific category
  router.get("/load-more/:categoryId", async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, sizeName = "square" } = req.query;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    try {
      const userId = req.user && (req.user._id?.toString?.() || String(req.user._id || ""));
      const baseDir = path.join(__dirname, "../site_static/templates", userId);
      const catMap = req.session.templateCategoryMap || [];
      const cat = catMap.find((c) => String(c.id) === String(categoryId));
      if (!cat) return res.status(200).json([]);

      const categoryPath = path.join(baseDir, cat.name);
      const subPath = path.join(categoryPath, String(sizeName).toLowerCase());
      if (!fs.existsSync(subPath) || !fs.lstatSync(subPath).isDirectory()) {
        return res.status(200).json([]);
      }

      const userEmail = req.user.email;
      const favoritesData = await getUserFavorites(userEmail).catch(() => []);
      const favoriteIds = Array.isArray(favoritesData)
        ? favoritesData.map((fav) => fav.id)
        : [];

      const files = fs
        .readdirSync(subPath, { withFileTypes: true })
        .filter((f) => f.isFile() && /(\.jpg|\.jpeg|\.png)$/i.test(f.name));

      const slice = files.slice(offset, offset + pageSize);
      const designs = [];
      for (const f of slice) {
        const fileName = f.name;
        const base = fileName.replace(/\.(jpg|jpeg|png)$/i, "");
        const parts = base.split("_");
        const idToken = parts.shift();
        const tmplId = parseInt(idToken);
        const displayName = parts.join("_") || idToken;
        const previewPath = `/site_static/templates/${userId}/${encodeURIComponent(cat.name)}/${String(sizeName).toLowerCase()}/${encodeURIComponent(fileName)}`;
        designs.push({ id: tmplId, name: displayName, file_name: fileName, preview: previewPath, isFavorite: favoriteIds.includes(tmplId) });
      }

      return res.status(200).json(designs);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Failed to load more designs." });
    }
  });

  router.get("/preview/:id", async (req, res) => {
    // Use user-specific copy if it exists, otherwise use base template id
    const mapping = await Project.findOne({
      user: req.user._id,
      template_id: String(parseInt(req.params.id)),
    }).lean();

    const effectiveId = mapping && mapping.project_id ? parseInt(mapping.project_id) : parseInt(req.params.id);

    const variables = {
      user: req.user,
      where: {
        id: effectiveId,
      },
      // Only apply brandWhere when generating from base template (not from user copy)
      brandWhere: mapping && mapping.project_id ? undefined : {
        prettySmartId: req.user.account._id.toString(),
      },
      previewOptions: {
        pixelRatio: 1,
      }
    };

    if (req.session.content) {
      variables.additional = {
        ...req.session.content,
        house: req.session.content.form_file,
      };
      delete variables.form_file; // should we pass form_file instead of house?
    }

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

  router.get("/export/:templateId", async function (req, res) {
    const { templateId } = req.params;
    const { file_type, file_name } = req.query;

    try {
      // Use user-specific copy if it exists, otherwise use base template id
      const mapping = await Project.findOne({
        user: req.user._id,
        template_id: String(parseInt(templateId)),
      }).lean();
      const effectiveId = mapping && mapping.project_id ? parseInt(mapping.project_id) : parseInt(templateId);

      // Prepare variables for export
      const variables = {
        user: req.user,
        where: { id: effectiveId },
        previewOptions: {
          mimeType:
            file_type === "pdf" ? "application/pdf" : `image/${file_type}`,
          pixelRatio: 2, // TODO: - allow user to choose quality?
        },
        // Only apply brandWhere when exporting base template (not from user copy)
        brandWhere: mapping && mapping.project_id ? undefined : {
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
    const sizes = req.session.sizes;
    const sizeNames = sizes.map((size) => size.name);
    const categoryId = req.params.categoryId;
    let categorizedDesigns = [];
    const userEmail = req.user.email;

    const favoritesData = await getUserFavorites(userEmail);
    const favoriteIds = favoritesData.map((fav) => fav.id);

    try {
      const designsData = await getDesigns({
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
  const sizes = req.session.sizes || [];
  const { row, size } = req.query;
  let newRow = {};

  try {
    const sizeName = sizes.find((s) => s.id.toString() === String(size))?.name;
    if (!sizeName) return res.status(400).send("Invalid size specified.");

    const userId = req.user && (req.user._id?.toString?.() || String(req.user._id || ""));
    const baseDir = path.join(__dirname, "../site_static/templates", userId);
    const catMap = req.session.templateCategoryMap || [];
    const cat = catMap.find((c) => String(c.id) === String(row));
    if (!cat) return res.status(400).send("Invalid category specified.");

    const categoryPath = path.join(baseDir, cat.name);
    const subPath = path.join(categoryPath, sizeName.toLowerCase());

    let templates = [];
    if (fs.existsSync(subPath) && fs.lstatSync(subPath).isDirectory()) {
      const userEmail = req.user.email;
      const favoritesData = await getUserFavorites(userEmail).catch(() => []);
      const favoriteIds = Array.isArray(favoritesData)
        ? favoritesData.map((fav) => fav.id)
        : [];

      const files = fs
        .readdirSync(subPath, { withFileTypes: true })
        .filter((f) => f.isFile() && /(\.jpg|\.jpeg|\.png)$/i.test(f.name));

      for (const f of files) {
        const fileName = f.name;
        const base = fileName.replace(/\.(jpg|jpeg|png)$/i, "");
        const parts = base.split("_");
        const idToken = parts.shift();
        const tmplId = parseInt(idToken);
        const displayName = parts.join("_") || idToken;
        const previewPath = `/site_static/templates/${userId}/${encodeURIComponent(cat.name)}/${sizeName.toLowerCase()}/${encodeURIComponent(fileName)}`;
        templates.push({ id: tmplId, name: displayName, file_name: fileName, preview: previewPath, isFavorite: favoriteIds.includes(tmplId) });
      }
    }

    const subDirents = fs
      .readdirSync(categoryPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name.toLowerCase());
    const matchedSizes = sizes.filter((s) => subDirents.includes(s.name.toLowerCase()));

    newRow = { templates, sizes: matchedSizes };
  } catch (error) {
    console.error("Error fetching designs for new size:", error);
    return res.status(500).send("An error occurred while resizing.");
  }

  res.render("templates", { sizes, row: newRow, templates: [], cache: true, filename: "templates", loading: false });
}
