const express = require('express');

const router = express.Router();

const {
  processClaim
} = require('../services/claimService');

const {
  validateClaimInput
} = require('../middleware/validation');

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

    return res.json(result);

  } catch (error) {

    console.error(
      'Campaign claim error:',
      error
    );

    if (error.code === 'INVALID_PHONE') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PHONE',
        message:
          'Please enter a valid mobile number.'
      });
    }

    if (error.code === 'CUSTOMER_CREATE_FAILED') {
      return res.status(409).json({
        success: false,
        code: error.code,
        message:
          'We could not create your customer record. Please check your details and try again.',
        shopifyErrors: error.userErrors
      });
    }

    if (error.code === 'MARKETING_CONSENT_FAILED') {
      return res.status(500).json({
        success: false,
        code: error.code,
        message:
          'Your claim could not be completed. Please try again.'
      });
    }

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
