const {
  checkCampaignEligibility
} = require('./customerEligibilityService');

const {
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

  if (!customer) {
    try {
      customer = await createCustomer({
        firstName,
        lastName,
        email,
        phone
      });
    } catch (error) {
      // Phone already belongs to another customer.
      // Find that customer and add the campaign tag instead.
      if (error.code === 'PHONE_TAKEN' && phone) {
        const existing = await findCustomerByPhone(
          normalizePhone(phone) || phone
        );

        if (existing && existing.length > 0) {
          customer = existing[0];
          await addCampaignTag(customer.id);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
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
