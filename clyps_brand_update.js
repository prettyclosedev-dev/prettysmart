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

const findUserFavoritesQuery = `
    query findUserByEmail($email: String!) {
        user(where: { email: $email }) {
            id
            email
            name
            favorites {
                id
                name
                categories {
                  id
                  name
                  tags
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
            avatar
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

const updateUserFavoritesMutation = `
    mutation updateOneUser($data: UserUpdateInput!, $where: UserWhereUniqueInput!) {
        updateOneUser(data: $data, where: $where) {
            id
            email
            name
            favorites {
                id
                name
                categories {
                  id
                  name
                  tags
                }
            }
        }
    }
`;

async function findUserByEmail(email, favorites) {
  const query = favorites ? findUserFavoritesQuery : findUserQuery;
  const variables = { email };

  const response = await graphqlRequest(query, variables);
  return response.user;
}

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
  let isUpdate = existingBrands != null;

  const findMatchingBrand = (accountId) => {
    return existingBrands.find((brand) => brand.prettySmartId === accountId);
  };

  const matchedBrand = isUpdate
    ? findMatchingBrand(account._id.toString())
    : null;

  if (isUpdate && !matchedBrand) {
    isUpdate = false;
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
        const isBold = fontKey === "Bold" && f.bold && !f.italic;
        const isItalic = fontKey === "Italic" && f.italic && !f.bold;
        const isRegular = fontKey === "Regular" && !f.bold && !f.italic;
        const isBoldItalic = fontKey === "BoldItalic" && f.bold && f.italic;
        return isBold || isItalic || isRegular || isBoldItalic;
      });

      if (existingFont) {
        return {
          where: { id: existingFont.id },
          data: fontData,
        };
      } else {
        return null;
      }
    }

    return fontData;
  });

  mappedFonts.filter((f) => f != null);

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
      let updates = [];
      let creates = [];

      if (user.multiAccounts && user.multiAccounts.length) {
        user.multiAccounts.forEach((account) => {
          const result = mapAccountToGraphQLBrand(
            user,
            account,
            userExists.user.brands
          );
          if (result.where) {
            updates.push(result);
          } else {
            creates.push(result);
          }
        });
      } else {
        const result = mapAccountToGraphQLBrand(
          user,
          user.account,
          userExists.user.brands
        );

        if (result.where) {
          updates.push(result);
        } else {
          creates.push(result);
        }
      }

      const updateData = {
        where: { id: userExists.user.id },
        data: {
          // email: { set: user.email }, // causes unique constraint error for same user email
          name: { set: user.name },
          avatar: user.avatar ? { set: config.BASE_URL + user.avatar } : null,
          role: {
            set:
              user.role === "owner" || user.role === "admin"
                ? "ADMIN"
                : "VIEWER",
          },
          brands: {
            update: updates,
            create: creates,
          },
        },
      };

      if (userExists.user.email !== user.email) {
        updateData.data.email = { set: user.email };
      }

      // Use map to modify each brand update and conditionally remove the email field
      updateData.data.brands.update = updateData.data.brands.update.map(
        (brandUpdate) => {
          const existingBrand = userExists.user.brands.find(
            (b) => b.id === brandUpdate.where.id
          );

          // Only update the email if it's different
          if (brandUpdate.data.email) {
            if (brandUpdate.data.email.set === existingBrand.email) {
              delete brandUpdate.data.email; // Remove the email update if it's the same
            }
          }

          return brandUpdate; // Return the modified brandUpdate object
        }
      );

      console.log("\n\nupdateData\n===", JSON.stringify(updateData), "===\n\n");
      await graphqlRequest(updateUserMutation, updateData);
    } else {
      const createData = {
        data: {
          email: user.email,
          name: user.name,
          avatar: user.avatar ? config.BASE_URL + user.avatar : null,
          role:
            user.role === "owner" || user.role === "admin" ? "ADMIN" : "VIEWER",
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

async function updateUserFavorites(
  userId,
  favoritesToConnect,
  favoritesToDisconnect
) {
  const query = updateUserFavoritesMutation;

  const variables = {
    where: { id: userId },
    data: {
      favorites: {
        connect: favoritesToConnect.filter((fav) => !isNaN(fav.id)), // Ensure valid IDs
        disconnect: favoritesToDisconnect.filter((fav) => !isNaN(fav.id)), // Ensure valid IDs
      },
    },
  };

  return graphqlRequest(query, variables);
}

async function addFavorite(userEmail, designId) {
  const user = await findUserByEmail(userEmail, true);
  if (!user) {
    throw new Error("User not found");
  }

  const favorites = user.favorites || [];
  const parsedDesignId = parseInt(designId);
  if (isNaN(parsedDesignId)) {
    throw new Error("Invalid designId");
  }

  if (!favorites.some((fav) => fav.id === parsedDesignId)) {
    const favoritesToConnect = [{ id: parsedDesignId }];
    const favoritesToDisconnect = []; // No need to disconnect any favorites

    return updateUserFavorites(
      user.id,
      favoritesToConnect,
      favoritesToDisconnect
    );
  }

  return { message: "Favorite already exists" };
}

async function removeFavorite(userEmail, designId) {
  const user = await findUserByEmail(userEmail, true);
  if (!user) {
    throw new Error("User not found");
  }

  const favorites = user.favorites || [];
  const parsedDesignId = parseInt(designId);
  if (isNaN(parsedDesignId)) {
    throw new Error("Invalid designId");
  }

  if (favorites.some((fav) => fav.id === parsedDesignId)) {
    const favoritesToConnect = []; // No need to connect any favorites
    const favoritesToDisconnect = [{ id: parsedDesignId }];

    return updateUserFavorites(
      user.id,
      favoritesToConnect,
      favoritesToDisconnect
    );
  }

  return { message: "Favorite not found" };
}

async function getUserFavorites(userEmail) {
  const query = findUserFavoritesQuery;
  const variables = { email: userEmail };

  const response = await graphqlRequest(query, variables);
  if (!response.user) {
    throw new Error("User not found");
  }

  return response.user.favorites || [];
}

async function graphqlRequest(query, variables) {
  const options = {
    headers: {
      Authorization: `Bearer ${config.CLYPS_API_KEY}`, //"c819f484-71e7-4514-b5ab-98d980f48442",
    },
    method: "POST",
    uri: `${config.CLYPS_BASE_URL}/graphql`,
    body: { query, variables },
    json: true,
  };

  return request(options)
    .then((response) => {
      // console.log("\n\nresponse\n===", JSON.stringify(response), "===\n\n");

      if (response.errors) {
        console.error("errors:", response.errors);
        throw new Error("Failed to execute request");
      }

      console.log("\n\nresponse.data\n===", response.data, "===\n\n");

      return response.data;
    })
    .catch((error) => {
      console.error(error);
      throw new Error("Failed to execute request");
    });
}

module.exports = {
  handleBrandChange,
  addFavorite,
  removeFavorite,
  getUserFavorites,
};
