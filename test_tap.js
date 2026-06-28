const https = require('https');
require('dotenv').config();

const data = JSON.stringify({
  "amount": 1,
  "currency": "KWD",
  "customer_initiated": true,
  "threeDSecure": true,
  "save_card": false,
  "description": "Test Description",
  "metadata": {
    "udf1": "Metadata 1"
  },
  "receipt": {
    "email": false,
    "sms": false
  },
  "reference": {
    "transaction": "txn_01",
    "order": "ord_01"
  },
  "customer": {
    "first_name": "test",
    "middle_name": "test",
    "last_name": "test",
    "email": "test@test.com",
    "phone": {
      "country_code": 965,
      "number": 51234567
    }
  },
  "merchant": {
    "id": "1234"
  },
  "source": {
    "id": "token_id"
  },
  "authentication": {
      "version": "3DS2",
      "acsEci": "05",
      "authentication_token": "AAkCAjVzMAAAAI6UaCIwdQAAAAA=",
      "transaction_id": "7147739c-b9e8-4a4d-b109-5cb0987dae49",
      "protocol_version": "2.2.0",
      "transaction_status": "Y",
      "ds_transaction_id": "d777a4d6-bad4-47ee-8d63-56ad7f7c6669",
      "threeds_server_transaction_id": "d777a4d6-bad4-47ee-8d63-56ad7f7c6669" 
  },
  "post": {
    "url": "http://your_website.com/post_url"
  },
  "redirect": {
    "url": "http://your_website.com/redirect_url"
  }
});

const options = {
  hostname: 'api.tap.company',
  port: 443,
  path: '/v2/charges/',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + (process.env.TAP_SECRET_KEY || 'sk_test_placeholder_key'),
    'accept': 'application/json',
    'content-type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);

  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
