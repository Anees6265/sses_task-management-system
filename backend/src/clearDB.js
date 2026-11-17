require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const Task = require('./models/Task');
const Leave = require('./models/Leave');
const Message = require('./models/Message');
const Department = require('./models/Department');
const Holiday = require('./models/Holiday');
const SundayAttendance = require('./models/SundayAttendance');
const ActivityLog = require('./models/ActivityLog');
const TaskTemplate = require('./models/TaskTemplate');
const User = require('./models/User');
const autoSeed = require('./utils/autoSeed');

const mode = process.argv[2] || '--reset-seed';

async function clearDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in backend/.env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB:', mongoose.connection.name);

    console.log(`\n🧹 Starting Database Cleanup (Mode: ${mode})...\n`);

    // 1. Delete transactional / activity data
    const resTasks = await Task.deleteMany({});
    console.log(`- Deleted Tasks: ${resTasks.deletedCount}`);

    const resLeaves = await Leave.deleteMany({});
    console.log(`- Deleted Leaves: ${resLeaves.deletedCount}`);

    const resMessages = await Message.deleteMany({});
    console.log(`- Deleted Messages/Chats: ${resMessages.deletedCount}`);

    const resSunday = await SundayAttendance.deleteMany({});
    console.log(`- Deleted Sunday Attendance Records: ${resSunday.deletedCount}`);

    const resActivity = await ActivityLog.deleteMany({});
    console.log(`- Deleted Activity Logs: ${resActivity.deletedCount}`);

    const resTemplates = await TaskTemplate.deleteMany({});
    console.log(`- Deleted Task Templates: ${resTemplates.deletedCount}`);

    const resHolidays = await Holiday.deleteMany({});
    console.log(`- Deleted Holidays: ${resHolidays.deletedCount}`);

    if (mode === '--tasks-leaves-only') {
      console.log('\n✅ Tasks, leaves, and activity data cleared. Users and departments retained.');
    } else if (mode === '--full-wipe') {
      const resDepts = await Department.deleteMany({});
      console.log(`- Deleted Departments: ${resDepts.deletedCount}`);

      const resUsers = await User.deleteMany({});
      console.log(`- Deleted Users: ${resUsers.deletedCount}`);
      console.log('\n⚠️ Full wipe completed. All collections emptied (including all users).');
    } else {
      // Default: --reset-seed
      const resDepts = await Department.deleteMany({});
      console.log(`- Deleted Custom Departments: ${resDepts.deletedCount}`);

      const resUsers = await User.deleteMany({});
      console.log(`- Deleted Users: ${resUsers.deletedCount}`);

      console.log('\n🌱 Re-seeding default administrative and faculty accounts...');
      await autoSeed();
      console.log('✅ Default accounts restored (admin@ssism.org, HODs, Faculty).');
    }

    console.log('\n🎉 Database operation finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
}

clearDatabase();
