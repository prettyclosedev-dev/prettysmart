const { logError, logMessage } = require("../lib/logger");
const config = require("../config.json");
const stripe = require("stripe")(config.stripe.test.secret);

async function getPlans(userid) {
    try {
        // Fetch all active prices and products
        const pricesRes = await stripe.prices.list({ active: true, limit: 100 });
        const productsRes = await stripe.products.list({ active: true, limit: 100 });

        logMessage(userid, "All products: " + productsRes.data.map(p => p.name + " " + p.id).join(", "));

        const fallbackProductIds = [
            "prod_SqgVHp8h05VYdK", // Single Agent
            "prod_SqhiqlqPzYOmYW", // Teams
        ];

        // Filter products with showinpricing = Yes
        let filteredProducts = productsRes.data.filter(p => p.metadata?.showinpricing?.toLowerCase() === "yes");

        if (!filteredProducts.length) {
            filteredProducts = productsRes.data.filter(p => fallbackProductIds.includes(p.id)).map(p => ({ ...p }));
        }

        logMessage(userid, "Filtered products: " + filteredProducts.map(p => p.name).join(","));

        // Attach monthly and yearly prices to each product
        filteredProducts = filteredProducts.map(product => {
            const productPrices = pricesRes.data.filter(price => price.product === product.id);

            const monthPrice = productPrices.find(p => p.recurring?.interval === "month");
            const yearPrice = productPrices.find(p => p.recurring?.interval === "year");

            let multiplier = parseFloat(product.metadata?.multiplier || "1.0");
            if (isNaN(multiplier)) multiplier = 1.0;

            return {
                ...product,
                prices: {
                    month: monthPrice ? { ...monthPrice, amount: monthPrice.unit_amount * multiplier } : null,
                    year: yearPrice ? { ...yearPrice, amount: yearPrice.unit_amount * multiplier } : null
                }
            };
        });

        // Sort products by metadata.order or by monthly price
        if (filteredProducts.some(p => p.metadata?.order)) {
            filteredProducts.sort((a, b) => (a.metadata.order ?? 0) - (b.metadata.order ?? 0));
        } else {
            filteredProducts.sort((a, b) => (a.prices.month?.amount ?? 0) - (b.prices.month?.amount ?? 0));
        }

        // Clean metadata for rendering
        const cleanedProducts = filteredProducts.map(product => {
            const metadataToRemove = ["showinpricing", "order", "multiplier"];
            const metadata = {};
            for (const [key, value] of Object.entries(product.metadata)) {
                if (!metadataToRemove.includes(key)) metadata[key] = value;
            }
            return { ...product, metadata };
        });

        logMessage(userid, "Final products for display: " + cleanedProducts.map(p => p.name).join(","));

        return { ...productsRes, data: cleanedProducts };
    } catch (error) {
        console.log("Error getting Stripe plans", error);
        logError(userid, "Error getting Stripe plans: " + JSON.stringify(error));
        return { data: [] };
    }
}

module.exports = {
    getPlans
};
