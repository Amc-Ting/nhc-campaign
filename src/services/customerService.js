const {
  shopifyGraphQL
} = require('../config/shopify');

function escapeSearchValue(value) {
  return String(value)
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

async function findCustomerByEmail(email) {
  const query = `
    query FindCustomerByEmail($query: String!) {
      customers(first: 2, query: $query) {
        nodes {
          id
          firstName
          lastName
          email
          phone
          numberOfOrders
          tags
          emailMarketingConsent {
            marketingState
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, {
    query: `email:${escapeSearchValue(email)}`
  });

  return data.customers.nodes;
}

async function findCustomerByPhone(phone) {
  const query = `
    query FindCustomerByPhone($query: String!) {
      customers(first: 2, query: $query) {
        nodes {
          id
          firstName
          lastName
          email
          phone
          numberOfOrders
          tags
          emailMarketingConsent {
            marketingState
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, {
    query: `phone:${escapeSearchValue(phone)}`
  });

  return data.customers.nodes;
}

module.exports = {
  findCustomerByEmail,
  findCustomerByPhone
};
