const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\THE DESIGN SHOP\\.gemini\\antigravity-ide\\brain\\dbf38496-aed0-4cdc-a7ed-e12bae88a805\\crm_dashboard_1782115392827.png';
const dest = path.join(__dirname, 'public', 'crm_dashboard.png');

try {
  // Ensure public folder exists
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.copyFileSync(src, dest);
  console.log('Image copied successfully to: ' + dest);
} catch (e) {
  console.error('Error copying file:', e.message);
}
