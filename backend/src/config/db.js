const mongoose = require('mongoose');
const dns = require('dns');
const autoSeed = require('../utils/autoSeed');

// Configure public DNS servers to resolve MongoDB Atlas SRV records reliably
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('DNS server configuration warning:', e.message);
}

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    await autoSeed();
  } catch (error) {
    console.error('❌ MongoDB Atlas Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
