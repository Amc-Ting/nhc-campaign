const {
  shopifyGraphQL
} = require('../config/shopify');

const CAMPAIGN_TAG =
  process.env.CAMPAIGN_TAG || 'CARNIVAL50_CLAIMED';
  
function normalizePhone(phone) {
  if (!phone) return null;

  let value = String(phone)
    .trim()
    .replace(/[^\d+]/g, '');

  // Already in international UK format
  // Example: +447748305189
  if (value.startsWith('+44')) {
    if (/^\+44\d{10}$/.test(value)) {
      return value;
    }

    return null;
  }

  // UK local mobile format
  // Example: 07748305189
  if (/^07\d{9}$/.test(value)) {
    return `+44${value.slice(1)}`;
  }

  return null;
}
async function createCustomer({
  firstName,
  lastName,
  email,
  phone
}) {
  const mutation = `
    mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
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
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    firstName,
    lastName,
    email,
    tags: [CAMPAIGN_TAG]
  };

  const normalizedPhone = normalizePhone(phone);

  if (phone && !normalizedPhone) {
    const error = new Error('Phone is invalid');
    error.code = 'INVALID_PHONE';
    throw error;
  }

  if (normalizedPhone) {
    input.phone = normalizedPhone;
  }

  const data = await shopifyGraphQL(mutation, { input });
  const result = data.customerCreate;

  if (result.userErrors?.length) {
    console.error(
      'Shopify customerCreate errors:',
      JSON.stringify(result.userErrors, null, 2)
    );

    const error = new Error(
      result.userErrors.map(item => item.message).join('; ')
    );

    error.code = 'CUSTOMER_CREATE_FAILED';
    error.userErrors = result.userErrors;

    throw error;
  }

  return result.customer;
}

async function addCampaignTag(customerId) {
  const mutation = `
    mutation AddCampaignTag(
      $id: ID!,
      $tags: [String!]!
    ) {
      tagsAdd(
        id: $id,
        tags: $tags
      ) {
        node {
          ... on Customer {
            id
            tags
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, {
    id: customerId,
    tags: [CAMPAIGN_TAG]
  });

  const result = data.tagsAdd;

  if (result.userErrors?.length) {
    const error = new Error(
      result.userErrors.map(item => item.message).join('; ')
    );

    error.code = 'TAG_UPDATE_FAILED';
    error.userErrors = result.userErrors;

    throw error;
  }

  return result.node;
}

module.exports = {
  createCustomer,
  addCampaignTag
};
