const db = require('./db');

async function migrate() {
  console.log('Starting migration...');
  await db.init();
  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
