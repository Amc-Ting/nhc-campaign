const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const SHOPIFY_STORE_DOMAIN =
    process.env.SHOPIFY_STORE_DOMAIN;

const SHOPIFY_CLIENT_ID =
    process.env.SHOPIFY_CLIENT_ID;

const SHOPIFY_CLIENT_SECRET =
    process.env.SHOPIFY_CLIENT_SECRET;

const SHOPIFY_REDIRECT_URI =
    process.env.SHOPIFY_REDIRECT_URI;

const SHOPIFY_SCOPES =
    process.env.SHOPIFY_SCOPES ||
    'read_customers,write_customers';

const OAUTH_STATE_SECRET =
    process.env.OAUTH_STATE_SECRET;


// Generate OAuth state
function generateState() {
    return crypto
        .createHmac('sha256', OAUTH_STATE_SECRET)
        .update(
            `${SHOPIFY_STORE_DOMAIN}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`
        )
        .digest('hex');
}


// --------------------------------------------------
// START SHOPIFY OAUTH
// GET /auth/shopify
// --------------------------------------------------

router.get('/shopify', (req, res) => {
    try {
        if (
            !SHOPIFY_CLIENT_ID ||
            !SHOPIFY_CLIENT_SECRET ||
            !SHOPIFY_REDIRECT_URI ||
            !OAUTH_STATE_SECRET
        ) {
            return res.status(500).json({
                success: false,
                message:
                    'Shopify OAuth environment variables are missing.'
            });
        }

        const state = generateState();

        res.cookie(
            'shopify_oauth_state',
            state,
            {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 10 * 60 * 1000
            }
        );

        const params = new URLSearchParams({
            client_id: SHOPIFY_CLIENT_ID,
            scope: SHOPIFY_SCOPES,
            redirect_uri: SHOPIFY_REDIRECT_URI,
            state
        });

        const authorizationUrl =
            `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/authorize?${params.toString()}`;

        console.log(
            'Redirecting to Shopify:',
            authorizationUrl
        );

        return res.redirect(authorizationUrl);

    } catch (error) {
        console.error(
            'Shopify OAuth start error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// --------------------------------------------------
// SHOPIFY OAUTH CALLBACK
// GET /auth/shopify/callback
// --------------------------------------------------

router.get(
    '/shopify/callback',
    async (req, res) => {
        try {
            const {
                code,
                hmac,
                shop,
                state
            } = req.query;

            console.log(
                'Shopify OAuth callback:',
                {
                    shop,
                    hasCode: !!code,
                    hasHmac: !!hmac,
                    hasState: !!state
                }
            );

            if (
                !code ||
                !hmac ||
                !shop ||
                !state
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Missing Shopify OAuth parameters.'
                });
            }

            // Make sure callback is for our store
            if (
                shop !== SHOPIFY_STORE_DOMAIN
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Unexpected Shopify store.'
                });
            }

            // Check state
            const storedState =
                req.cookies?.shopify_oauth_state;

            res.clearCookie(
                'shopify_oauth_state'
            );

            if (
                !storedState ||
                storedState !== state
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Invalid OAuth state.'
                });
            }

            // -----------------------------------------
            // Verify Shopify HMAC
            // -----------------------------------------

            const params = {
                ...req.query
            };

            delete params.hmac;

            const message =
                Object.keys(params)
                    .sort()
                    .map(
                        key =>
                            `${key}=${params[key]}`
                    )
                    .join('&');

            const calculatedHmac =
                crypto
                    .createHmac(
                        'sha256',
                        SHOPIFY_CLIENT_SECRET
                    )
                    .update(message)
                    .digest('hex');

            if (
                calculatedHmac !== hmac
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Invalid Shopify HMAC.'
                });
            }

            // -----------------------------------------
            // Exchange code for Admin API token
            // -----------------------------------------

            const tokenResponse =
                await fetch(
                    `https://${shop}/admin/oauth/access_token`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/x-www-form-urlencoded',

                            'Accept':
                                'application/json'
                        },

                        body: new URLSearchParams({
                            client_id:
                                SHOPIFY_CLIENT_ID,

                            client_secret:
                                SHOPIFY_CLIENT_SECRET,

                            code
                        })
                    }
                );

            const tokenData =
                await tokenResponse.json();

            console.log(
                'Shopify token response:',
                {
                    ok: tokenResponse.ok,
                    status: tokenResponse.status,
                    scope: tokenData.scope
                }
            );

            if (!tokenResponse.ok) {
                return res.status(
                    tokenResponse.status
                ).json({
                    success: false,
                    error: tokenData
                });
            }

            // -----------------------------------------
            // SUCCESS
            // -----------------------------------------

            return res.status(200).send(`
        <!DOCTYPE html>

        <html>
          <head>
            <title>Shopify Authorization Successful</title>

            <style>
              body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
              }

              code {
                display: block;
                background: #f5f5f5;
                padding: 20px;
                word-break: break-all;
              }

              .warning {
                color: red;
                font-weight: bold;
              }
            </style>
          </head>

          <body>

            <h1>
              Shopify Authorization Successful
            </h1>

            <p>
              Store:
              <strong>${shop}</strong>
            </p>

            <p>
              Granted scopes:
              <strong>${tokenData.scope}</strong>
            </p>

            <h3>
              SHOPIFY_ADMIN_ACCESS_TOKEN
            </h3>

            <code>
              ${tokenData.access_token}
            </code>

            <p class="warning">
              Do NOT share this token.
            </p>

            <p>
              Copy this token to your Vercel
              Environment Variables.
            </p>

          </body>
        </html>
      `);

        } catch (error) {
            console.error(
                'Shopify OAuth callback error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


module.exports = router;