const {
  checkCampaignEligibility
} = require('./customerEligibilityService');

const {
  createCustomer,
  addCampaignTag
} = require('./customerWriteService');

const {
  applyMarketingConsent
} = require('./consentService');

const DISCOUNT_CODE =
  process.env.DISCOUNT_CODE || 'CARNIVAL50';

const CAMPAIGN_TAG =
  process.env.CAMPAIGN_TAG || 'CARNIVAL50_CLAIMED';

async function processClaim({
  firstName,
  lastName,
  email,
  phone,
  marketingConsent
}) {
  const eligibility =
    await checkCampaignEligibility({ email });

  let customer = eligibility.customer;

  if (!customer) {
    customer = await createCustomer({
      firstName,
      lastName,
      email,
      phone
    });
  } else if (eligibility.code === 'ALREADY_CLAIMED') {
    // Customer already has the tag — return success
    // without re-adding the tag.
    await applyMarketingConsent({
      customerId: customer.id,
      consent: marketingConsent,
      currentMarketingState: customer.emailMarketingConsent?.marketingState
    });

    return {
      success: true,
      code: 'CLAIM_SUCCESS',
      message: 'Claim successful.',
      discount_code: DISCOUNT_CODE
    };
  } else {
    const currentTags = Array.isArray(customer.tags)
      ? customer.tags
      : [];

    if (!currentTags.includes(CAMPAIGN_TAG)) {
      await addCampaignTag(customer.id);
    }
  }

  await applyMarketingConsent({
    customerId: customer.id,
    consent: marketingConsent,
    currentMarketingState: customer.emailMarketingConsent?.marketingState
  });

  return {
    success: true,
    code: 'CLAIM_SUCCESS',
    message: 'Claim successful.',
    discount_code: DISCOUNT_CODE
  };
}

module.exports = {
  processClaim
};
