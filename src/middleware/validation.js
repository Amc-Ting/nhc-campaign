function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '')
    .trim();
}

function validateClaimInput(body) {
  const firstName =
    String(body.first_name || '').trim();

  const lastName =
    String(body.last_name || '').trim();

  const email =
    normalizeEmail(body.email);

  const phone =
    normalizePhone(body.phone);

  const marketingConsent =
    body.marketing_consent === true ||
    body.marketing_consent === 'true' ||
    body.marketing_consent === '1' ||
    body.marketing_consent === 'on';

  const errors = [];

  if (!firstName) {
    errors.push('First name is required.');
  }

  if (!lastName) {
    errors.push('Last name is required.');
  }

  if (!email) {
    errors.push('Email is required.');
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push('Please enter a valid email address.');
  }

  if (phone && phone.length < 7) {
    errors.push('Please enter a valid mobile number.');
  }

  if (
    firstName.length > 100 ||
    lastName.length > 100 ||
    email.length > 254 ||
    phone.length > 40
  ) {
    errors.push('One or more fields are too long.');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      marketingConsent
    }
  };
}

module.exports = {
  validateClaimInput
};
