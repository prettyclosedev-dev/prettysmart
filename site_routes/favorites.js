const express = require('express');
const router = express.Router();
const { getUserFavorites } = require('../clyps_brand_update'); // Adjust the path as necessary
const { getDesignsCount } = require('../clyps_api');
const fetchSizesMiddleware = require('./sizes-middleware');

module.exports = () => {
  router.use(fetchSizesMiddleware);

  router.get('/', async (req, res) => {
    const sizes = req.session.sizes;
    const sizeNames = sizes.map((size) => size.name);
    
    const userEmail = req.user.email;
    let categorizedDesigns = [];

    try {
      const favoritesData = await getUserFavorites(userEmail);
      if (favoritesData && favoritesData.length) {
        favoritesData.forEach((design) => {
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

    for (const category of categorizedDesigns) {
      for (const size of sizes) {
        try {
          const designsCountData = await getDesignsCount({
            where: {
              AND: [
                {
                  categories: {
                    some: {
                      name: {
                        contains: category.name,
                        mode: "insensitive",
                      },
                    },
                  },
                },
                {
                  categories: {
                    some: {
                      name: {
                        contains: size.name,
                        mode: "insensitive",
                      },
                    },
                  },
                },
                // {
                //   categories: {
                //     some: {
                //       availableOnPages: {
                //         has: "Favorites",
                //       },
                //     },
                //   },
                // },
              ],
            },
          });

          if (designsCountData.designsCount > 0) {
            category.sizes.push(size);
          }
        } catch (error) {
          console.log(error);
        }
      }
    }

    return res.render('favorites', {
      sizes,
      templates: categorizedDesigns,
      row: { templates: [] },
      cache: true,
      filename: 'favorites',
    });
  });

  return router;
};
