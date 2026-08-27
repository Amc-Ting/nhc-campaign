const {
  shopifyGraphQL
} = require('../config/shopify');

/**
 * Subscribe customer to email marketing when the
 * campaign checkbox is checked.
 *
 * - consent = true  AND not already subscribed → SUBSCRIBED
 * - consent = true  AND already subscribed    → NO_CHANGE
 * - consent = false → NO_CHANGE (never unsubscribe)
 */
async function applyMarketingConsent({
  customerId,
  consent,
  currentMarketingState
}) {
  if (!consent || currentMarketingState === 'SUBSCRIBED') {
    return {
      changed: false,
      action: 'NO_CHANGE'
    };
  }

  const mutation = `
    mutation UpdateCustomerEmailMarketingConsent(
      $input: CustomerEmailMarketingConsentUpdateInput!
    ) {
      customerEmailMarketingConsentUpdate(
        input: $input
      ) {
        customer {
          id
          email
          emailMarketingConsent {
            marketingState
            marketingOptInLevel
            consentUpdatedAt
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
    customerId,
    emailMarketingConsent: {
      marketingState: 'SUBSCRIBED',
      marketingOptInLevel: 'SINGLE_OPT_IN',
      consentUpdatedAt: new Date().toISOString()
    }
  };

  const data = await shopifyGraphQL(
    mutation,
    { input }
  );

  const result =
    data.customerEmailMarketingConsentUpdate;

  if (result.userErrors?.length) {
    const error = new Error(
      result.userErrors
        .map(item => item.message)
        .join('; ')
    );

    error.code =
      'MARKETING_CONSENT_FAILED';

    error.userErrors =
      result.userErrors;

    throw error;
  }

  return {
    changed: true,
    action: 'SUBSCRIBED',
    customer: result.customer
  };
}

module.exports = {
  applyMarketingConsent
};