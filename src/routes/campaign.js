const express = require('express');

const router = express.Router();

const {
  checkCampaignEligibility
} = require('../services/customerEligibilityService');

const {
  processClaim
} = require('../services/claimService');

const {
  validateClaimInput
} = require('../middleware/validation');

router.post('/eligibility', async (req, res) => {
  try {
    const validation =
      validateClaimInput(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: validation.errors[0],
        errors: validation.errors
      });
    }

    const {
      email,
      phone
    } = validation.data;

    const eligibility =
      await checkCampaignEligibility({
        email,
        phone
      });

    return res.json({
      success: eligibility.eligible,
      code: eligibility.code,
      message: eligibility.message,
      customer: eligibility.customer
        ? {
            id: eligibility.customer.id,
            numberOfOrders:
              eligibility.customer.numberOfOrders,
            tags:
              eligibility.customer.tags
          }
        : null
    });

  } catch (error) {
    console.error(
      'Eligibility error:',
      error
    );

    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message:
        'Something went wrong. Please try again.'
    });
  }
});


router.post('/claim', async (req, res) => {
  try {
    const validation =
      validateClaimInput(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: validation.errors[0],
        errors: validation.errors
      });
    }

    const result =
      await processClaim(validation.data);

    if (!result.success) {
      const status =
        result.code === 'NOT_ELIGIBLE' ||
        result.code === 'ALREADY_CLAIMED' ||
        result.code === 'CUSTOMER_CONFLICT'
          ? 409
          : 400;

      return res.status(status).json(result);
    }

    return res.json(result);

  } catch (error) {

    console.error(
      'Campaign claim error:',
      error
    );

    // Invalid phone number
    if (error.code === 'INVALID_PHONE') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PHONE',
        message:
          'Please enter a valid mobile number.'
      });
    }

    // Shopify customer creation error
    if (error.code === 'CUSTOMER_CREATE_FAILED') {
      return res.status(409).json({
        success: false,
        code: error.code,
        message:
          'We could not create your customer record. Please check your details and try again.'
      });
    }

    // Marketing consent error
    if (error.code === 'MARKETING_CONSENT_FAILED') {
      return res.status(500).json({
        success: false,
        code: error.code,
        message:
          'Your claim could not be completed. Please try again.'
      });
    }

    // Campaign tag error
    if (error.code === 'TAG_UPDATE_FAILED') {
      return res.status(500).json({
        success: false,
        code: error.code,
        message:
          'Your claim could not be completed. Please try again.'
      });
    }

    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message:
        'Something went wrong. Please try again.'
    });
  }
});


module.exports = router;