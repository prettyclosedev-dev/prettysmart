const request = require("request-promise");
const config = require("./config.json");

const findUserQuery = `
    query findUserByEmail($email: String!) {
        user(where: { email: $email }) {
            id
            email
            name
            role
            brands {
                id
                prettySmartId
                colors {
                    id
                    primary
                    rank
                    value
                }
                email
                icon
                industry
                logo
                name
                phone
                tagline
                wordmark
                fonts {
                    id
                    bold
                    google
                    id
                    italic
                    name
                    url
                    value
                }
            }
        }
    }
`;

const createUserMutation = `
    mutation createOneUser($data: UserCreateInput!) {
        createOneUser(data: $data) {
            id
            email
            name
            role
            brands {
                id
                prettySmartId
                colors {
                    id
                    primary
                    rank
                    value
                }
                email
                icon
                industry
                logo
                name
                phone
                tagline
                wordmark
                fonts {
                    id
                    bold
                    google
                    id
                    italic
                    name
                    url
                    value
                }
            }
        }
    }
`;

const updateUserMutation = `
    mutation updateOneUser($data: UserUpdateInput!, $where: UserWhereUniqueInput!) {
        updateOneUser(data: $data, where: $where) {
            id
            email
            name
            role
            brands {
                id
                prettySmartId
                colors {
                    id
                    primary
                    rank
                    value
                }
                email
                icon
                industry
                logo
                name
                phone
                tagline
                wordmark
                fonts {
                    id
                    bold
                    google
                    id
                    italic
                    name
                    url
                    value
                }
            }
        }
    }
`;

function mapAssetPath(user, type, fileName) {
  let assetPath =
    config.BASE_URL +
    "/files/" +
    user.account._id +
    "/" +
    type +
    "/" +
    fileName;
  return assetPath;
}

function mapAccountToGraphQLBrand(user, account, existingBrands = null) {
  const isUpdate = existingBrands != null;

  const findMatchingBrand = (accountId) => {
    return existingBrands.find((brand) => brand.prettySmartId === accountId);
  };

  const matchedBrand = isUpdate
    ? findMatchingBrand(account._id.toString())
    : null;

  if (isUpdate && !matchedBrand) {
    throw new Error("No matching brand found!");
  }

  const mappedFonts = Object.keys(account.brand.fonts).map((fontKey) => {
    const font = account.brand.fonts[fontKey];
    const fontData = {
      bold: isUpdate
        ? { set: fontKey.includes("Bold") }
        : fontKey.includes("Bold"),
      google: isUpdate ? { set: font.google } : font.google,
      italic: isUpdate
        ? { set: fontKey.includes("Italic") }
        : fontKey.includes("Italic"),
      name: isUpdate ? { set: font.name } : font.name,
      url: isUpdate ? { set: font.url || "" } : font.url,
      value: isUpdate ? { set: font.value } : font.value,
    };

    if (isUpdate && matchedBrand) {
      const existingFont = matchedBrand.fonts.find((f) => {
        const isBold = fontKey.includes("Bold") && f.bold;
        const isItalic = fontKey.includes("Italic") && f.italic;
        const isRegular =
          !fontKey.includes("Bold") &&
          !fontKey.includes("Italic") &&
          !f.bold &&
          !f.italic;
        return (isBold || isItalic || isRegular) && f.name === font.name;
      });

      if (existingFont) {
        return {
          where: { id: existingFont.id },
          data: fontData,
        };
      }
    }

    return fontData;
  });

  const mappedColors = [];
  if (account.brand.colors.primary) {
    const primaryColorData = {
      primary: isUpdate ? { set: true } : true,
      rank: isUpdate ? { set: 1 } : 1, // Adjust as needed
      value: isUpdate
        ? { set: account.brand.colors.primary }
        : account.brand.colors.primary,
    };
    if (isUpdate && matchedBrand) {
      const existingColor = matchedBrand.colors.find((c) => c.primary);
      mappedColors.push({
        where: { id: existingColor.id },
        data: primaryColorData,
      });
    } else {
      mappedColors.push(primaryColorData);
    }
  }

  if (account.brand.colors.secondary) {
    const secondaryColorData = {
      primary: isUpdate ? { set: false } : false,
      rank: isUpdate ? { set: 2 } : 2, // Adjust as needed
      value: isUpdate
        ? { set: account.brand.colors.secondary }
        : account.brand.colors.secondary,
    };
    if (isUpdate && matchedBrand) {
      const existingColor = matchedBrand.colors.find((c) => !c.primary);
      mappedColors.push({
        where: { id: existingColor.id },
        data: secondaryColorData,
      });
    } else {
      mappedColors.push(secondaryColorData);
    }
  }

  const logo = mapAssetPath(user, "logos", account.brand.logos.logo);
  const icon = mapAssetPath(user, "logos", account.brand.logos.icon);
  const watermark = mapAssetPath(user, "logos", account.brand.logos.watermark);

  const mappedBrand = {
    fonts: isUpdate
      ? mappedFonts != null && mappedFonts.length
        ? { update: mappedFonts }
        : null
      : { create: mappedFonts },
    colors: isUpdate
      ? mappedColors != null && mappedColors.length
        ? { update: mappedColors }
        : null
      : { create: mappedColors },
    email: isUpdate
      ? account.brand_email != null && account.brand_email.length
        ? { set: account.brand_email }
        : null
      : account.brand_email,
    icon: isUpdate
      ? icon != null && icon.length
        ? { set: icon }
        : null
      : icon,
    industry: isUpdate
      ? account.industry != null && account.industry.length
        ? { set: account.industry }
        : null
      : account.industry,
    logo: isUpdate
      ? logo != null && logo.length
        ? { set: logo }
        : null
      : logo,
    name: isUpdate
      ? account.name != null && account.name.length
        ? { set: account.name }
        : null
      : account.name,
    phone: isUpdate
      ? account.brand_phone != null && account.brand_phone.length
        ? { set: account.brand_phone }
        : null
      : account.brand_phone,
    tagline: isUpdate
      ? account.tagline != null && account.tagline.length
        ? { set: account.tagline }
        : null
      : account.tagline,
    wordmark: isUpdate
      ? watermark != null && watermark.length
        ? { set: watermark }
        : null
      : watermark,
  };

  return isUpdate
    ? { where: { id: matchedBrand.id }, data: mappedBrand }
    : { ...mappedBrand, prettySmartId: account._id.toString() };
}

async function handleBrandChange(user) {
  try {
    // First, check if the user exists
    let userExists = await graphqlRequest(findUserQuery, { email: user.email });

    if (userExists && userExists.user) {
      const updateData = {
        where: { id: userExists.user.id },
        data: {
          email: { set: user.email },
          name: { set: user.name },
          role: { set: user.role === "user" ? "VIEWER" : "ADMIN" },
          brands: {
            update:
              user.multiAccounts && user.multiAccounts.length
                ? user.multiAccounts.map((account) =>
                    mapAccountToGraphQLBrand(
                      user,
                      account,
                      userExists.user.brands
                    )
                  )
                : [
                    mapAccountToGraphQLBrand(
                      user,
                      user.account,
                      userExists.user.brands
                    ),
                  ],
          },
        },
      };
      console.log("\n\nupdateData\n===", JSON.stringify(updateData), "===\n\n");
      await graphqlRequest(updateUserMutation, updateData);
    } else {
      const createData = {
        data: {
          email: user.email,
          name: user.name,
          role: user.role === "user" ? "VIEWER" : "ADMIN",
          brands: {
            create:
              user.multiAccounts && user.multiAccounts.length
                ? user.multiAccounts.map((account) =>
                    mapAccountToGraphQLBrand(user, account)
                  )
                : [mapAccountToGraphQLBrand(user, user.account)],
          },
        },
      };
      console.log("\n\ncreateData\n===", JSON.stringify(createData), "===\n\n");
      return await graphqlRequest(createUserMutation, createData);
    }
  } catch (error) {
    console.log("Failed: ", error);
  }
}

async function graphqlRequest(query, variables) {
  const options = {
    headers: {
      Authorization: `Bearer ${config.CLYPS_API_KEY}`, //"c819f484-71e7-4514-b5ab-98d980f48442",
    },
    method: "POST",
    uri: "https://clyps.io/graphql",
    body: { query, variables },
    json: true,
  };

  return request(options)
    .then((response) => {
      console.log(JSON.stringify(response));
      return response.data;
    })
    .catch((error) => console.log(error));
}

module.exports = {
  handleBrandChange,
};
