const {
  findCustomerByEmail
} = require('./customerService');

const CAMPAIGN_TAG =
  process.env.CAMPAIGN_TAG || 'CARNIVAL50_CLAIMED';

function hasCampaignTag(customer) {
  return Array.isArray(customer?.tags)
    && customer.tags.includes(CAMPAIGN_TAG);
}

async function checkCampaignEligibility({ email }) {
  const customers = email
    ? await findCustomerByEmail(email)
    : [];

  if (!customers || customers.length === 0) {
    return {
      eligible: true,
      code: 'NEW_CUSTOMER',
      message: null,
      customer: null
    };
  }

  const customer = customers[0];

  if (hasCampaignTag(customer)) {
    return {
      eligible: true,
      code: 'ALREADY_CLAIMED',
      message: null,
      customer
    };
  }

  return {
    eligible: true,
    code: 'ELIGIBLE',
    message: null,
    customer
  };
}

module.exports = {
  checkCampaignEligibility,
  hasCampaignTag
};
