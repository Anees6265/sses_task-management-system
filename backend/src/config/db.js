const mongoose = require('mongoose');
const dns = require('dns');
const autoSeed = require('../utils/autoSeed');

// Configure public DNS servers to resolve MongoDB Atlas SRV records reliably
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('DNS server configuration warning:', e.message);
}

let isConnecting = false;
let retryTimer = null;

const getMongoUri = () => {
  let uri = process.env.MONGODB_URI;
  if (!uri) return '';
  if (uri.endsWith('/')) {
    return uri + 'sses_task_manager?retryWrites=true&w=majority';
  }
  return uri;
};

const connectDB = async (isRetry = false) => {
  if (isConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  isConnecting = true;
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    console.warn('⚠️ MONGODB_URI not provided in .env. Running with Mock Store.');
    isConnecting = false;
    return;
  }

  try {
    if (!isRetry) {
      console.log('Connecting to MongoDB Atlas...');
    }
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 6000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    await autoSeed();
  } catch (error) {
    if (!isRetry) {
      console.error('❌ MongoDB Atlas Connection Error:', error.message);
      console.warn('⚠️ Running in Resilient Mock Store mode — Server is running & all features remain active!');
      console.log('💡 Note: If MongoDB Atlas closed the connection, please whitelist your IP in Atlas:');
      console.log('   1. Open cloud.mongodb.com -> Network Access');
      console.log('   2. Add IP Address: "0.0.0.0/0" (Allow from Anywhere) or Add Current IP\n');
    }
    
    // Auto-retry in background every 20 seconds so it connects as soon as network/IP is ready
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectDB(true);
      }, 20000);
    }
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Controllers serving from resilient mock store.');
  if (!retryTimer) {
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connectDB(true);
    }, 15000);
  }
});

mongoose.connection.on('error', (err) => {
  console.warn('⚠️ Mongoose connection event error:', err.message);
});

module.exports = connectDB;
