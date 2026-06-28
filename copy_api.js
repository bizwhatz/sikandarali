const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyDir('C:\\Users\\THE DESIGN SHOP\\Desktop\\tap payment\\.api', 'C:\\Users\\THE DESIGN SHOP\\Desktop\\2d payment gateway\\.api');
  console.log('Copied .api folder successfully!');
} catch (e) {
  console.error('Failed to copy .api folder:', e);
}
