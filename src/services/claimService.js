const {
  checkCampaignEligibility
} = require('./customerEligibilityService');

const {
  createCustomer,
  addCampaignTag
} = require('./customerWriteService');
1
const {
  applyMarketingConsent
} = require('./consentService');

const DISCOUNT_CODE =
  process.env.DISCOUNT_CODE || 'CARNIVAL50';

async function processClaim({
  firstName,
  lastName,
  email,
  phone,
  marketingConsent
}) {
  // First eligibility check.
  const eligibility =
    await checkCampaignEligibility({
      email,
      phone
    });

  if (!eligibility.eligible) {
    return {
      success: false,
      code: eligibility.code,
      message: eligibility.message
    };
  }

  let customer = eligibility.customer;

  // New customer only.
  // Existing customers are NEVER updated with submitted
  // name/email/phone values.
  if (!customer) {
    customer = await createCustomer({
      firstName,
      lastName,
      email,
      phone
    });
  }

  // Second eligibility check immediately before adding the
  // campaign tag. This helps protect against a second
  // submission that arrives while the first claim is processing.
  //
  // For a newly created customer, the customer already has
  // the campaign tag from customerCreate, so we don't need
  // to perform this second lookup/tag operation.
  if (eligibility.customer) {
    const finalEligibility =
      await checkCampaignEligibility({
        email,
        phone
      });

    if (!finalEligibility.eligible) {
      return {
        success: false,
        code: finalEligibility.code,
        message: finalEligibility.message
      };
    }

    customer = finalEligibility.customer;
  }

  // Marketing consent:
  // checked -> subscribe
  // unchecked -> no change
  await applyMarketingConsent({
    customerId: customer.id,
    consent: marketingConsent,
    email
  });

  const campaignTag =
    process.env.CAMPAIGN_TAG ||
    'CARNIVAL50_CLAIMED';

  const currentTags = Array.isArray(customer.tags)
    ? customer.tags
    : [];

  if (!currentTags.includes(campaignTag)) {
    await addCampaignTag(customer.id);
  }

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
