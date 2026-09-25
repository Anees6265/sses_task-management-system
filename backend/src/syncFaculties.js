const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  department: String
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
const defaultHodPassword = process.env.SEED_HOD_PASSWORD || 'HodPassword123!';
const defaultFacultyPassword = process.env.SEED_FACULTY_PASSWORD || 'FacultyPassword123!';

const seedUsers = [
  // Admin
  { name: 'System Administrator', email: 'admin@ssism.org', password: defaultAdminPassword, role: 'admin' },

  // Computer Science
  { name: 'Dr. Alan Turing (HOD CS)', email: 'hod.cs@ssism.org', password: defaultHodPassword, role: 'hod', department: 'Computer Science' },
  { name: 'Prof. John Von Neumann', email: 'faculty.cs@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Computer Science' },
  { name: 'Prof. Claude Shannon', email: 'shannon.cs@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Computer Science' },
  { name: 'Prof. Donald Knuth', email: 'knuth.cs@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Computer Science' },

  // Information Technology
  { name: 'Dr. Grace Hopper (HOD IT)', email: 'hod.it@ssism.org', password: defaultHodPassword, role: 'hod', department: 'Information Technology' },
  { name: 'Prof. Ada Lovelace', email: 'faculty.it@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Information Technology' },
  { name: 'Prof. Tim Berners-Lee', email: 'bernerslee.it@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Information Technology' },
  { name: 'Prof. Linus Torvalds', email: 'torvalds.it@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Information Technology' },

  // Electronics & Comm.
  { name: 'Dr. Richard Feynman (HOD ECE)', email: 'feynman@ssism.org', password: defaultHodPassword, role: 'hod', department: 'Electronics & Comm.' },
  { name: 'Prof. Robert Noyce', email: 'noyce.ece@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Electronics & Comm.' },
  { name: 'Prof. Nikola Tesla', email: 'tesla.ece@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Electronics & Comm.' },
  { name: 'Prof. James Clerk Maxwell', email: 'maxwell.ece@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Electronics & Comm.' },

  // Management
  { name: 'Dr. W. Edwards Deming (HOD MGMT)', email: 'hod.mgmt@ssism.org', password: defaultHodPassword, role: 'hod', department: 'Management' },
  { name: 'Prof. Peter Drucker', email: 'drucker.mgmt@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Management' },
  { name: 'Prof. Michael Porter', email: 'porter.mgmt@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Management' },
  { name: 'Prof. Philip Kotler', email: 'kotler.mgmt@ssism.org', password: defaultFacultyPassword, role: 'user', department: 'Management' }
];

async function sync() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!');

    for (const u of seedUsers) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await User.create({
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          department: u.department
        });
        console.log(`➕ Created: ${u.email} (${u.role})`);
      } else {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        existing.name = u.name;
        existing.password = hashedPassword;
        existing.role = u.role;
        if (u.department) existing.department = u.department;
        await existing.save();
        console.log(`🔄 Updated: ${u.email} (${u.role})`);
      }
    }

    const total = await User.countDocuments();
    console.log(`\n🎉 Total users in MongoDB Atlas DB: ${total}`);

    const allUsers = await User.find({}, 'name email role department');
    console.log('\n--- ALL DB USERS ---');
    console.table(allUsers.map(u => ({ name: u.name, email: u.email, role: u.role, dept: u.department || 'N/A' })));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

sync();
