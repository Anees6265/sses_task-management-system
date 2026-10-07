const User = require('../models/User');

const seedUsers = [
  {
    name: 'System Administrator',
    email: 'admin@ssism.org',
    password: 'AdminPassword123!',
    role: 'admin'
  },
  {
    name: 'Dr. Alan Turing (HOD CS)',
    email: 'hod.cs@ssism.org',
    password: 'HodPassword123!',
    role: 'hod',
    department: 'Computer Science'
  },
  {
    name: 'Dr. Grace Hopper (HOD IT)',
    email: 'hod.it@ssism.org',
    password: 'HodPassword123!',
    role: 'hod',
    department: 'Information Technology'
  },
  {
    name: 'Prof. John Von Neumann',
    email: 'faculty.cs@ssism.org',
    password: 'FacultyPassword123!',
    role: 'user',
    department: 'Computer Science'
  },
  {
    name: 'Prof. Ada Lovelace',
    email: 'faculty.it@ssism.org',
    password: 'FacultyPassword123!',
    role: 'user',
    department: 'Information Technology'
  }
];

const autoSeed = async () => {
  try {
    for (const userData of seedUsers) {
      let existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✨ Auto-seeded user: ${userData.email} (${userData.role})`);
      }
    }
    console.log('🎉 Default role accounts verified & ready!');
  } catch (error) {
    console.error('❌ Auto-seed error:', error.message);
  }
};

module.exports = autoSeed;
