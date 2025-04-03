const express = require("express");
const router = express.Router();
const { getDesigns } = require("../clyps_api");
const fetchSizesMiddleware = require('./sizes-middleware');

module.exports = () => {
  router.use(fetchSizesMiddleware);

  router.get("/", async (req, res) => {
    const userEmail = req.user.email;
    let categorizedDesigns = [];
    const sizes = req.session.sizes;

    try {
      // Fetch all designs created by the user, ordered by publishedDate in descending order (latest first)
      const userDesignsData = await getDesigns({
        where: {
          creator: { email: { equals: userEmail } },
        },
        orderBy: {
          publishedDate: "desc",  // Order designs by publishedDate (latest first)
        },
      });

      const userDesigns = userDesignsData.designs;

      if (userDesigns.length) {
        // Iterate over the available sizes
        for (const size of sizes) {
          // Filter designs for the current size based on categories
          const designsForSize = userDesigns.filter(design => 
            design.categories.some(category =>
              category.name.toLowerCase().includes(size.name.toLowerCase())
            )
          );

          // Only add a category if there are designs for that size
          if (designsForSize.length) {
            categorizedDesigns.push({
              id: size.id,
              name: size.name,
              templates: designsForSize,  // Designs already ordered by date
              sizes: [size],
              default_size: size.id,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching designs:", error);
    }

    res.render("recents", {
      sizes,
      templates: categorizedDesigns,
      row: { templates: [] },
      cache: true,
      filename: "recents",
    });
  });

  return router;
};
