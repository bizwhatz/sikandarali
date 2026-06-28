const db = require('./db');
require('dotenv').config();

async function updatePassword() {
  await db.init();
  const username = process.env.ADMIN_USERNAME || 'admin';
  const newPassword = process.env.ADMIN_PASSWORD || 'SIK@ndar_123';
  
  console.log(`Updating password for admin user "${username}" to "${newPassword}"...`);
  await db.updateAdminPassword(username, newPassword);
  
  console.log('\nSuccess! Admin password has been updated in both MySQL and JSON databases.');
  process.exit(0);
}

updatePassword().catch(err => {
  console.error('Error updating password:', err);
  process.exit(1);
});
