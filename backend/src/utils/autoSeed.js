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
    role: 'admin'
  },

  // Computer Science Department (HOD + 3 Faculties)
  {
    name: 'Dr. Alan Turing (HOD CS)',
    email: 'hod.cs@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Computer Science'
  },
  {
    name: 'Prof. John Von Neumann',
    email: 'faculty.cs@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Computer Science'
  },
  {
    name: 'Prof. Claude Shannon',
    email: 'shannon.cs@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Computer Science'
  },
  {
    name: 'Prof. Donald Knuth',
    email: 'knuth.cs@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Computer Science'
  },

  // Information Technology Department (HOD + 3 Faculties)
  {
    name: 'Dr. Grace Hopper (HOD IT)',
    email: 'hod.it@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Information Technology'
  },
  {
    name: 'Prof. Ada Lovelace',
    email: 'faculty.it@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Information Technology'
  },
  {
    name: 'Prof. Tim Berners-Lee',
    email: 'bernerslee.it@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Information Technology'
  },
  {
    name: 'Prof. Linus Torvalds',
    email: 'torvalds.it@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Information Technology'
  },

  // Electronics & Comm. Department (HOD + 3 Faculties)
  {
    name: 'Dr. Richard Feynman (HOD ECE)',
    email: 'feynman@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Electronics & Comm.'
  },
  {
    name: 'Prof. Robert Noyce',
    email: 'noyce.ece@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Electronics & Comm.'
  },
  {
    name: 'Prof. Nikola Tesla',
    email: 'tesla.ece@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Electronics & Comm.'
  },
  {
    name: 'Prof. James Clerk Maxwell',
    email: 'maxwell.ece@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Electronics & Comm.'
  },

  // Management Department (HOD + 3 Faculties)
  {
    name: 'Dr. W. Edwards Deming (HOD MGMT)',
    email: 'hod.mgmt@ssism.org',
    password: defaultHodPassword,
    role: 'hod',
    department: 'Management'
  },
  {
    name: 'Prof. Peter Drucker',
    email: 'drucker.mgmt@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Management'
  },
  {
    name: 'Prof. Michael Porter',
    email: 'porter.mgmt@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Management'
  },
  {
    name: 'Prof. Philip Kotler',
    email: 'kotler.mgmt@ssism.org',
    password: defaultFacultyPassword,
    role: 'user',
    department: 'Management'
  }
];

const autoSeed = async () => {
  try {
    for (const userData of seedUsers) {
      let existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✨ Auto-seeded user: ${userData.email} (${userData.role} - ${userData.department || 'Admin'})`);
      }
    }
    console.log('🎉 Default 3 faculties per department seeded & ready!');
  } catch (error) {
    console.error('❌ Auto-seed error:', error.message);
  }
};

module.exports = autoSeed;
