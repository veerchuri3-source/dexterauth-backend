const crypto = require('crypto');
console.log('JWT_SECRET=' + crypto.randomBytes(48).toString('hex'));
console.log('Generate more if needed:');
console.log('  node generate-secrets.cjs');
