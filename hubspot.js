const config = require("./config.json");
const hubspot = require("@hubspot/api-client");
const hubspotClient = new hubspot.Client({ accessToken: config.hubspot.api_key });
const moment = require("moment");

module.exports = {
  searchContactByEmail,
  getContactById,
  updateBrandColor,
  updateBrandLogo,
  updateBrandFont,
  updateContact,
  updateUsage,
  updateDownloadsCount,
};

function extractIdFromResponse(res) {
  return false;
  return res && res.results && res.results.length > 0 && res.results[0].id;
}

async function searchContactByEmail(email) {
  return false;
  const PublicObjectSearchRequest = {
    query: email,
    // properties: ["email", "firstname", "lastname", "primary_color", "secondary_color", "logos"],
  };

  return new Promise(async (resolve, reject) => {
    try {
      const apiResponse = await hubspotClient.crm.contacts.searchApi.doSearch(
        PublicObjectSearchRequest
      );
      resolve(extractIdFromResponse(apiResponse));
    } catch (e) {
      console.log(e);
      // e.message === "HTTP request failed"
      //   ? console.error(JSON.stringify(e.response, null, 2))
      //   : console.error(e);
      reject(e);
    }
  });
}

async function getContactById(contactId) {
  return false;
  return new Promise(async (resolve, reject) => {
    try {
      const apiResponse = await hubspotClient.crm.contacts.basicApi.getById(
        contactId
        // ["primary_color", "secondary_color", "logos"]
      );
      resolve(apiResponse);
    } catch (e) {
      console.log(e);
      // e.message === "HTTP request failed"
      //   ? console.error(JSON.stringify(e.response, null, 2))
      //   : console.error(e);
      reject(e);
    }
  });
}

async function updateContact(contactId, properties) {
  return false;
  const SimplePublicObjectInput = { properties };

  try {
    const apiResponse = await hubspotClient.crm.contacts.basicApi.update(
      contactId,
      SimplePublicObjectInput
    );
    console.log(JSON.stringify(apiResponse));
  } catch (e) {
    e.message === "HTTP request failed"
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e);
  }
}

async function updateBrandColor(contactId, primary, secondary) {
  return false;
  const properties = {
    primary_color: primary,
    secondary_color: secondary,
  };

  await updateContact(contactId, properties);
}

async function updateBrandLogo(contactId, logo) {
  return false;
  const properties = {
    logos: logo,
    brand_uploaded: "Yes",
  };

  await updateContact(contactId, properties);
}

async function updateBrandFont(contactId, font, isGoogle) {
  return false;
  const properties = isGoogle
    ? { google_font: font }
    : {
        fonts: font,
      };

  await updateContact(contactId, properties);
}

async function updateUsage(contactId, usage) {
  return false;
  const properties = {
    number_of_credits_left: usage,
    last_design_generated_date: moment().format("YYYY-MM-DD").toString(),
  };

  await updateContact(contactId, properties);
}

async function updateDownloadsCount(contactId, count) {
  return false;
  const properties = { number_of_templates_downloaded: count };

  await updateContact(contactId, properties);
}

async function enrollToWorkflow(workFlowId, email) {
  return false;
  // const apiResponse = await hubspotClient.
  //https://api.hubapi.com/automation/v2/workflows/10900/enrollments/contacts/testingapis@hubspot.com?hapikey=demo
  const response = await hubspotClient.apiRequest({
    method: "post",
    path: `/automation/v2/workflows/${workFlowId}/contacts/${email}`,
    qs: {
      hapikey: config.hubspot.api_key,
    },
  });
  const json = await response.json();
  console.log(json);
}
