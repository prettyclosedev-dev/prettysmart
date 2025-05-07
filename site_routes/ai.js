const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const config = require("../config.json");

// // v4 SDK: default export
// const openai = new OpenAI({
//   apiKey: config.OPENAI_API_KEY,
//   // organization: process.env.ORGANIZATION, // if you need it
// });

module.exports = () => {
  router.get("/", async (req, res) => {
    res.render("ai", {
      prompts: [
        {
          id: "parks",
          name: "Parks",
          prompt: `Create a JSON-formatted social media post about parks in {{location_city}}, {{location_country}} with the following structure:

            title

            subheadline1 (brief description)

            subheadline2 (intro to list)

            5 items each with:

            title

            picture (search for actual links)

            description

            Output: JSON only.`,
        },
        {
          id: "tourist-spots",
          name: "Tourist Spots",
          prompt:
            "Find me a tourist spot in {{location_city}}, {{location_country}}",
        },
        {
          id: "restaurants",
          name: "Restaurants",
          prompt:
            "Find me a restaurant in {{location_city}}, {{location_country}}",
        },
        {
          id: "hotels",
          name: "Hotels",
          prompt: "Find me a hotel in {{location_city}}, {{location_country}}",
        },
        {
          id: "attractions",
          name: "Attractions",
          prompt:
            "Find me an attraction in {{location_city}}, {{location_country}}",
        },
        {
          id: "things-to-do",
          name: "Things to do",
          prompt:
            "Find me things to do in {{location_city}}, {{location_country}}",
        },
        {
          id: "things-to-see",
          name: "Things to see",
          prompt:
            "Find me things to see in {{location_city}}, {{location_country}}",
        },
        {
          id: "things-to-eat",
          name: "Things to eat",
          prompt:
            "Find me things to eat in {{location_city}}, {{location_country}}",
        },
        {
          id: "things-to-drink",
          name: "Things to drink",
          prompt:
            "Find me things to drink in {{location_city}}, {{location_country}}",
        },
        {
          id: "things-to-visit",
          name: "Things to visit",
          prompt:
            "Find me things to visit in {{location_city}}, {{location_country}}",
        },
      ],
    });
  });

  router.post("/", async (req, res) => {});

  /**
   * Test prompt to ChatGPT and return response
   */
  router.post("/test", async (req, res) => {
    const { prompt } = req.body;
    let newPrompt = prompt;

    if (!prompt) return res.send("Prompt is required");

    if (/{{\w*}}/gm.test(prompt)) {
      newPrompt = prompt + ". replace fields in {{ }} with any correct data";
    }

    console.log("newPrompt", newPrompt);

    try {
      const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: newPrompt,
      });

      console.log(response.output_text);

      res.send({ response: response.output_text });
    } catch (error) {
      console.log({ error });
      res.send({ error });
    }
  });

  return router;
};
