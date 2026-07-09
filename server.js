const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const db = require('./db');

// 1. Load Environment Variables from .env manually (zero-dependency)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      // Set to process.env only if not already set (standard .env behavior)
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const TAP_SECRET_KEY = process.env.TAP_SECRET_KEY || 'sk_test_placeholder_key';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_session_key_for_sikandar_crm';

// Check if running in simulation mode
const isSimulationMode =
  !TAP_SECRET_KEY ||
  TAP_SECRET_KEY.includes('placeholder') ||
  TAP_SECRET_KEY === 'sk_test_';

console.log(`Mode: ${isSimulationMode ? 'SIMULATION (Mock Tap Payments)' : 'LIVE (Tap Payments Integration)'}`);

// Initialize database (async)
db.init()
  .then(() => console.log('Database system initialized.'))
  .catch(err => console.error('Database system initialization failed:', err));

// Simple Memory Store for Sessions
const sessions = new Set();

// Helper to check authentication from cookies
function getAuth(req) {
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts[0].trim()] = (parts[1] || '').trim();
    });
  }
  const token = cookies['admin_session'];
  if (token && sessions.has(token)) {
    return { authenticated: true, username: 'admin' };
  }
  return { authenticated: false };
}

// Customer Memory Store for Sessions
const customerSessions = new Map();

function getCustomerAuth(req) {
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts[0]) {
        cookies[parts[0].trim()] = (parts[1] || '').trim();
      }
    });
  }
  const token = cookies['customer_session'];
  if (token && customerSessions.has(token)) {
    return { authenticated: true, customer: customerSessions.get(token) };
  }
  return { authenticated: false };
}

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Response Helpers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendHtml(res, statusCode, htmlContent) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlContent);
}

function redirect(res, targetUrl) {
  res.writeHead(302, { 'Location': targetUrl });
  res.end();
}

// Helper to parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

// Helper to parse URL-encoded form body
function parseFormBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = {};
      body.split('&').forEach(pair => {
        const parts = pair.split('=');
        if (parts[0]) {
          params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
        }
      });
      resolve(params);
    });
  });
}

// Exchange Rate Cache and Utility
let cachedRate = 2.60;
let lastFetchedTime = 0;
const CACHE_DURATION = 3600000; // 1 hour cache duration

function fetchOmrToUsdRate() {
  return new Promise((resolve) => {
    const now = Date.now();
    if (now - lastFetchedTime < CACHE_DURATION) {
      return resolve(cachedRate);
    }

    const req = https.get('https://open.er-api.com/v6/latest/OMR', { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            if (json && json.result === 'success' && json.rates && typeof json.rates.USD === 'number') {
              cachedRate = json.rates.USD;
              lastFetchedTime = now;
              console.log(`[Exchange Rate] Updated live OMR -> USD rate to ${cachedRate}`);
            }
          } else {
            console.warn(`[Exchange Rate] API returned status ${res.statusCode}, using cached rate: ${cachedRate}`);
          }
        } catch (e) {
          console.error('[Exchange Rate] Error parsing API response:', e.message);
        }
        resolve(cachedRate);
      });
    });

    req.on('error', (e) => {
      console.error('[Exchange Rate] Error fetching rate:', e.message);
      resolve(cachedRate);
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[Exchange Rate] API request timed out, using cached rate:', cachedRate);
      resolve(cachedRate);
    });
  });
}

// Server router
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Set CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // --- API ROUTES ---

  // 1. GET Pricing Plans
  if (pathname === '/api/plans' && method === 'GET') {
    try {
      const plans = await db.getPricingPlans();
      return sendJson(res, 200, plans);
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Failed to retrieve plans' });
    }
  }

  // 2. POST Leads
  if (pathname === '/api/leads' && method === 'POST') {
    try {
      const leadData = await parseJsonBody(req);
      if (!leadData.name || !leadData.email) {
        return sendJson(res, 400, { error: 'Name and Email are required' });
      }
      await db.createLead(leadData);
      return sendJson(res, 200, { success: true, message: 'Lead captured successfully.' });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Failed to save lead' });
    }
  }

  // 2b. GET Website Content
  if (pathname === '/api/content' && method === 'GET') {
    try {
      const content = await db.getWebsiteContent();
      return sendJson(res, 200, content);
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Failed to retrieve website content' });
    }
  }

  // 2c. GET Product Page Content
  if (pathname === '/api/content/page' && method === 'GET') {
    try {
      const pageId = parsedUrl.query.id;
      if (!pageId) {
        return sendJson(res, 400, { error: 'Product page ID is required' });
      }
      const pageContent = await db.getProductPage(pageId);
      if (!pageContent) {
        return sendJson(res, 404, { error: 'Product page not found' });
      }
      return sendJson(res, 200, pageContent);
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Failed to retrieve product page' });
    }
  }

  // --- CUSTOMER PORTAL API ENDPOINTS ---

  // Register Customer
  if (pathname === '/api/customer/register' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { name, email, password } = data;

      if (!name || !email || !password) {
        return sendJson(res, 400, { error: 'Name, Email and Password are required' });
      }

      const existingCustomer = await db.getCustomerByEmail(email);
      if (existingCustomer) {
        return sendJson(res, 400, { error: 'A customer with this email already exists' });
      }

      await db.createCustomer({ name, email, password });
      return sendJson(res, 200, { success: true, message: 'Registration successful! You can now log in.' });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Failed to register customer' });
    }
  }

  // Login Customer
  if (pathname === '/api/customer/login' && method === 'POST') {
    try {
      const credentials = await parseJsonBody(req);
      const { email, password } = credentials;

      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required' });
      }

      const customer = await db.getCustomerByEmail(email);
      if (!customer) {
        return sendJson(res, 401, { error: 'Invalid email or password' });
      }

      const inputHash = db.hashPassword(password, customer.salt);
      if (inputHash === customer.password_hash) {
        const token = crypto.randomBytes(32).toString('hex');
        customerSessions.set(token, { name: customer.name, email: customer.email });

        res.writeHead(200, {
          'Set-Cookie': `customer_session=${token}; Path=/; HttpOnly; Max-Age=86400`,
          'Content-Type': 'application/json'
        });
        return res.end(JSON.stringify({ success: true, customer: { name: customer.name, email: customer.email } }));
      } else {
        return sendJson(res, 401, { error: 'Invalid email or password' });
      }
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Login failure' });
    }
  }

  // Check Session
  if (pathname === '/api/customer/session' && method === 'GET') {
    const auth = getCustomerAuth(req);
    if (!auth.authenticated) {
      return sendJson(res, 200, { authenticated: false });
    }
    return sendJson(res, 200, { authenticated: true, customer: auth.customer });
  }

  // Logout Customer
  if (pathname === '/api/customer/logout' && method === 'POST') {
    const cookies = {};
    if (req.headers.cookie) {
      req.headers.cookie.split(';').forEach(c => {
        const parts = c.split('=');
        if (parts[0]) {
          cookies[parts[0].trim()] = (parts[1] || '').trim();
        }
      });
    }
    const token = cookies['customer_session'];
    if (token) {
      customerSessions.delete(token);
    }
    res.writeHead(200, {
      'Set-Cookie': 'customer_session=; Path=/; HttpOnly; Max-Age=0',
      'Content-Type': 'application/json'
    });
    return res.end(JSON.stringify({ success: true }));
  }

  // Get Customer Payments History
  if (pathname === '/api/customer/payments' && method === 'GET') {
    const auth = getCustomerAuth(req);
    if (!auth.authenticated) {
      return sendJson(res, 401, { error: 'Unauthorized access' });
    }
    try {
      const history = await db.getCustomerPayments(auth.customer.email);
      return sendJson(res, 200, history);
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Failed to retrieve payment history' });
    }
  }

  // 3. POST Create Payment Charge (Tap Payments integration)
  if (pathname === '/api/create-charge' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { plan_id, customer_name, customer_email, customer_phone } = data;

      if (!plan_id || !customer_name || !customer_email) {
        return sendJson(res, 400, { error: 'Missing billing information or plan selection' });
      }

      // Fetch pricing detail or check if cart transaction
      let amount;
      let planName;

      if (plan_id.startsWith('cart_')) {
        if (!data.amount_omr || !data.plan_name) {
          return sendJson(res, 400, { error: 'Missing cart totals or details' });
        }
        amount = parseFloat(data.amount_omr);
        planName = data.plan_name;
      } else {
        const plans = await db.getPricingPlans();
        const plan = plans.find(p => p.id === plan_id);
        if (!plan) {
          return sendJson(res, 404, { error: 'Pricing plan not found' });
        }
        amount = parseFloat(plan.price);
        planName = plan.name;
        
        if (plan_id.startsWith('crm_') && data.billing_cycle) {
            // Priority: specific CRM pricing > base CRM pricing > fallback math
            const specificCrm = plan;
            const baseCrm = plans.find(p => p.id === 'crm') || plan;
            
            if (data.billing_cycle === 'year') {
                const py = specificCrm.price_yearly || baseCrm.price_yearly;
                amount = py ? parseFloat(py) : amount * 12 * 0.8;
                planName += ' (Yearly)';
            } else if (data.billing_cycle === 'lifetime') {
                const pl = specificCrm.price_lifetime || baseCrm.price_lifetime;
                amount = pl ? parseFloat(pl) : amount * 36;
                planName += ' (Lifetime)';
            } else {
                planName += ' (Monthly)';
            }
        }
        
        // Include 5% VAT
        amount = parseFloat((amount * 1.05).toFixed(2));
      }

      const chargeId = `chg_${isSimulationMode ? 'sim_' : ''}${crypto.randomBytes(12).toString('hex')}`;

      // Store invoice record as PENDING
      await db.createPayment({
        id: chargeId,
        customer_name,
        customer_email,
        customer_phone,
        plan_id,
        plan_name: planName,
        amount_omr: amount,
        status: 'PENDING'
      });

      if (isSimulationMode) {
        // Return simulated checkout page URL
        const redirectUrl = `${BASE_URL}/simulated-checkout?charge_id=${chargeId}`;
        return sendJson(res, 200, { transactionUrl: redirectUrl });
      } else {
        // Real Tap Payments integration
        const rate = await fetchOmrToUsdRate();
        const tapPayload = JSON.stringify({
          amount: parseFloat((amount * rate).toFixed(2)),
          currency: 'USD',
          threeDSecure: true,
          customer_initiated: true,
          save_card: false,
          description: `Sikandar CRM - ${planName}`,
          statement_descriptor: 'Sikandar CRM Purchase',
          reference: {
            transaction: chargeId,
            order: `ord_${chargeId}`
          },
          receipt: {
            email: false,
            sms: false
          },
          metadata: {
            plan_id: plan_id,
            charge_id: chargeId
          },
          customer: {
            first_name: customer_name.split(' ')[0] || customer_name,
            last_name: customer_name.split(' ').slice(1).join(' ') || 'Customer',
            email: customer_email,
            phone: {
              country_code: '968',
              number: customer_phone ? customer_phone.replace(/\D/g, '') : '91234567'
            }
          },
          source: { id: 'src_all' },
          redirect: {
            url: `${BASE_URL}/api/payment-callback`
          }
        });

        // Request Tap API
        const tapRequest = () => new Promise((resolveRequest, rejectRequest) => {
          const options = {
            hostname: 'api.tap.company',
            port: 443,
            path: '/v2/charges',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${TAP_SECRET_KEY}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(tapPayload)
            }
          };

          const apiReq = https.request(options, (apiRes) => {
            let resData = '';
            apiRes.on('data', d => resData += d);
            apiRes.on('end', () => {
              try {
                const response = JSON.parse(resData);
                if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
                  resolveRequest(response);
                } else {
                  rejectRequest(new Error(response.errors ? response.errors[0].description : 'Tap API error'));
                }
              } catch (e) {
                rejectRequest(e);
              }
            });
          });

          apiReq.on('error', err => rejectRequest(err));
          apiReq.write(tapPayload);
          apiReq.end();
        });

        try {
          const tapResponse = await tapRequest();
          const transactionUrl = tapResponse.transaction.url;
          return sendJson(res, 200, { transactionUrl });
        } catch (apiErr) {
          console.error('Tap API Call Failed: ', apiErr.message);
          return sendJson(res, 500, { error: `Payment gateway error: ${apiErr.message}` });
        }
      }
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Internal server error during checkout initiation' });
    }
  }

  // 4. GET Payment Callback (Redirected by Tap or Simulator)
  if (pathname === '/api/payment-callback' && method === 'GET') {
    try {
      const chargeId = parsedUrl.query.tap_id || parsedUrl.query.charge_id;
      if (!chargeId) {
        return redirect(res, '/cancel.html');
      }

      if (isSimulationMode) {
        const payment = await db.getPaymentById(chargeId);
        if (payment && payment.status === 'SUCCESS') {
          return redirect(res, `/success.html?charge_id=${chargeId}`);
        } else {
          return redirect(res, '/cancel.html');
        }
      } else {
        // Verify live payment status with Tap
        const verifyRequest = () => new Promise((resolveVerify, rejectVerify) => {
          const options = {
            hostname: 'api.tap.company',
            port: 443,
            path: `/v2/charges/${chargeId}`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${TAP_SECRET_KEY}`
            }
          };

          const apiReq = https.request(options, (apiRes) => {
            let resData = '';
            apiRes.on('data', d => resData += d);
            apiRes.on('end', () => {
              try {
                const response = JSON.parse(resData);
                resolveVerify(response);
              } catch (e) {
                rejectVerify(e);
              }
            });
          });

          apiReq.on('error', err => rejectVerify(err));
          apiReq.end();
        });

        const statusResponse = await verifyRequest();
        const localChargeId = statusResponse.metadata && statusResponse.metadata.charge_id ? statusResponse.metadata.charge_id : chargeId;
        console.log('Tap Verification Response:', JSON.stringify(statusResponse, null, 2));

        if (statusResponse.status === 'CAPTURED' || statusResponse.status === 'SUCCESS' || statusResponse.status === 'AUTHORIZED') {
          await db.updatePaymentStatus(localChargeId, 'SUCCESS');
          return redirect(res, `/success.html?charge_id=${localChargeId}`);
        } else {
          await db.updatePaymentStatus(localChargeId, 'FAILED');
          return redirect(res, `/cancel.html?reason=${statusResponse.status}`);
        }
      }
    } catch (err) {
      console.error('Callback parsing failed: ', err);
      return redirect(res, '/cancel.html');
    }
  }

  // 5. GET Payment Status (Receipt Details)
  if (pathname.startsWith('/api/payment-status/') && method === 'GET') {
    const chargeId = pathname.substring('/api/payment-status/'.length);
    const payment = await db.getPaymentById(chargeId);
    if (!payment) {
      return sendJson(res, 404, { error: 'Payment not found' });
    }
    return sendJson(res, 200, payment);
  }

  // --- ADMIN PROTECTED ROUTES ---

  // 6. POST Admin Login
  if (pathname === '/api/admin/login' && method === 'POST') {
    try {
      const credentials = await parseJsonBody(req);
      const user = await db.getUserByUsername(credentials.username);

      if (!user) {
        return sendJson(res, 401, { error: 'Invalid username or password' });
      }

      const inputHash = db.hashPassword(credentials.password, user.salt);
      if (inputHash === user.password_hash) {
        const token = crypto.randomBytes(32).toString('hex');
        sessions.add(token);

        res.writeHead(200, {
          'Set-Cookie': `admin_session=${token}; Path=/; HttpOnly; Max-Age=86400`,
          'Content-Type': 'application/json'
        });
        return res.end(JSON.stringify({ success: true }));
      } else {
        return sendJson(res, 401, { error: 'Invalid username or password' });
      }
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Login failure' });
    }
  }

  // 7. POST Admin Logout
  if (pathname === '/api/admin/logout' && method === 'POST') {
    const cookies = {};
    if (req.headers.cookie) {
      req.headers.cookie.split(';').forEach(c => {
        const parts = c.split('=');
        cookies[parts[0].trim()] = (parts[1] || '').trim();
      });
    }
    const token = cookies['admin_session'];
    if (token) {
      sessions.delete(token);
    }
    res.writeHead(200, {
      'Set-Cookie': 'admin_session=; Path=/; HttpOnly; Max-Age=0',
      'Content-Type': 'application/json'
    });
    return res.end(JSON.stringify({ success: true }));
  }

  // Auth Middleware
  const auth = getAuth(req);

  if (pathname.startsWith('/api/admin/')) {
    if (!auth.authenticated) {
      return sendJson(res, 401, { error: 'Unauthorized access' });
    }

    // 8. GET Dashboard Stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      try {
        const payments = await db.getPayments();
        const leads = await db.getLeads();

        const successfulPayments = payments.filter(p => p.status === 'SUCCESS');
        const totalRevenue = successfulPayments.reduce((sum, p) => sum + parseFloat(p.amount_omr), 0);

        return sendJson(res, 200, {
          revenue: totalRevenue,
          ordersCount: payments.length,
          successfulCount: successfulPayments.length,
          leadsCount: leads.length,
          recentPayments: payments.slice(0, 5),
          recentLeads: leads.slice(0, 5)
        });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to fetch dashboard stats' });
      }
    }

    // 9. GET All Payments
    if (pathname === '/api/admin/payments' && method === 'GET') {
      try {
        const payments = await db.getPayments();
        return sendJson(res, 200, payments);
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to fetch payments' });
      }
    }

    // 10. GET All Leads
    if (pathname === '/api/admin/leads' && method === 'GET') {
      try {
        const leads = await db.getLeads();
        return sendJson(res, 200, leads);
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to fetch leads' });
      }
    }

    // 11. POST Update Lead Status
    if (pathname === '/api/admin/leads/update' && method === 'POST') {
      try {
        const bodyData = await parseJsonBody(req);
        if (!bodyData.id || !bodyData.status) {
          return sendJson(res, 400, { error: 'Missing ID or Status' });
        }
        await db.updateLeadStatus(bodyData.id, bodyData.status, bodyData.notes || '');
        return sendJson(res, 200, { success: true });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to update lead status' });
      }
    }

    // 12. POST Update Pricing Plans
    if (pathname === '/api/admin/plans/update' && method === 'POST') {
      try {
        const bodyData = await parseJsonBody(req);
        if (!Array.isArray(bodyData)) {
          return sendJson(res, 400, { error: 'Plans must be an array' });
        }
        await db.updatePricingPlans(bodyData);
        return sendJson(res, 200, { success: true });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to update pricing plans' });
      }
    }

    // 12c. POST Upload Image (Base64)
    if (pathname === '/api/admin/upload' && method === 'POST') {
      try {
        const bodyData = await parseJsonBody(req);
        if (!bodyData.filename || !bodyData.data) {
          return sendJson(res, 400, { error: 'Filename and base64 data are required' });
        }
        
        const base64Data = bodyData.data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const safeFilename = Date.now() + '_' + bodyData.filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const filePath = path.join(__dirname, 'public', 'images', safeFilename);
        
        fs.writeFileSync(filePath, buffer);
        
        return sendJson(res, 200, { success: true, url: 'images/' + safeFilename });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to upload image' });
      }
    }

    // 12b. POST Update Website Content
    if (pathname === '/api/admin/content' && method === 'POST') {
      try {
        const bodyData = await parseJsonBody(req);
        await db.updateWebsiteContent(bodyData);
        return sendJson(res, 200, { success: true });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to update website content' });
      }
    }

    // 12c. POST Update Product Page Content
    if (pathname === '/api/admin/content/page' && method === 'POST') {
      try {
        const pageId = parsedUrl.query.id;
        if (!pageId) {
          return sendJson(res, 400, { error: 'Product page ID is required' });
        }
        const bodyData = await parseJsonBody(req);
        await db.updateProductPage(pageId, bodyData);
        return sendJson(res, 200, { success: true });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to update product page' });
      }
    }

    // 13. POST Update Password
    if (pathname === '/api/admin/password' && method === 'POST') {
      try {
        const bodyData = await parseJsonBody(req);
        if (!bodyData.password) {
          return sendJson(res, 400, { error: 'Password is required' });
        }
        await db.updateAdminPassword('admin', bodyData.password);
        return sendJson(res, 200, { success: true });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: 'Failed to update password' });
      }
    }
  }

  // --- SPECIAL ROUTE: SIMULATED CHECKOUT SCREEN ---
  if (pathname === '/simulated-checkout' && method === 'GET') {
    const chargeId = parsedUrl.query.charge_id;
    const payment = await db.getPaymentById(chargeId);

    if (!payment) {
      return sendHtml(res, 404, '<h1>Simulated Payment Session Not Found</h1>');
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tap Payments Sandbox Simulator</title>
      <style>
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #f4f5f8;
          color: #1a1f36;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          background: white;
          width: 100%;
          max-width: 460px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          overflow: hidden;
          border: 1px solid #e3e8ee;
        }
        .header {
          background: #4a5af7;
          color: white;
          padding: 24px;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 14px;
          opacity: 0.9;
        }
        .body {
          padding: 24px;
        }
        .merchant-card {
          background: #f7fafc;
          border: 1px solid #e3e8ee;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .row:last-child {
          margin-bottom: 0;
        }
        .label {
          color: #697386;
        }
        .value {
          font-weight: 600;
        }
        .total {
          border-top: 1px solid #e3e8ee;
          padding-top: 12px;
          margin-top: 12px;
          font-size: 16px;
        }
        .total .value {
          color: #4a5af7;
          font-size: 18px;
        }
        .card-simulator {
          border: 1px solid #cbd5e0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .card-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 12px;
          color: #4a5568;
        }
        .card-mock {
          height: 48px;
          background: #e2e8f0;
          border-radius: 6px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-size: 14px;
          font-family: monospace;
          letter-spacing: 2px;
          color: #4a5568;
          border: 1px solid #cbd5e0;
        }
        .actions {
          display: flex;
          gap: 12px;
        }
        button {
          flex: 1;
          padding: 14px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-success {
          background: #4a5af7;
          color: white;
        }
        .btn-success:hover {
          background: #3848df;
        }
        .btn-cancel {
          background: #e3e8ee;
          color: #4f566b;
        }
        .btn-cancel:hover {
          background: #d8deeb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">tap</div>
          <div class="subtitle">Secure Sandbox Checkout</div>
        </div>
        <div class="body">
          <div class="merchant-card">
            <div class="row">
              <span class="label">Merchant</span>
              <span class="value">Sikandar Ali Trading</span>
            </div>
            <div class="row">
              <span class="label">Software Product</span>
              <span class="value">Sikandar CRM</span>
            </div>
            <div class="row">
              <span class="label">CRM Plan</span>
              <span class="value">${payment.plan_name}</span>
            </div>
            <div class="row">
              <span class="label">Customer Email</span>
              <span class="value">${payment.customer_email}</span>
            </div>
            <div class="row total">
              <span class="label">Amount Due</span>
              <span class="value">${payment.amount_omr} OMR</span>
            </div>
          </div>
          
          <div class="card-simulator">
            <div class="card-title">Simulated Payment Card</div>
            <div class="card-mock">•••• •••• •••• 4129 (Tap Sandbox Card)</div>
          </div>

          <div class="actions">
            <form action="/simulated-complete" method="POST" style="flex: 1; display: flex; gap: 12px; width: 100%;">
              <input type="hidden" name="charge_id" value="${chargeId}">
              <button type="submit" name="action" value="success" class="btn-success">Approve Payment</button>
              <button type="submit" name="action" value="cancel" class="btn-cancel">Decline / Cancel</button>
            </form>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    return sendHtml(res, 200, htmlContent);
  }

  // POST Simulated Checkout Processing
  if (pathname === '/simulated-complete' && method === 'POST') {
    try {
      const formData = await parseFormBody(req);
      const chargeId = formData.charge_id;
      const action = formData.action;

      if (!chargeId) {
        return redirect(res, '/cancel.html');
      }

      if (action === 'success') {
        await db.updatePaymentStatus(chargeId, 'SUCCESS');
      } else {
        await db.updatePaymentStatus(chargeId, 'FAILED');
      }

      return redirect(res, `/api/payment-callback?charge_id=${chargeId}`);
    } catch (err) {
      console.error(err);
      return redirect(res, '/cancel.html');
    }
  }


  // --- STATIC FILES HANDLER ---
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  const ext = path.extname(filePath);
  if (!ext) {
    if (fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const fileExt = path.extname(filePath);
    const contentType = MIME_TYPES[fileExt] || 'application/octet-stream';

    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 File Not Found</h1><p>The requested URL was not found on this server.</p>');
  }
});

server.listen(PORT, () => {
  console.log(`Sikandar CRM Web Server listening at: ${BASE_URL}`);
});
