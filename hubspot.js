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
}

async function searchContactByEmail(email) {
  return false;
}

async function getContactById(contactId) {
  return false;
}

async function updateContact(contactId, properties) {
  return false;
}

async function updateBrandColor(contactId, primary, secondary) {
  return false;
}

async function updateBrandLogo(contactId, logo) {
  return false;
}

async function updateBrandFont(contactId, font, isGoogle) {
  return false;
}

async function updateUsage(contactId, usage) {
  return false;
}

async function updateDownloadsCount(contactId, count) {
  return false;
}

async function enrollToWorkflow(workFlowId, email) {
  return false;
}
