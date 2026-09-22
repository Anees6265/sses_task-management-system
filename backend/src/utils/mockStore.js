const demoUsers = [
  {
    _id: '64e000000000000000000001',
    name: 'System Administrator',
    email: 'admin@ssism.org',
    passwordRaw: 'AdminPassword123!',
    role: 'admin',
    department: 'Management',
    leaveBalance: { casual: 12, sick: 10, earned: 15 }
  },
  {
    _id: '64e000000000000000000002',
    name: 'Dr. Alan Turing (HOD CS)',
    email: 'hod.cs@ssism.org',
    passwordRaw: 'HodPassword123!',
    role: 'hod',
    department: 'Computer Science',
    leaveBalance: { casual: 10, sick: 8, earned: 14 }
  },
  {
    _id: '64e000000000000000000003',
    name: 'Dr. Grace Hopper (HOD IT)',
    email: 'hod.it@ssism.org',
    passwordRaw: 'HodPassword123!',
    role: 'hod',
    department: 'Information Technology',
    leaveBalance: { casual: 11, sick: 9, earned: 12 }
  },
  {
    _id: '64e000000000000000000004',
    name: 'Prof. John Von Neumann',
    email: 'faculty.cs@ssism.org',
    passwordRaw: 'FacultyPassword123!',
    role: 'user',
    department: 'Computer Science',
    leaveBalance: { casual: 8, sick: 9, earned: 13 }
  },
  {
    _id: '64e000000000000000000005',
    name: 'Prof. Ada Lovelace',
    email: 'faculty.it@ssism.org',
    passwordRaw: 'FacultyPassword123!',
    role: 'user',
    department: 'Information Technology',
    leaveBalance: { casual: 9, sick: 10, earned: 15 }
  },
  {
    _id: '64e000000000000000000006',
    name: 'Prof. Claude Shannon',
    email: 'shannon@ssism.org',
    passwordRaw: 'FacultyPassword123!',
    role: 'user',
    department: 'Computer Science',
    leaveBalance: { casual: 12, sick: 10, earned: 15 }
  },
  {
    _id: '64e000000000000000000007',
    name: 'Prof. Tim Berners-Lee',
    email: 'bernerslee@ssism.org',
    passwordRaw: 'FacultyPassword123!',
    role: 'user',
    department: 'Information Technology',
    leaveBalance: { casual: 10, sick: 10, earned: 12 }
  },
  {
    _id: '64e000000000000000000008',
    name: 'Dr. Richard Feynman (HOD ECE)',
    email: 'feynman@ssism.org',
    passwordRaw: 'HodPassword123!',
    role: 'hod',
    department: 'Electronics & Comm.',
    leaveBalance: { casual: 12, sick: 10, earned: 15 }
  },
  {
    _id: '64e000000000000000000009',
    name: 'Prof. Robert Noyce',
    email: 'noyce@ssism.org',
    passwordRaw: 'FacultyPassword123!',
    role: 'user',
    department: 'Electronics & Comm.',
    leaveBalance: { casual: 7, sick: 9, earned: 10 }
  }
];

const demoTasks = [
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
    title: 'Update IT Curriculum Handbook 2026',
    description: 'Review accreditation guidelines and update IT course outcomes',
    priority: 'medium',
    status: 'inprogress',
    department: 'Information Technology',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    assignedTo: [{ _id: '64e000000000000000000005', name: 'Prof. Ada Lovelace', email: 'faculty.it@ssism.org' }],
    createdBy: { _id: '64e000000000000000000003', name: 'Dr. Grace Hopper (HOD IT)', email: 'hod.it@ssism.org' },
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
  },
  {
    _id: '64l000000000000000000003',
    applicant: { _id: '64e000000000000000000006', name: 'Prof. Claude Shannon', email: 'shannon@ssism.org', department: 'Computer Science' },
    leaveType: 'earned',
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    totalDays: 4,
    reason: 'Attending IEEE Research Workshop in Bangalore',
    department: 'Computer Science',
    status: 'pending',
    createdAt: new Date()
  },
  {
    _id: '64l000000000000000000004',
    applicant: { _id: '64e000000000000000000007', name: 'Prof. Tim Berners-Lee', email: 'bernerslee@ssism.org', department: 'Information Technology' },
    leaveType: 'casual',
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    totalDays: 2,
    reason: 'Attending Web Standards Summit',
    department: 'Information Technology',
    status: 'pending',
    createdAt: new Date()
  },
  {
    _id: '64l000000000000000000005',
    applicant: { _id: '64e000000000000000000009', name: 'Prof. Robert Noyce', email: 'noyce@ssism.org', department: 'Electronics & Comm.' },
    leaveType: 'duty',
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    totalDays: 3,
    reason: 'Semiconductor Fabrication Lab Inspection Duty',
    department: 'Electronics & Comm.',
    status: 'approved',
    reviewedBy: { _id: '64e000000000000000000008', name: 'Dr. Richard Feynman (HOD ECE)', email: 'feynman@ssism.org' },
    reviewComment: 'Official Duty Approved.',
    reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  }
];

module.exports = { demoUsers, demoTasks, demoLeaves };
