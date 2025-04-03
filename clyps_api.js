const request = require("request-promise");
const config = require("./config.json");

async function getBrandedDesigns({user, where, take = 30, skip, orderBy, cursor, brandWhere, withPreview = false}) {
  const query = `
    query getBrandedDesigns($where: DesignWhereInput, $take: Int, $skip: Int, $orderBy: [DesignOrderByWithRelationInput!], $cursor: DesignWhereUniqueInput, $email: String!, $brandWhere: BrandWhereUniqueInput, $withPreview: Boolean) {
      brandedDesigns(where: $where, take: $take, skip: $skip, orderBy: $orderBy, cursor: $cursor, email: $email, brandWhere: $brandWhere, withPreview: $withPreview)
    }
  `;

  const variables = {
    email: user.email,
    where,
    take,
    skip,
    orderBy,
    cursor,
    brandWhere,
    withPreview,
  };

  return graphqlRequest(query, variables);
}

async function getDesigns({where, take, skip, orderBy, cursor}) {
  const query = `
    query getDesigns($where: DesignWhereInput, $take: Int, $skip: Int, $orderBy: [DesignOrderByWithRelationInput!], $cursor: DesignWhereUniqueInput) {
      designs(where: $where, take: $take, skip: $skip, orderBy: $orderBy, cursor: $cursor) {
        id
        name
        categories {
          id
          name
          tags
          size
        }
      }
    }
  `;

  const variables = {
    where,
    take,
    skip,
    orderBy,
    cursor,
  };

  return graphqlRequest(query, variables);
}

async function getDesignsCount({where}) {
  const query = `
    query getDesignsCount($where: DesignWhereInput) {
      designsCount(where: $where)
    }
  `;

  const variables = {
    where,
  };

  return graphqlRequest(query, variables);
}

async function getBrandedDesign({user, where, brandWhere, withPreview = true, additional, previewOptions, returnParams = ["id", "name", "preview"]}) {
  const query = `
    query getBrandedDesign($email: String!, $where: DesignWhereUniqueInput!, $brandWhere: BrandWhereUniqueInput, $withPreview: Boolean, $returnParams: [String], $additional: Json, $previewOptions: Json) {
      brandedDesign(email: $email, where: $where, brandWhere: $brandWhere, withPreview: $withPreview, returnParams: $returnParams, additional: $additional, previewOptions: $previewOptions)
    }
  `;

  const variables = {
    email: user.email,
    where,
    withPreview,
    returnParams,
    additional,
    previewOptions,
    brandWhere,
  };

  return graphqlRequest(query, variables);
}

const getCategoriesQuery = `
  query getCategories($where: CategoryWhereInput, $orderBy: [CategoryOrderByWithRelationInput!]) {
    categories(where: $where, orderBy: $orderBy) {
      id
      name
      tags
      size
    }
  }
`;

async function getCategories(variables) {
  const options = {
    headers: {
      Authorization: `Bearer ${config.CLYPS_API_KEY}`,
    },
    method: "POST",
    uri: "https://clyps.io/graphql",
    body: {
      query: getCategoriesQuery,
      variables,
    },
    json: true,
  };

  try {
    const response = await request(options);
    if (response.errors) {
      console.error("Error fetching categories:", response.errors);
      throw new Error("Failed to fetch categories");
    }

    return response.data.categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
  }
}

const getCategoriesWithDesignsQuery = `
  query getCategories($where: CategoryWhereInput, $whereDesign: DesignWhereInput, $take: Int, $skip: Int, $orderBy: [DesignOrderByWithRelationInput!], $cursor: DesignWhereUniqueInput) {
    categories(where: $where) {
      id
      name
      tags
      size
      designs(where: $whereDesign, take: $take, skip: $skip, orderBy: $orderBy, cursor: $cursor) {
        id
        name
        categories {
          id
          name
          tags
          size
        }
      }
    }
  }
`;

async function getCategoriesWithDesigns(variables) {
  console.log(variables)
  const options = {
    headers: {
      Authorization: `Bearer ${config.CLYPS_API_KEY}`,
    },
    method: "POST",
    uri: "https://clyps.io/graphql",
    body: {
      query: getCategoriesWithDesignsQuery,
      variables,
    },
    json: true,
  };

  try {
    const response = await request(options);
    if (response.errors) {
      console.error("Error fetching categories:", response.errors);
      throw new Error("Failed to fetch categories");
    }
    
    return response.data.categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
  }
}

const getFullCategoriesQuery = `
  query getCategories($where: CategoryWhereInput) {
    categories(where: $where) {
      id
      name
      tags
      availableOnPages
      icon
      description
      color
      form
    }
  }
`;

async function getFullCategories(variables) {
  const options = {
    headers: {
      Authorization: `Bearer ${config.CLYPS_API_KEY}`,
    },
    method: "POST",
    uri: "https://clyps.io/graphql",
    body: {
      query: getFullCategoriesQuery,
      variables,
    },
    json: true,
  };

  try {
    const response = await request(options);
    if (response.errors) {
      console.error("Error fetching categories:", response.errors);
      throw new Error("Failed to fetch categories");
    }
    
    return response.data.categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
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
      // console.log(JSON.stringify(response));
      return response.data;
    })
    .catch((error) => console.log(error));
}

module.exports = {
  getBrandedDesigns,
  getDesigns,
  getDesignsCount,
  getBrandedDesign,
  getCategories,
  getCategoriesWithDesigns,
  getFullCategories,
};
