const {
  shopifyGraphQL
} = require('../config/shopify');

/**
 * Subscribe customer to email marketing when the
 * campaign checkbox is checked.
 *
 * If consent is false, we deliberately do nothing.
 * This means an unchecked checkbox will NOT unsubscribe
 * an existing subscriber.
 */
async function applyMarketingConsent({
  customerId,
  consent
}) {
  if (!consent) {
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