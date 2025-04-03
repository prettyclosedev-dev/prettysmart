const { getCategories } = require('../clyps_api');

async function fetchSizesMiddleware(req, res, next) {
  if (!req.session.sizes) {
    try {
      const sizes = await getCategories({
        where: {
          tags: {
            has: "size",
          },
        },
      });

      // Separate "square" size
      const squareSize = sizes.find(category => category.id === 40);
      const otherSizes = sizes.filter(category => category.id !== 40);

      // Reverse other sizes if needed (based on your original code)
      otherSizes.reverse();

      // Prepend "square" to the beginning of the sizes array
      req.session.sizes = [squareSize, ...otherSizes];
    } catch (error) {
      console.error("Error fetching sizes:", error);
      return res.status(500).send("An error occurred while fetching sizes.");
    }
  }
  next();
}

module.exports = fetchSizesMiddleware;
