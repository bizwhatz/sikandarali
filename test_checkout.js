const http = require('http');

const postData = JSON.stringify({
  plan_id: 'checkout',
  customer_name: 'AI Test',
  customer_email: 'test@example.com',
  customer_phone: '12345678'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/create-charge',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
