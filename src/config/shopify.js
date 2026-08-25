const SHOPIFY_STORE_DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN;

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || '2026-07';

if (!SHOPIFY_STORE_DOMAIN) {
  throw new Error(
    'SHOPIFY_STORE_DOMAIN is missing from .env'
  );
}

const SHOPIFY_GRAPHQL_URL =
  `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;


async function shopifyGraphQL(
  query,
  variables = {}
) {

  // Check token only when an Admin API
  // request is actually made.
  const SHOPIFY_ADMIN_ACCESS_TOKEN =
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error(
      'SHOPIFY_ADMIN_ACCESS_TOKEN is missing. Complete Shopify OAuth first.'
    );
  }

  const response = await fetch(
    SHOPIFY_GRAPHQL_URL,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',

        'X-Shopify-Access-Token':
          SHOPIFY_ADMIN_ACCESS_TOKEN
      },

      body: JSON.stringify({
        query,
        variables
      })
    }
  );


  const data =
    await response.json();


  if (!response.ok) {
    throw new Error(
      `Shopify API HTTP ${response.status}: ${data?.errors
        ? JSON.stringify(data.errors)
        : response.statusText
      }`
    );
  }


  if (data.errors?.length) {
    throw new Error(
      `Shopify GraphQL error: ${JSON.stringify(
        data.errors
      )}`
    );
  }


  return data.data;
}


module.exports = {
  shopifyGraphQL,
  SHOPIFY_GRAPHQL_URL
};