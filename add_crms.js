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
    let plans = JSON.parse(rows[0].value);
    const newPlans = [
      { id: 'crm_hospital', name: 'Hospital CRM', price: 99, billing: 'month', type: 'Software', description: 'Hospital CRM Management', features: [] },
      { id: 'crm_sales', name: 'Sales CRM', price: 99, billing: 'month', type: 'Software', description: 'Sales Pipeline Tracking', features: [] },
      { id: 'crm_hotel', name: 'Hotel CRM', price: 99, billing: 'month', type: 'Software', description: 'Hotel Booking Integration', features: [] }
    ];
    
    for (const np of newPlans) {
      if (!plans.find(p => p.id === np.id)) {
        plans.push(np);
      }
    }
    
    await connection.execute('UPDATE settings SET value = ? WHERE `key` = "pricing_plans"', [JSON.stringify(plans)]);
    console.log("Successfully added the 3 CRMs to the database!");
  }
  
  await connection.end();
}

run().catch(console.error);
