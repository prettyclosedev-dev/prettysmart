const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const config = require("../config.json");
const Prompts = require("../schemas/prompts");
const { v4: uuidv4 } = require("uuid");
const { getFullCategories } = require("../clyps_api");

module.exports = () => {
  router.get("/", async (req, res) => {
    const prompts = await Prompts.find({});

    const categories = await getFullCategories({});

    const value = {
      masterMode: req.user.master ?? false,
      prompts: prompts.map((i) => ({
        id: i.id,
        title: i.title,
        desc: i.desc,
        category: i.category,
        prompt: i.prompt,
      })),
      fieldTemplates: [
        {
          key: "location_city",
          value: req.user.account.location_city,
        },
        {
          key: "location_country",
          value: req.user.account.location_country,
        },
      ],
      categories: categories,
    };

    res.render("ai", value);
  });

  router.post("/", async (req, res) => {
    /** Save prompt to database */

    try {
      let payload = req.body;

      console.log("saving prompt", req.body);

      if (!payload.id) payload.id = uuidv4();

      console.log("saving prompt 1", req.body);

      const result = await Prompts.findOneAndUpdate(
        {
          id: payload.id,
        },
        payload,
        { upsert: true }
      );

      console.log({ result });
      res.send({ success: true, id: payload.id });
    } catch (error) {
      console.log(error);
      res.send({ success: false, error: JSON.stringify(error) });
    }
  });

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
        model: "gpt-4.1-nano",
        input: newPrompt,
      });

      console.log(response.output_text);

      res.send({ response: response.output_text });
    } catch (error) {
      console.log({ error });
      res.send({ error });
    }
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;

    console.log("id", id);

    const prompt = await Prompts.findOne({ id });

    console.log("prompt ", prompt.category);
    
    res.send(prompt);
  });

  return router;
};
