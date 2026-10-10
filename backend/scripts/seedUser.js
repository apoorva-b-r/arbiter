require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function seedUser() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from backend/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const username = 'Operator-Alpha';
    const passwordHash = await bcrypt.hash('Arbiter2026!', 12);

    await User.deleteOne({ username });

    await User.create({
      username,
      passwordHash,
      role: 'operator'
    });

    console.log('Seeded Operator-Alpha');
  } catch (error) {
    console.error('Failed to seed operator:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedUser();
