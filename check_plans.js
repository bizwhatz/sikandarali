const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sikandar_crm'
  });

  const [rows] = await connection.execute('SELECT value FROM settings WHERE `key` = "pricing_plans"');
  if (rows.length > 0) {
    console.log(JSON.stringify(JSON.parse(rows[0].value), null, 2));
  } else {
    console.log("No pricing plans key found in settings.");
  }
  
  await connection.end();
}

run().catch(console.error);
