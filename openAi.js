const OpenAI = require("openai-api");
const _ = require("lodash");
const OPENAI_API_KEY = "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";
const openai = new OpenAI(OPENAI_API_KEY);

module.exports = {
  getIndustryAndWhatWeAre,
  getSlogan,
  getKeywordsA,
  getKeywordsB,
  getPlurals,
  getSuperlatives,
  getAIFields,
  getTagline,
  getShortSlogan,
};

async function getIndustryAndWhatWeAre(options) {
  try {
    const gptResponse = await openai.complete({
      engine: "davinci",
      prompt: `
            description is a users interpretation of what a brand does.
            industry describes the industry of the described company. for use in a sentence like "we are the best in the music industry".
            what we do describes the company type, store or location.
            ###
            description: coffee shop
            industry: coffee
            what we are: coffee shop
            --
            description:  we provide health and dental insurance
            industry: health insurance
            what we are: health insurance agency
            --
            description: playlists platform for retail stores
            industry: music what we are: retail playlist platform
            --
            description:  branding
            industry: design
            what we are: branding agency
            --
            description:  local supermarket
            industry: food
            what we are: supermarket
            --
            description: we give you hard money loans for your real estate
            industry: finance
            what we are: lending agency
            --
            description: ${options.description}
        `,
      temperature: 0,
      max_tokens: 64,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["--"],
    });
    const obj = {};

    if (gptResponse && gptResponse.data) {
      gptResponse.data.choices.forEach((choice) => {
        if (choice.text) {
          let rows = choice.text.trim().split("\n");

          rows.forEach((row) => {
            let split = row.split(":");
            if (split && split.length > 1) {
              let key = split[0].trim();
              let value = split[1].trim();
              obj[key] = value;
            }
          });
        }
      });
    }
    return obj;
  } catch (error) {
    console.log(error);
  }
}

async function getSlogan(options) {
  try {
    const gptResponse = await openai.complete({
      engine: "davinci",
      prompt: `
            creative slogan generator. all slogans are really clever.
            ##
            description: coffee shop
            industry: coffee
            what we are: a coffee shop
            slogan: coffee with character.
            ###
            description:  we provide health and dental insurance
            industry: health insurance
            what we are: a health insurance agency
            slogan: your health, your choice.
            ###
            description:  branding
            industry: design
            what we are: a branding agency
            slogan: clarity through design.
            ###
            description: funding for autism
            industry: charity
            what we are: a charity
            slogan: your child is our priority.
            ###
            description:  local supermarket
            industry: food
            what we are: a supermarket
            slogan: its all inside.
            ###
            description: we give you hard money loans for your real estate 
            industry: finance
            what we are: a lending agency
            slogan: always where you are.
            ###
            description: retail store for home accessories
            industry: home
            what we are: a home accessories store
            slogan: beauty lies in details.
            ###
            industry: car wash
            slogan: clean cars go far.
            ###
            description: custom phone cases
            industry: phone cases
            what we are: a phone case companyslogan: your phone, your style.
            ###
            description: newspaper about electric cars
            industry: electric cars
            what we are: an electric car newspaper
            slogan: the future is now.
            ###
            description: ${options.description}
            industry: ${options.industry}
            what we are: ${options.whatWeAre}
        `,
      temperature: 0.2,
      max_tokens: 64,
      top_p: 1,
      frequency_penalty: 1,
      presence_penalty: 1,
      stop: ["\n"],
    });
    const obj = {};

    if (gptResponse && gptResponse.data) {
      gptResponse.data.choices.forEach((choice) => {
        if (choice.text) {
          let rows = choice.text.trim().split("\n");
          rows.forEach((row) => {
            let key = row.split(":")[0].trim();
            let value = row.split(":")[1].trim();
            obj[key] = value;
          });
        }
      });
    }
    return obj;
  } catch (error) {
    console.log(error);
  }
}

async function getKeywordsA(options) {
  try {
    const gptResponse = await openai.complete({
      engine: "davinci-instruct-beta",
      prompt: `
            create 3 examples for each of the following, based on a description of a company, and the related industry.
            employee: generate 3 creative sample for someone who might work for this industry 
            current verb: generate 3 present participle positive actions that the company  does for their clients. 
            you need it for your: generate 3 gaps facing a client, that this industry aims to fill.
            a solution: generate 3 clever solutions to the "you need it for your". if it's singular, include the indefinite article - the word "a".
            the following are samples and the list of sample results.
            ##
            description: web development for brands
            industry: web
            --
            employee: web developer, web designer, seo expert
            current verb: developing websites, designing websites, building your site
            you need it for your: business, store, online presence
            a solution: a website project, a website design, a responsive website
            ##
            description: coffee shop in brooklyn
            industry: coffee
            --
            employee: barista, coffee shop guy, coffee expert
            current verb: brewing your coffee, serving coffee, feeding clients
            you need it for your: thirst, laziness, tiredness
            a solution: a coffee, a cup of joe, a beverage
            ##
            description: hard money loans
            industry: finance
            --
            employee: lender, broker, loan consultant
            current verb: finding the best loans, funding, providing capital
            you need it for your: real estate, lack of funds, opportunities
            a solution: a loan, funding, capital
            ##
            description: car wash
            industry: car wash
            --
            employee: detailing expert, car wash attendant, cleaning professional
            current verb: washing cars, cleaning your car, detailing autos
            you need it for your: car, vehicle, dirty car
            a solution: a wash, a clean, a makeover
            ##
            description: local supermarket 
            industry: food
            --
            employee: cashier, produce manager, employees
            current verb: providing a great shopping experience, bringing new products, listening to our shoppers
            you need it for your: fridge, hunger, empty pantry
            a solution: food, a grocery order, produce
            ##
            description: providing playlists for shoppers to listen while shopping
            industry: music
            --
            employee: playlist curator, music producer, music expert
            current verb: creating playlists, curating music, providing music
            you need it for your: customers' shopping experience, store, customers
            a solution: a playlist, a song, a tune
            ##
            description: branding design 
            industry: branding
            --
            employee: branding expert, designer, brand developer
            current verb: creating a brand, designing a brand, branding your business
            you need it for your: business, company, branding needs
            a solution: a brand, a logo, a design
            ##
            description: seo for local supermarkets
            industry: web 
            --
            employee: seo expert, seo consultant, seo specialist
            current verb: optimizing your website, improving your ranking, increasing your traffic
            you need it for your: website, sales, online presence
            a solution: a seo project, web services, a findable website
            ##
            description: phone cases
            industry: smartphone accesories
            --
            employee: phone case designer, phone case manufacturer, phone case expert
            current verb: designing phone cases, manufacturing phone cases, selling phone cases
            you need it for your: phone, device, smartphone 
            a solution: a phone case, a phone cover, a phone accessory
            ##
            description: ${options.description}
            industry: ${options.industry}
            `,
      temperature: 0,
      max_tokens: 100,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 1,
      stop: ["##"],
    });
    const obj = {};

    if (gptResponse && gptResponse.data) {
      gptResponse.data.choices.forEach((choice) => {
        if (choice.text) {
          let rows = choice.text.trim().split("\n");
          rows.forEach((row) => {
            let split = row.split(":");
            if (split && split.length > 1) {
              let key = split[0].trim();
              let value = split[1].trim();
              obj[key] = value;
            }
          });
        }
      });
    }

    return obj;
  } catch (error) {
    console.log(error);
  }
}

async function getKeywordsB(options) {
  try {
    const gptResponse = await openai.complete({
      engine: "davinci-instruct-beta",
      prompt: `
            create 3 examples for each of the following, based on a description of a company, and the related industry.
            adjective: generate 3 positive adjectives, for use with deliverable.
            deliverable: generate 3 deliverables. do not start with the indefinite article.
            benefit: generate 3 causative positive results for a client of said industry. make some short ones and some long ones.
            the following are samples and the list of sample results.
            ##
            description: web development for brands
            industry: web
            --
            adjective: responsive, intuitive, modern
            deliverable: website, web design, website
            benefit: get a website, be seen online, make some noise
            ##
            description: coffee shop in brooklyn
            industry: coffee
            --
            adjective: warm, fresh, delicious
            deliverable: coffee, cup of joe, beverage
            benefit: start your day, wake you up, give you a boost
            ##
            description: hard money loans
            industry: finance
            --
            adjective: quick, large, top
            deliverable: loan, funding, money
            benefit: be funded, get your capital, create cash flow
            ##
            description: car wash
            industry: car wash
            --
            adjective: in-depth, rigorously, thoroughly
            deliverable: cleaned car, polished vehicle, sparkling auto
            benefit: get your car cleaned, drive a polished car, drive a tidy car
            ##
            description: local supermarket 
            industry: food
            --
            adjective: great, file, amazing
            deliverable: shopping space, selection, vibe
            benefit: get your food delivered, enjoy your shopping experience, be in and out with your order
            ##
            description: providing playlists for shoppers to listen while shopping
            industry: music
            --
            adjective: upbeat, fun, awesome
            deliverable: music, song, tune
            benefit: make their shopping experience better, help your customers' enjoy their shopping, get a custom playlist
            ##
            description: branding design 
            industry: branding
            --
            adjective: unique, bold, creative
            deliverable: brand, logo, brand identity
            benefit: create an impact, brand your business, get a beautiful logo
            ##
            description: seo for local supermarkets
            industry: web 
            --
            adjective: smart, creative, trusted
            deliverable: seo, optimization, search engine optimization
            benefit: get higher ranking, be seen faster, make your website famous
            ##
            description: phone cases
            industry: smartphone accesories
            --
            adjective: protective, stylish, durable
            deliverable: phone case, phone cover, phone accessory
            benefit: protect your phone, make your phone look good, get a new phone case
            ##
            description: ${options.description}
            industry: ${options.industry}`,
      temperature: 0,
      max_tokens: 100,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 1,
      stop: ["##"],
    });
    const obj = {};

    if (gptResponse && gptResponse.data) {
      gptResponse.data.choices.forEach((choice) => {
        if (choice.text) {
          let rows = choice.text.trim().split("\n");
          rows.forEach((row) => {
            let split = row.split(":");
            if (split && split.length > 1) {
              let key = split[0].trim();
              let value = split[1].trim();
              obj[key] = value;
            }
          });
        }
      });
    }

    return obj;
  } catch (error) {
    console.log(error);
  }
}

async function getPlurals(options) {
  try {
    const gptResponse = await openai.complete({
      engine: "davinci-instruct-beta",
      prompt: `
            convert the input terms to plural.
            #
            input:${options.input}
            plural:
            `,
      temperature: 0.7,
      max_tokens: 64,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["\n"],
    });
    const obj = {};

    if (gptResponse && gptResponse.data) {
      gptResponse.data.choices.forEach((choice) => {
        if (choice.text) {
          obj.plurals = choice.text.trim().split(",");
        }
      });
    }

    return obj;
  } catch (error) {
    console.log(error);
  }
}

async function getSuperlatives(options) {
  try {
    const gptResponse = await openai.complete({
      engine: "davinci-instruct-beta",
      prompt: `convert the following adjectives to superlatives. if there are no correct superlatives for that word, add "most" before it. don't add any modifiers or grammatical articles.

            adjective: creative, fresh, many
            superlative: most creative, freshest, most
            
            adjective: kind, horrible, clean
            superlative: kindest, most horrible, cleanest
            
            adjective: sad, well, gullible
            superlative: saddest, best, most gullible
            
            adjective: ${options.adjective}
            superlative:`,
      temperature: 0,
      max_tokens: 64,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["\n"],
    });
    const obj = {};

    if (gptResponse && gptResponse.data) {
      gptResponse.data.choices.forEach((choice) => {
        if (choice.text) {
          if (choice.text) {
            obj.superlatives = choice.text.trim().split(",");
          }
        }
      });
    }

    return obj;
  } catch (error) {
    console.log(error);
  }
}

async function getTagline(description) {
  let industry_whatWeAre = await getIndustryAndWhatWeAre({
    description: description,
  });
  let slogan = await getSlogan({
    description: description,
    industry: industry_whatWeAre.industry,
    whatWeAre: industry_whatWeAre["what we are"],
  });

  return {
    slogan: slogan.slogan,
    industry: industry_whatWeAre.industry,
    whatWeAre: industry_whatWeAre["what we are"],
  };
}

async function getAIFields(description) {
  if (!description) {
    return;
  }

  try {
    let industry_whatWeAre = await getIndustryAndWhatWeAre({
      description: description,
    });
    let keywordsA = await getKeywordsA({
      description: description,
      industry: industry_whatWeAre.industry,
    });

    let keywordsB = await getKeywordsB({
      description: description,
      industry: industry_whatWeAre.industry,
    });

    let keywords = Object.assign(keywordsA, keywordsB);

    let plurals = await getPlurals({
      input: [
        keywords.employee,
        keywords["you need it for your"],
        keywords["a solution"],
        keywords.deliverable,
      ].join(","),
    });

    let superlatives = await getSuperlatives({
      adjective: keywords.adjective,
    });

    return {
      employee_1: keywords.employee
        ? trim(keywords.employee.split(",")[0])
        : "",
      employee_1_plural: plurals.plurals ? trim(plurals.plurals[0]) : "",
      employee_2: keywords.employee
        ? trim(keywords.employee.split(",")[1])
        : "",
      employee_2_plural: plurals.plurals ? trim(plurals.plurals[1]) : "",
      employee_3: keywords.employee
        ? trim(keywords.employee.split(",")[2])
        : "",
      employee_3_plural: plurals.plurals ? trim(plurals.plurals[2]) : "",

      verb_1: keywords["current verb"]
        ? trim(keywords["current verb"].split(",")[0])
        : "",
      verb_2: keywords["current verb"]
        ? trim(keywords["current verb"].split(",")[1])
        : "",
      verb_3: keywords["current verb"]
        ? trim(keywords["current verb"].split(",")[2])
        : "",

      need_1: keywords["you need it for your"]
        ? trim(keywords["you need it for your"].split(",")[0])
        : "",
      need_1_plural: plurals.plurals ? trim(plurals.plurals[3]) : "",
      need_2: keywords["you need it for your"]
        ? trim(keywords["you need it for your"].split(",")[1])
        : "",
      need_2_plural: plurals.plurals ? trim(plurals.plurals[4]) : "",
      need_3: keywords["you need it for your"]
        ? trim(keywords["you need it for your"].split(",")[2])
        : "",
      need_3_plural: plurals.plurals ? trim(plurals.plurals[5]) : "",

      solution_1: keywords["a solution"]
        ? trim(keywords["a solution"].split(",")[0])
        : "",
      solution_1_plural: plurals.plurals ? trim(plurals.plurals[6]) : "",
      solution_2: keywords["a solution"]
        ? trim(keywords["a solution"].split(",")[1])
        : "",
      solution_2_plural: plurals.plurals ? trim(plurals.plurals[7]) : "",
      solution_3: keywords["a solution"]
        ? trim(keywords["a solution"].split(",")[2])
        : "",
      solution_3_plural: plurals.plurals ? trim(plurals.plurals[8]) : "",

      adjective_1: keywords.adjective
        ? trim(keywords.adjective.split(",")[0])
        : "",
      adjective_1_superlative: superlatives.superlatives
        ? trim(superlatives.superlatives[0])
        : "",
      adjective_2: keywords.adjective
        ? trim(keywords.adjective.split(",")[1])
        : "",
      adjective_2_superlative: superlatives.superlatives
        ? trim(superlatives.superlatives[1])
        : "",
      adjective_3: keywords.adjective
        ? trim(keywords.adjective.split(",")[2])
        : "",
      adjective_3_superlative: superlatives.superlatives
        ? trim(superlatives.superlatives[2])
        : "",

      deliverable_1: keywords.deliverable
        ? trim(keywords.deliverable.split(",")[0])
        : "",
      deliverable_1_plural: plurals.plurals ? trim(plurals.plurals[9]) : "",
      deliverable_2: keywords.deliverable
        ? trim(keywords.deliverable.split(",")[1])
        : "",
      deliverable_2_plural: plurals.plurals ? trim(plurals.plurals[10]) : "",
      deliverable_3: keywords.deliverable
        ? trim(keywords.deliverable.split(",")[2])
        : "",
      deliverable_3_plural: plurals.plurals ? trim(plurals.plurals[11]) : "",

      benefit_1: keywords.benefit ? trim(keywords.benefit.split(",")[0]) : "",
      benefit_2: keywords.benefit ? trim(keywords.benefit.split(",")[1]) : "",
      benefit_3: keywords.benefit ? trim(keywords.benefit.split(",")[2]) : "",

      // employee : {
      //     1 : {
      //         keyword : trim(keywords.employee.split(',')[0]),
      //         plural: trim(plurals.plurals[0])
      //     },
      //     2 : {
      //         keyword : trim(keywords.employee.split(',')[1]),
      //         plural: trim(plurals.plurals[1])
      //     },
      //     3 : {
      //         keyword : trim(keywords.employee.split(',')[2]),
      //         plural: trim(plurals.plurals[2])
      //     }
      // },
      // verb : {
      //     1 : {
      //         keyword : trim(keywords['current verb'].split(',')[0])
      //     },
      //     2 : {
      //         keyword : trim(keywords['current verb'].split(',')[1])
      //     },
      //     3 : {
      //         keyword : trim(keywords['current verb'].split(',')[2])
      //     }
      // },
      // need : {
      //     1 : {
      //         keyword : trim(keywords['you need it for your'].split(',')[0]),
      //         plural: trim(plurals.plurals[3])
      //     },
      //     2 : {
      //         keyword : trim(keywords['you need it for your'].split(',')[1]),
      //         plural: trim(plurals.plurals[4])
      //     },
      //     3 : {
      //         keyword : trim(keywords['you need it for your'].split(',')[2]),
      //         plural: trim(plurals.plurals[5])
      //     }
      // },
      // solution : {
      //     1 : {
      //         keyword : trim(keywords['a solution'].split(',')[0]),
      //         plural: trim(plurals.plurals[6])
      //     },
      //     2 : {
      //         keyword : trim(keywords['a solution'].split(',')[1]),
      //         plural: trim(plurals.plurals[7])
      //     },
      //     3 : {
      //         keyword : trim(keywords['a solution'].split(',')[2]),
      //         plural: trim(plurals.plurals[8])
      //     }
      // },
      // adjective : {
      //     1 : {
      //         keyword : trim(keywords.adjective.split(',')[0]),
      //         superlative: trim(superlatives.superlatives[0])
      //     },
      //     2 : {
      //         keyword : trim(keywords.adjective.split(',')[1]),
      //         superlative: trim(superlatives.superlatives[1])
      //     },
      //     3 : {
      //         keyword : trim(keywords.adjective.split(',')[2]),
      //         superlative: trim(superlatives.superlatives[2])
      //     }
      // },
      // deliverable : {
      //     1 : {
      //         keyword : trim(keywords.deliverable.split(',')[0]),
      //         plural: trim(plurals.plurals[9])
      //     },
      //     2 : {
      //         keyword : trim(keywords.deliverable.split(',')[1]),
      //         plural: trim(plurals.plurals[10])
      //     },
      //     3 : {
      //         keyword : trim(keywords.deliverable.split(',')[2]),
      //         plural: trim(plurals.plurals[11])
      //     }
      // },
      // benefit : {
      //     1 : {
      //         keyword : trim(keywords.benefit.split(',')[0])
      //     },
      //     2 : {
      //         keyword : trim(keywords.benefit.split(',')[1])
      //     },
      //     3 : {
      //         keyword : trim(keywords.benefit.split(',')[2])
      //     }
      // },
    };
  } catch (error) {
    console.log(error);
  }
}

async function getShortSlogan(options) {
  try {
    const gptResponse = await openai.complete({
      engine: options.settings ? options.settings.engine : "davinci",
      prompt: `${options.description}`,
      temperature: options.settings ? options.settings.temperature : 0.73,
      max_tokens: options.settings ? options.settings.max_tokens : 32,
      top_p: options.settings ? options.settings.top_p : 0.7,
      frequency_penalty: options.settings
        ? options.settings.frequency_penalty
        : 0,
      presence_penalty: options.settings
        ? options.settings.presence_penalty
        : 0,
      stop: options.settings ? [options.settings.stop] : ["\n"],
    });

    const obj = {};

    if (gptResponse && gptResponse.data) {
      gptResponse.data.choices.forEach((choice) => {
        if (choice.text) {
          choice.text = choice.text.replace(/^\s*[\r\n]/gm, "");
          obj.text = choice.text.trim();
        }
      });
    }

    return obj;
  } catch (error) {
    throw error
    // console.log(error);
  }
}

function trim(str) {
  return str ? str.trim() : "";
}

function toArray(str) {
  return str ? str.split(",") : [];
}
