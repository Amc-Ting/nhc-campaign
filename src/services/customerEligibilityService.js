const {
  findCustomerByEmail,
  findCustomerByPhone
} = require('./customerService');

const CAMPAIGN_TAG =
  process.env.CAMPAIGN_TAG || 'CARNIVAL50_CLAIMED';

function uniqueCustomers(customers) {
  const map = new Map();

  for (const customer of customers || []) {
    if (customer?.id) {
      map.set(customer.id, customer);
    }
  }

  return [...map.values()];
}

function hasCampaignTag(customer) {
  return Array.isArray(customer?.tags)
    && customer.tags.includes(CAMPAIGN_TAG);
}

async function resolveCustomerIdentity({ email, phone }) {
  const emailCustomers = email
    ? await findCustomerByEmail(email)
    : [];

  const phoneCustomers = phone
    ? await findCustomerByPhone(phone)
    : [];

  const emailCustomerIds = new Set(
    emailCustomers.map(customer => customer.id)
  );

  const phoneCustomerIds = new Set(
    phoneCustomers.map(customer => customer.id)
  );

  const allCustomers = uniqueCustomers([
    ...emailCustomers,
    ...phoneCustomers
  ]);

  if (allCustomers.length === 0) {
    return {
      type: 'NEW_CUSTOMER',
      customer: null,
      emailCustomers,
      phoneCustomers
    };
  }

  if (
    emailCustomerIds.size > 0 &&
    phoneCustomerIds.size > 0
  ) {
    const commonIds = [...emailCustomerIds].filter(id =>
      phoneCustomerIds.has(id)
    );

    if (commonIds.length === 0) {
      return {
        type: 'CONFLICT',
        customer: null,
        emailCustomers,
        phoneCustomers
      };
    }

    if (commonIds.length === 1) {
      const customer = allCustomers.find(
        item => item.id === commonIds[0]
      );

      return {
        type: 'EXISTING_CUSTOMER',
        customer,
        emailCustomers,
        phoneCustomers
      };
    }
  }

  if (allCustomers.length === 1) {
    return {
      type: 'EXISTING_CUSTOMER',
      customer: allCustomers[0],
      emailCustomers,
      phoneCustomers
    };
  }

  return {
    type: 'CONFLICT',
    customer: null,
    emailCustomers,
    phoneCustomers
  };
}

async function checkCampaignEligibility({
  email,
  phone
}) {
  const identity =
    await resolveCustomerIdentity({
      email,
      phone
    });

  if (identity.type === 'CONFLICT') {
    return {
      eligible: false,
      code: 'CUSTOMER_CONFLICT',
      message:
        'Please check your email and mobile number and try again.',
      customer: null,
      identity
    };
  }

  if (identity.type === 'NEW_CUSTOMER') {
    return {
      eligible: true,
      code: 'NEW_CUSTOMER',
      message: null,
      customer: null,
      identity
    };
  }

  const customer = identity.customer;
  const orderCount =
    Number(customer.numberOfOrders || 0);

  if (orderCount > 0) {
    return {
      eligible: false,
      code: 'NOT_ELIGIBLE',
      message:
        'This offer is only available to customers placing their first order.',
      customer,
      identity
    };
  }

  if (hasCampaignTag(customer)) {
    return {
      eligible: false,
      code: 'ALREADY_CLAIMED',
      message:
        'You have already claimed this offer.',
      customer,
      identity
    };
  }

  return {
    eligible: true,
    code: 'EXISTING_CUSTOMER_ZERO_ORDERS',
    message: null,
    customer,
    identity
  };
}

module.exports = {
  resolveCustomerIdentity,
  checkCampaignEligibility,
  hasCampaignTag
};
