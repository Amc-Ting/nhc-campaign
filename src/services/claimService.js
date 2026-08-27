const {
  checkCampaignEligibility
} = require('./customerEligibilityService');

const {
  findCustomerByEmail,
  findCustomerByPhone
} = require('./customerService');

const {
  createCustomer,
  addCampaignTag,
  normalizePhone
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

  // No customer found for this email yet
  if (!customer) {
    // Check if the phone already belongs to another customer
    if (phone) {
      const byPhone = await findCustomerByPhone(
        normalizePhone(phone) || phone
      );

      if (byPhone && byPhone.length > 0) {
        // Phone exists → tag that customer, don't create new
        customer = byPhone[0];
        await addCampaignTag(customer.id);
      }
    }

    // Only create a brand-new customer when both
    // email and phone are new
    if (!customer) {
      customer = await createCustomer({
        firstName,
        lastName,
        email,
        phone
      });
    }
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
