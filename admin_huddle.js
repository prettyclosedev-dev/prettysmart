const rp = require("request-promise");
const fs = require("fs");
const config = require("./config.json");
const { TokensApi } = require("@hubspot/api-client/lib/codegen/crm/timeline");

module.exports = {
  getToken,
  archiveUser,
  unarchiveUser,
  getUser,
  getAccount,
  signup,
  searchUser,
  reset,
  createAccount,
  createBrand,
  getBrand,
  addColorGroup,
  addColor,
  deleteColorGroup,
  deleteColor,
  getLogos,
  getUploadUrl,
  uploadLogo,
  deleteLogo,
  getFontsUploadUrl,
  uploadFont,
  getFonts,
};

async function getToken(unarchive) {
  let baseURL = "https://prettysmart.designhuddle.com/oauth/token";
  let form = {
    grant_type: "client_credentials",
    client_id: config.huddle.client_id,
    client_secret: config.huddle.client_secret,
  }

  if (unarchive) {
    form.account_status = "active";
    form.user_status = "active";
  }

  return rp({
    method: "post",
    url: baseURL,
    form: form,
    json: true,
  });
}

async function archiveUser(account) {
  let token = await getToken();
  return rp({
    method: "delete",
    url: `https://prettysmart.designhuddle.com/partners/api/account/users/${account.huddle_user_id}`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    json: true,
  });
}

async function searchUser(usr) {
  let token = await getToken(true);
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/partners/api/account/users?search=${usr.email}`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    json: true,
  });
}

async function unarchiveUser(account) {
  ///partners/api/accounts/users?search={email}&user_status=archived
  let token = await getToken(true);
  return rp({
    method: "post",
    url: `https://prettysmart.designhuddle.com/partners/api/account/users/${account.huddle_user_id}`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    json: true,
  });
}

async function getUser(token, account) {
  token = token || await getToken();
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/partners/api/account/users/${account.huddle_user_id}`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    json: true,
  });
}

async function getAccount(token, account) {
  token = token || await getToken();
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/partners/api/accounts/${account.huddle_account_id}`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    json: true,
  });
}

async function getBrand(token, account) {
  token = token || await getToken();
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/partners/api/brands?brand_name=${account.name}`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    json: true,
  });
}

async function reset(usr) {
  let token = await getToken(true);
  let brand = await createBrand(token.access_token, usr.account);
  let account = await getAccount(token, usr.account);
  let user = await getUser(token, usr.account);

  return {
    brand: brand.data,
    account: account.data,
    user: user.data,
  };
}

async function signup(usr, newAccount) {
  let token = await getToken(true);
  let brand = await createBrand(token.access_token, usr.account);
  let account = await createAccount(token.access_token, usr.account, brand.data);
  let user;
  if (newAccount) {
    user = await createUser(token.access_token, usr, account.data);
  } else {
    user = await getUser(token, usr.account);
  }
  
  return {
    brand: brand.data,
    account: account.data,
    user: user.data,
  };
}

async function createBrand(access_token, account) {
  return rp({
    method: "post",
    url: `https://prettysmart.designhuddle.com/partners/api/brands`,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: {
      brand_name: account.name,
    },
    json: true,
  });
}

async function createAccount(access_token, account, brand) {
  return rp({
    method: "post",
    url: `https://prettysmart.designhuddle.com/partners/api/accounts`,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: {
      account_name: account.name,
      account_status: "active",
      brand_ids: [brand.brand_id],
      user_group_ids: [2],
    },
    json: true,
  });
}

async function createUser(access_token, user, account) {
  return rp({
    method: "post",
    url: `https://prettysmart.designhuddle.com/partners/api/account/users`,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: {
      account_id: account.account_id,
      user_code: user._id,
      user_status: "active",
      email_address: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: 2,
    },
    json: true,
  });
}

async function addColorGroup(options) {
  let colorGroups = await rp({
    method: "get",
    url:
      "https://prettysmart.designhuddle.com/partners/api/colors?brand_id=" +
      options.brand_id,
    headers: {
      Authorization: `Bearer ${options.token.access_token}`,
    },
    json: true,
  });
  let colorGroup = colorGroups.data.items.find((group) => {
    return group.color_palette_name === options.name;
  });

  if (colorGroup) {
    return rp({
      method: "patch",
      url:
        "https://prettysmart.designhuddle.com/partners/api/colors/" +
        colorGroup.color_palette_id,
      headers: {
        Authorization: `Bearer ${options.token.access_token}`,
      },
      body: {
        brand_id: options.brand_id,
        color_palette_name: options.name,
        colors: options.colors,
        replace_colors: true,
      },
      json: true,
    });
  } else {
    return rp({
      method: "post",
      url: "https://prettysmart.designhuddle.com/partners/api/colors",
      headers: {
        Authorization: `Bearer ${options.token.access_token}`,
      },
      body: {
        brand_id: options.brand_id,
        color_palette_name: options.name,
        colors: options.colors,
      },
      json: true,
    });
  }
}

async function addColor(access_token, group, color) {
  // PATCH
  // https://prettysmart.designhuddle.com/partners/api/colors/{{group}}
  // {"color_palette_name":"Brand","colors":["#cccccc","#6b4646"],"replace_colors":true}
}

async function deleteColorGroup(access_token, group) {
  // DELETE
  // https://prettysmart.designhuddle.com/partners/api/colors/{{group}}
}

async function deleteColor(access_token, group, color) {
  // PATCH
  // https://prettysmart.designhuddle.com/partners/api/colors/{{group}}
  // {"color_palette_name":"Brand","colors":["#cccccc"],"replace_colors":true}
}

async function getLogos(brand_id) {
  let token = await getToken();
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/partners/api/logos?brand_id=${brand_id}`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    json: true,
  });
}

async function getUploadUrl(token, file_name) {
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/partners/api/logo/upload/url?file_name=${file_name}`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    json: true,
  });
}

async function uploadLogo(options) {
  let stat = fs.statSync(options.upload_path);

  return fs
    .createReadStream(options.upload_path)
    .pipe(
      rp({
        method: "put",
        url: options.uploadUrl,
        headers: {
          Authorization: `Bearer ${options.token.access_token}`,
          "Content-Length": stat.size,
        },
        json: true,
      })
    )
    .then((body) => {
      return rp({
        method: "post",
        url: "https://prettysmart.designhuddle.com/partners/api/logos",
        headers: {
          Authorization: `Bearer ${options.token.access_token}`,
        },
        body: {
          brand_id: options.brand_id,
          file_name: options.file_name,
          logo_name: options.file_name.split(".")[0],
          logo_url: options.uploadUrl,
        },
        json: true,
      });
    });
}

async function deleteLogo(access_token, file) {
  // DELETE
  // https://prettysmart.designhuddle.com/partners/api/logos/{{file}}
}

async function getFonts(token, brand_id) {
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/partners/api/fonts`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    qs: {
      brand_id: brand_id,
    },
    json: true,
  });
}

async function getFontsUploadUrl(token, file_name) {
  return rp({
    method: "get",
    url: `https://prettysmart.designhuddle.com/partners/api/font/upload/url`,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    qs: {
      file_name: file_name,
      // project_id: 'c662zaxcr0a0020pp8qg',
      // asset_type_id : 2
    },
    json: true,
  });
}

async function uploadFont(options) {
  let token = await getToken();
  let uploadUrl = await getFontsUploadUrl(token, options.font_file_name);
  let stat = fs.statSync(options.upload_path);
  let font_faces = {};
  font_faces[options.name] = uploadUrl.data.upload_url;

  return fs
    .createReadStream(options.upload_path)
    .pipe(
      rp({
        method: "put",
        url: uploadUrl.data.upload_url,
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Length": stat.size,
        },
        json: true,
      })
    )
    .then(async (body) => {
      let fonts = await getFonts(token, options.brand_id);
      let font = fonts.data.items.find((f) => {
        return f.font_family_name === options.font_family_name;
      });
      let font_url = "https://prettysmart.designhuddle.com/partners/api/fonts";

      if (font) {
        return rp({
          method: "patch",
          url: font_url + "/" + font.font_family_id,
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
          body: {
            font_faces: font_faces,
          },
          json: true,
        });
      } else {
        return rp({
          method: "post",
          url: font_url,
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
          body: {
            brand_id: options.brand_id,
            font_family_name: options.font_family_name,
            font_faces: font_faces,
          },
          json: true,
        });
      }
    });
}
