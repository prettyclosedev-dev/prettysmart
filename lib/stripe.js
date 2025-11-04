const { getPricePerProduct, getCurrentInterval } = require("./utils");
const { logError, logMessage } = require("../lib/logger");
const config = require("../config.json");
const stripe = require("stripe")(config.stripe.prod.secret);

async function getPlans(userid) {
    try {
        const plans = await stripe.plans.list({ active: true, limit: 40 });
        const products = await stripe.products.list({ active: true });
        logMessage(userid, "Products: " + products.data.map(i => i.name + " " + i.id).join("\n"))

        const fallbackProductIds = [
            "prod_SqgVHp8h05VYdK", // Single Agent
            "prod_SqhiqlqPzYOmYW", // Teams
        ]

        let filteredProductsData = []

        for (const product of products.data) {
            const showinpricing = product.metadata?.showinpricing;

            if (showinpricing && (showinpricing === "Yes" || showinpricing === "yes"))
                filteredProductsData.push(product)
        }

        if (filteredProductsData.length === 0)
            filteredProductsData = products.data.filter((prod) => fallbackProductIds.includes(prod.id)).map((prod) => ({ ...prod }));

        logMessage(userid, "Products: " + filteredProductsData.map(i => i.name).join(","))

        if (filteredProductsData) {
            filteredProductsData.map((product) => {

                product.prices = {
                    year: getPricePerProduct(product.id, plans, "year"),
                    month: getPricePerProduct(product.id, plans, "month"),
                };

                let multiplier = parseFloat(product.metadata?.multiplier || "1.0")

                if(isNaN(multiplier))
                    multiplier = 1.0

                product.prices.month.amount *= multiplier;
                product.prices.year.amount *= multiplier;
            });

            if (filteredProductsData.some(product => product.metadata.order)) {
                filteredProductsData.sort((a, b) => {
                    return (a.metadata.order ?? 0) - (b.metadata.order ?? 0);
                });
            }
            else {
                filteredProductsData.sort((a, b) => {
                    return a.prices.month.amount - b.prices.month.amount;
                });
            }

            return ({
                ...products,
                data: filteredProductsData.map(product => {
                    const metadataToRemove = ["showinpricing", "order", "multiplier"];
                
                    const metadata = {};
                    for (const [key, value] of Object.entries(product.metadata)) {
                        if (!metadataToRemove.includes(key))
                            metadata[key] = value;
                    }

                    return {
                        ...product,
                        metadata
                    }
                })
            });
        }
    } catch (error) {
        // DO SOME PROPER ERROR HANDLING!
        console.log("Error getting Stripe plans")
        console.log(error)
        logError(userid, JSON.stringify(error))
    }
}

module.exports = {
    getPlans
}