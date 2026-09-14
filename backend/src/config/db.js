const mongoose = require('mongoose');
const dns = require('dns');
const autoSeed = require('../utils/autoSeed');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const connectDB = async () => {
  try {
    console.log('Attempting connection to Primary MongoDB...');
    mongoose.set('bufferCommands', false);
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000
    });
    console.log('✅ Primary MongoDB Atlas Connected Successfully!');
    await autoSeed();
  } catch (error) {
    console.warn('\n⚠️ Cloud MongoDB Atlas connection failed (IP restriction / Network timeout).');
    console.log('⚡ Launching In-Memory Fallback Database automatically from Code...\n');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const mongoUri = mongod.getUri();

      await mongoose.connect(mongoUri);
      console.log('✅ In-Memory MongoDB Server Connected Successfully!');
      console.log('💡 Note: Application is running in In-Memory Database Mode (No IP Whitelist needed!)');

      await autoSeed();
    } catch (memError) {
      console.error('❌ Failed to launch In-Memory MongoDB:', memError.message);
    }
  }
};

module.exports = connectDB;
