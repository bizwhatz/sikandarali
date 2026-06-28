const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sikandar_crm'
  });

  const [rows] = await connection.execute('SELECT value FROM settings WHERE `key` = "pricing_plans"');
  if (rows.length > 0) {
    const plans = JSON.parse(rows[0].value);
    console.log("Current plans in database:");
    plans.forEach(p => {
      if (p.id.startsWith('crm_')) {
        console.log(`- ${p.name} (${p.id}): Price=${p.price}, Yearly=${p.price_yearly || 'None'}, Lifetime=${p.price_lifetime || 'None'}`);
      }
    });
  } else {
    console.log("No pricing plans found in database.");
  }
  await connection.end();
}

check().catch(console.error);
