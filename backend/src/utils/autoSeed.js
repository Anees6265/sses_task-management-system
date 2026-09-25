const User = require('../models/User');

const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
const defaultHodPassword = process.env.SEED_HOD_PASSWORD || 'HodPassword123!';
const defaultFacultyPassword = process.env.SEED_FACULTY_PASSWORD || 'FacultyPassword123!';

const seedUsers = [
  // System Admin
  {
    name: 'System Administrator',
    email: 'admin@ssism.org',
    password: defaultAdminPassword,
    role: 'admin',
    phoneNumber: '+919876543210'
  },

  // Computer Science Department (HOD + 3 Faculties)
  {
    name: 'Dr. Alan Turing (HOD CS)',
    email: 'hod.cs@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Computer Science',
    phoneNumber: '+919876543211'
  },
  {
    name: 'Prof. John Von Neumann',
    email: 'faculty.cs@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Computer Science',
    phoneNumber: '+919876543212'
  },
  {
    name: 'Prof. Claude Shannon',
    email: 'shannon.cs@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Computer Science',
    phoneNumber: '+919876543213'
  },
  {
    name: 'Prof. Donald Knuth',
    email: 'knuth.cs@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Computer Science',
    phoneNumber: '+919876543214'
  },

  // Information Technology Department (HOD + 3 Faculties)
  {
    name: 'Dr. Grace Hopper (HOD IT)',
    email: 'hod.it@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Information Technology',
    phoneNumber: '+919876543215'
  },
  {
    name: 'Prof. Ada Lovelace',
    email: 'faculty.it@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Information Technology',
    phoneNumber: '+919876543216'
  },
  {
    name: 'Prof. Tim Berners-Lee',
    email: 'bernerslee.it@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Information Technology',
    phoneNumber: '+919876543217'
  },
  {
    name: 'Prof. Linus Torvalds',
    email: 'torvalds.it@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Information Technology',
    phoneNumber: '+919876543218'
  },

  // Electronics & Comm. Department (HOD + 3 Faculties)
  {
    name: 'Dr. Richard Feynman (HOD ECE)',
    email: 'feynman@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Electronics & Comm.',
    phoneNumber: '+919876543219'
  },
  {
    name: 'Prof. Robert Noyce',
    email: 'noyce.ece@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Electronics & Comm.',
    phoneNumber: '+919876543220'
  },
  {
    name: 'Prof. Nikola Tesla',
    email: 'tesla.ece@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Electronics & Comm.',
    phoneNumber: '+919876543221'
  },
  {
    name: 'Prof. James Clerk Maxwell',
    email: 'maxwell.ece@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Electronics & Comm.',
    phoneNumber: '+919876543222'
  },

  // Management Department (HOD + 3 Faculties)
  {
    name: 'Dr. W. Edwards Deming (HOD MGMT)',
    email: 'hod.mgmt@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Management',
    phoneNumber: '+919876543223'
  },
  {
    name: 'Prof. Peter Drucker',
    email: 'drucker.mgmt@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Management',
    phoneNumber: '+919876543224'
  },
  {
    name: 'Prof. Michael Porter',
    email: 'porter.mgmt@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Management',
    phoneNumber: '+919876543225'
  },
  {
    name: 'Prof. Philip Kotler',
    email: 'kotler.mgmt@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Management',
    phoneNumber: '+919876543226'
  }
];

const autoSeed = async () => {
  try {
    for (const userData of seedUsers) {
      let existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✨ Auto-seeded user: ${userData.email} (${userData.role} - ${userData.department || 'Admin'})`);
      } else if (!existingUser.phoneNumber) {
        existingUser.phoneNumber = userData.phoneNumber;
        await existingUser.save();
        console.log(`📱 Updated phone number for: ${userData.email}`);
      }
    }
    console.log('🎉 Default faculties per department seeded & updated!');
  } catch (error) {
    console.error('❌ Auto-seed error:', error.message);
  }
};

module.exports = autoSeed;
