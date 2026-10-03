require('dotenv').config({ path: __dirname + '/../.env' });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const User = require('./models/User');

const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
const defaultHodPassword = process.env.SEED_HOD_PASSWORD || 'HodPassword123!';
const defaultFacultyPassword = process.env.SEED_FACULTY_PASSWORD || 'FacultyPassword123!';

const seedUsers = [
  {
    name: 'System Administrator',
    email: 'admin@ssism.org',
    password: defaultAdminPassword,
    role: 'admin'
  },
  {
    name: 'Dr. Alan Turing (HOD CS)',
    email: 'hod.cs@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Computer Science'
  },
  {
    name: 'Dr. Grace Hopper (HOD IT)',
    email: 'hod.it@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Information Technology'
  },
  {
    name: 'Prof. John Von Neumann',
    email: 'faculty.cs@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Computer Science'
  },
  {
    name: 'Prof. Ada Lovelace',
    email: 'faculty.it@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Information Technology'
  }
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is missing in backend/.env');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to MongoDB successfully.');

    for (const userData of seedUsers) {
      let existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        existingUser.name = userData.name;
        existingUser.password = userData.password;
        existingUser.role = userData.role;
        if (userData.department) existingUser.department = userData.department;
        await existingUser.save();
        console.log(`✅ Updated user: ${userData.email} [Role: ${userData.role}]`);
      } else {
        await User.create(userData);
        console.log(`✨ Created user: ${userData.email} [Role: ${userData.role}]`);
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database Connection / Seeding Error:', error.message);
    if (error.message.includes('whitelisted') || error.message.includes('ReplicaSetNoPrimary') || error.name === 'MongooseServerSelectionError') {
      console.log('\n📌 NOTE ON MONGODB ATLAS IP WHITELISTING:');
      console.log('If connecting to MongoDB Atlas cloud, ensure your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas Network Access.');
    }
    process.exit(1);
  }
};

seedDB();
