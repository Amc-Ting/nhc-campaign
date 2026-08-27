require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');


const {
  shopifyGraphQL
} = require('./config/shopify');

const {
  findCustomerByEmail,
  findCustomerByPhone
} = require('./services/customerService');

const campaignRouter =
  require('./routes/campaign');
const shopifyAuthRouter =
  require('./routes/shopifyAuth');
const app = express();

const PORT =
  process.env.PORT || 3000;

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: true
  })
);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'nhc-campaign-backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/shopify/test', async (req, res) => {
  try {
    const data = await shopifyGraphQL(`
      query {
        shop {
          id
          name
          myshopifyDomain
        }
      }
    `);

    res.json({
      success: true,
      shop: data.shop
    });
  } catch (error) {
    console.error(
      'Shopify connection error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get('/customer/test', async (req, res) => {
  try {
    const {
      email,
      phone
    } = req.query;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message:
          'Provide email or phone.'
      });
    }

    let emailCustomers = [];
    let phoneCustomers = [];

    if (email) {
      emailCustomers =
        await findCustomerByEmail(email);
    }

    if (phone) {
      phoneCustomers =
        await findCustomerByPhone(phone);
    }

    res.json({
      success: true,
      email: {
        searched: email || null,
        count: emailCustomers.length,
        customers: emailCustomers
      },
      phone: {
        searched: phone || null,
        count: phoneCustomers.length,
        customers: phoneCustomers
      }
    });
  } catch (error) {
    console.error(
      'Customer lookup error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Shopify OAuth
app.use(
  '/auth',
  shopifyAuthRouter
);


// Campaign API
app.use(
  '/api/campaign',
  campaignRouter
);


// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'Route not found.'
  });
});

app.listen(PORT, () => {
  console.log(
    `NHC Campaign backend running on port ${PORT}`
  );
});
