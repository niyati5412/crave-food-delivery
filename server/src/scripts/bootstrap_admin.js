require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function bootstrapAdmin() {
  const args = process.argv.slice(2);
  const email = (args[0] || 'admin@crave.com').toLowerCase();
  const password = args[1] || 'admin123';
  const name = args[2] || 'Platform Administrator';

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crave_food_delivery';
  await mongoose.connect(mongoUri);

  const User = require('../models/User');

  const existing = await User.findOne({ email });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  if (existing) {
    existing.role = 'admin';
    existing.accountStatus = 'active';
    existing.passwordHash = passwordHash;
    existing.name = name;
    await existing.save();
    console.log(`✅ Administrator account updated successfully: ${email}`);
  } else {
    await User.create({
      name,
      email,
      phone: '9999999999',
      passwordHash,
      role: 'admin',
      accountStatus: 'active'
    });
    console.log(`✅ Administrator account bootstrapped successfully: ${email}`);
  }

  process.exit(0);
}

bootstrapAdmin().catch(err => {
  console.error('Admin bootstrap error:', err);
  process.exit(1);
});
