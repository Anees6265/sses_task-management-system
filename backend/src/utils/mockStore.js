const demoUsers = [
  // Admin
  {
    _id: '64e000000000000000000001',
    name: 'System Administrator',
    email: 'admin@ssism.org',
    role: 'admin',
    department: 'Management',
    phoneNumber: '+919876543210',
    leaveBalance: { casual: 12, sick: 10, earned: 15 }
  },

  // Computer Science
  {
    _id: '64e000000000000000000002',
    name: 'Dr. Alan Turing (HOD CS)',
    email: 'hod.cs@ssism.org',
    role: 'hod',
    department: 'Computer Science',
    phoneNumber: '+919876543211',
    leaveBalance: { casual: 10, sick: 8, earned: 14 }
  },
  {
    _id: '64e000000000000000000004',
    name: 'Prof. John Von Neumann',
    email: 'faculty.cs@ssism.org',
    role: 'user',
    department: 'Computer Science',
    phoneNumber: '+919876543212',
    leaveBalance: { casual: 8, sick: 9, earned: 13 }
  },
  {
    _id: '64e000000000000000000006',
    name: 'Prof. Claude Shannon',
    email: 'shannon.cs@ssism.org',
    role: 'user',
    department: 'Computer Science',
    phoneNumber: '+919876543213',
    leaveBalance: { casual: 12, sick: 10, earned: 15 }
  },
  {
    _id: '64e000000000000000000010',
    name: 'Prof. Donald Knuth',
    email: 'knuth.cs@ssism.org',
    role: 'user',
    department: 'Computer Science',
    phoneNumber: '+919876543214',
    leaveBalance: { casual: 10, sick: 10, earned: 12 }
  },

  // Information Technology
  {
    _id: '64e000000000000000000003',
    name: 'Dr. Grace Hopper (HOD IT)',
    email: 'hod.it@ssism.org',
    role: 'hod',
    department: 'Information Technology',
    phoneNumber: '+919876543215',
    leaveBalance: { casual: 11, sick: 9, earned: 12 }
  },
  {
    _id: '64e000000000000000000005',
    name: 'Prof. Ada Lovelace',
    email: 'faculty.it@ssism.org',
    role: 'user',
    department: 'Information Technology',
    phoneNumber: '+919876543216',
    leaveBalance: { casual: 9, sick: 10, earned: 15 }
  },
  {
    _id: '64e000000000000000000007',
    name: 'Prof. Tim Berners-Lee',
    email: 'bernerslee.it@ssism.org',
    role: 'user',
    department: 'Information Technology',
    phoneNumber: '+919876543217',
    leaveBalance: { casual: 10, sick: 10, earned: 12 }
  },
  {
    _id: '64e000000000000000000011',
    name: 'Prof. Linus Torvalds',
    email: 'torvalds.it@ssism.org',
    role: 'user',
    department: 'Information Technology',
    phoneNumber: '+919876543218',
    leaveBalance: { casual: 11, sick: 8, earned: 14 }
  },

  // Electronics & Comm.
  {
    _id: '64e000000000000000000008',
    name: 'Dr. Richard Feynman (HOD ECE)',
    email: 'feynman@ssism.org',
    role: 'hod',
    department: 'Electronics & Comm.',
    phoneNumber: '+919876543219',
    leaveBalance: { casual: 12, sick: 10, earned: 15 }
  },
  {
    _id: '64e000000000000000000009',
    name: 'Prof. Robert Noyce',
    email: 'noyce.ece@ssism.org',
    role: 'user',
    department: 'Electronics & Comm.',
    phoneNumber: '+919876543220',
    leaveBalance: { casual: 7, sick: 9, earned: 10 }
  },
  {
    _id: '64e000000000000000000012',
    name: 'Prof. Nikola Tesla',
    email: 'tesla.ece@ssism.org',
    role: 'user',
    department: 'Electronics & Comm.',
    phoneNumber: '+919876543221',
    leaveBalance: { casual: 10, sick: 12, earned: 10 }
  },
  {
    _id: '64e000000000000000000013',
    name: 'Prof. James Clerk Maxwell',
    email: 'maxwell.ece@ssism.org',
    role: 'user',
    department: 'Electronics & Comm.',
    phoneNumber: '+919876543222',
    leaveBalance: { casual: 9, sick: 11, earned: 13 }
  },

  // Management
  {
    _id: '64e000000000000000000014',
    name: 'Dr. W. Edwards Deming (HOD MGMT)',
    email: 'hod.mgmt@ssism.org',
    role: 'hod',
    department: 'Management',
    phoneNumber: '+919876543223',
    leaveBalance: { casual: 12, sick: 10, earned: 15 }
  },
  {
    _id: '64e000000000000000000015',
    name: 'Prof. Peter Drucker',
    email: 'drucker.mgmt@ssism.org',
    role: 'user',
    department: 'Management',
    phoneNumber: '+919876543224',
    leaveBalance: { casual: 10, sick: 10, earned: 14 }
  },
  {
    _id: '64e000000000000000000016',
    name: 'Prof. Michael Porter',
    email: 'porter.mgmt@ssism.org',
    role: 'user',
    department: 'Management',
    phoneNumber: '+919876543225',
    leaveBalance: { casual: 11, sick: 9, earned: 12 }
  },
  {
    _id: '64e000000000000000000017',
    name: 'Prof. Philip Kotler',
    email: 'kotler.mgmt@ssism.org',
    role: 'user',
    department: 'Management',
    phoneNumber: '+919876543226',
    leaveBalance: { casual: 8, sick: 10, earned: 15 }
  }
];

const demoTasks = [
  // CS Tasks
  {
    _id: '64f000000000000000000001',
    title: 'Prepare Mid-Semester Exam Questions',
    description: 'Draft 5 questions for Data Structures & Algorithms',
    priority: 'high',
    status: 'todo',
    department: 'Computer Science',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000004', name: 'Prof. John Von Neumann', email: 'faculty.cs@ssism.org' }],
    createdBy: { _id: '64e000000000000000000002', name: 'Dr. Alan Turing (HOD CS)', email: 'hod.cs@ssism.org' },
    createdAt: new Date()
  },
  {
    _id: '64f000000000000000000002',
    title: 'Review Lab Assignments & Submissions',
    description: 'Evaluate weekly C++ programming assignments',
    priority: 'medium',
    status: 'inprogress',
    department: 'Computer Science',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000006', name: 'Prof. Claude Shannon', email: 'shannon.cs@ssism.org' }],
    createdBy: { _id: '64e000000000000000000002', name: 'Dr. Alan Turing (HOD CS)', email: 'hod.cs@ssism.org' },
    createdAt: new Date()
  },
  {
    _id: '64f000000000000000000003',
    title: 'Algorithm Analysis Seminar Setup',
    description: 'Organize guest lecture on P vs NP complexity',
    priority: 'low',
    status: 'completed',
    department: 'Computer Science',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000010', name: 'Prof. Donald Knuth', email: 'knuth.cs@ssism.org' }],
    createdBy: { _id: '64e000000000000000000002', name: 'Dr. Alan Turing (HOD CS)', email: 'hod.cs@ssism.org' },
    createdAt: new Date()
  },

  // IT Tasks
  {
    _id: '64f000000000000000000004',
    title: 'Update IT Curriculum Handbook 2026',
    description: 'Review accreditation guidelines and update IT course outcomes',
    priority: 'medium',
    status: 'inprogress',
    department: 'Information Technology',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000005', name: 'Prof. Ada Lovelace', email: 'faculty.it@ssism.org' }],
    createdBy: { _id: '64e000000000000000000003', name: 'Dr. Grace Hopper (HOD IT)', email: 'hod.it@ssism.org' },
    createdAt: new Date()
  },
  {
    _id: '64f000000000000000000005',
    title: 'Network Security Lab Setup',
    description: 'Configure router and firewall software for IT laboratory',
    priority: 'high',
    status: 'todo',
    department: 'Information Technology',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000007', name: 'Prof. Tim Berners-Lee', email: 'bernerslee.it@ssism.org' }],
    createdBy: { _id: '64e000000000000000000003', name: 'Dr. Grace Hopper (HOD IT)', email: 'hod.it@ssism.org' },
    createdAt: new Date()
  },
  {
    _id: '64f000000000000000000006',
    title: 'Linux Kernel Workshop Planning',
    description: 'Prepare hands-on exercises for OS laboratory',
    priority: 'medium',
    status: 'inprogress',
    department: 'Information Technology',
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000011', name: 'Prof. Linus Torvalds', email: 'torvalds.it@ssism.org' }],
    createdBy: { _id: '64e000000000000000000003', name: 'Dr. Grace Hopper (HOD IT)', email: 'hod.it@ssism.org' },
    createdAt: new Date()
  },

  // ECE Tasks
  {
    _id: '64f000000000000000000007',
    title: 'Microprocessor Kit Calibration',
    description: 'Test all 8085/8086 trainer kits in ECE hardware lab',
    priority: 'medium',
    status: 'inprogress',
    department: 'Electronics & Comm.',
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000009', name: 'Prof. Robert Noyce', email: 'noyce.ece@ssism.org' }],
    createdBy: { _id: '64e000000000000000000008', name: 'Dr. Richard Feynman (HOD ECE)', email: 'feynman@ssism.org' },
    createdAt: new Date()
  },
  {
    _id: '64f000000000000000000008',
    title: 'Electromagnetic Field Simulation',
    description: 'Setup MATLAB scripts for high frequency Antenna design lab',
    priority: 'high',
    status: 'todo',
    department: 'Electronics & Comm.',
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000013', name: 'Prof. James Clerk Maxwell', email: 'maxwell.ece@ssism.org' }],
    createdBy: { _id: '64e000000000000000000008', name: 'Dr. Richard Feynman (HOD ECE)', email: 'feynman@ssism.org' },
    createdAt: new Date()
  },

  // Management Tasks
  {
    _id: '64f000000000000000000009',
    title: 'Strategic Marketing Workshop',
    description: 'Conduct interactive session on digital marketing analytics',
    priority: 'medium',
    status: 'inprogress',
    department: 'Management',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000017', name: 'Prof. Philip Kotler', email: 'kotler.mgmt@ssism.org' }],
    createdBy: { _id: '64e000000000000000000014', name: 'Dr. W. Edwards Deming (HOD MGMT)', email: 'hod.mgmt@ssism.org' },
    createdAt: new Date()
  }
];

const demoLeaves = [
  {
    _id: '64l000000000000000000001',
    applicant: { _id: '64e000000000000000000004', name: 'Prof. John Von Neumann', email: 'faculty.cs@ssism.org', department: 'Computer Science' },
    leaveType: 'casual',
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    totalDays: 3,
    reason: 'Family urgent work & personal travel',
    department: 'Computer Science',
    status: 'approved',
    reviewedBy: { _id: '64e000000000000000000002', name: 'Dr. Alan Turing (HOD CS)', email: 'hod.cs@ssism.org' },
    reviewComment: 'Approved for urgent family work.',
    reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    _id: '64l000000000000000000002',
    applicant: { _id: '64e000000000000000000005', name: 'Prof. Ada Lovelace', email: 'faculty.it@ssism.org', department: 'Information Technology' },
    leaveType: 'sick',
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    totalDays: 4,
    reason: 'Viral fever and medical rest',
    department: 'Information Technology',
    status: 'approved',
    reviewedBy: { _id: '64e000000000000000000003', name: 'Dr. Grace Hopper (HOD IT)', email: 'hod.it@ssism.org' },
    reviewComment: 'Approved. Get well soon.',
    reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  }
];

const demoSundayAttendance = [];
const demoHolidays = [];

module.exports = { demoUsers, demoTasks, demoLeaves, demoSundayAttendance, demoHolidays };
