import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

const translations = {
  en: {
    // Navbar
    register: 'Register',
    settings: 'Settings',
    logout: 'Logout',
    admin: 'Admin',
    department: 'Department',
    
    // Dashboard
    adminDashboard: 'Admin Dashboard',
    overviewDepartments: 'Overview of all departments',
    overallProgress: 'Overall Progress',
    totalTasks: 'Total Tasks',
    todo: 'To Do',
    inProgress: 'In Progress',
    completed: 'Completed',
    departmentPerformance: 'Department Performance',
    departments: 'Departments',
    total: 'Total',
    progress: 'Progress',
    
    // Kanban Board
    sprintBoard: 'Sprint Board',
    dragDrop: 'Drag & drop tasks',
    newTask: 'New Task',
    allTasks: 'All Tasks',
    analytics: 'Analytics',
    comingSoon: 'Coming soon...',
    
    // Task Form
    createTask: 'Create New Task',
    editTask: 'Edit Task',
    taskTitle: 'Task Title',
    enterTitle: 'Enter task title',
    description: 'Description',
    enterDescription: 'Enter task description',
    priority: 'Priority',
    lowPriority: 'Low Priority',
    mediumPriority: 'Medium Priority',
    highPriority: 'High Priority',
    selectDepartment: 'Select Department',
    dueDate: 'Due Date',
    assignTo: 'Assign To',
    unassigned: 'Unassigned',
    createTaskBtn: 'Create Task',
    updateTask: 'Update Task',
    cancel: 'Cancel',
    
    // Login
    welcomeBack: 'Welcome Back',
    signInContinue: 'Sign in to continue',
    password: 'Password',
    otp: 'OTP',
    emailAddress: 'Email Address',
    enterEmail: 'Enter your @ssism.org email',
    enterPassword: 'Enter your password',
    signIn: 'Sign In',
    sendOTP: 'Send OTP',
    enterOTP: 'Enter OTP',
    verifyOTP: 'Verify OTP',
    resendOTP: 'Resend OTP',
    otpSent: 'OTP sent to',
    
    // Register
    registerUser: 'Register New User',
    createAccount: 'Create a new account',
    fullName: 'Full Name',
    enterName: 'Enter name',
    enterEmailReg: 'Enter @ssism.org email',
    phoneSignal: 'Phone (Signal)',
    minCharacters: 'Min 6 characters',
    role: 'Role',
    user: 'User',
    addCustom: 'Add Custom',
    enterCustomDept: 'Enter custom department',
    back: 'Back',
    
    // Modals
    deleteTask: 'Delete Task?',
    deleteConfirm: 'Are you sure you want to delete this task? This action cannot be undone.',
    delete: 'Delete',
    logoutConfirm: 'Are you sure you want to logout?',
    updateProfile: 'Update Profile',
    name: 'Name',
    email: 'Email',
    newPassword: 'New Password (optional)',
    leaveBlank: 'Leave blank to keep current',
    update: 'Update',
    
    // Messages
    loading: 'Loading...',
    loadingDashboard: 'Loading dashboard...',
    noTasks: 'No tasks',
    onlySSISM: 'Only @ssism.org email addresses are allowed',
  },
  hi: {
    // Navbar
    register: 'रजिस्टर करें',
    settings: 'सेटिंग्स',
    logout: 'लॉगआउट',
    admin: 'एडमिन',
    department: 'विभाग',
    
    // Dashboard
    adminDashboard: 'एडमिन डैशबोर्ड',
    overviewDepartments: 'सभी विभागों का अवलोकन',
    overallProgress: 'कुल प्रगति',
    totalTasks: 'कुल कार्य',
    todo: 'करना है',
    inProgress: 'प्रगति में',
    completed: 'पूर्ण',
    departmentPerformance: 'विभाग प्रदर्शन',
    departments: 'विभाग',
    total: 'कुल',
    progress: 'प्रगति',
    
    // Kanban Board
    sprintBoard: 'स्प्रिंट बोर्ड',
    dragDrop: 'कार्यों को खींचें और छोड़ें',
    newTask: 'नया कार्य',
    allTasks: 'सभी कार्य',
    analytics: 'विश्लेषण',
    comingSoon: 'जल्द आ रहा है...',
    
    // Task Form
    createTask: 'नया कार्य बनाएं',
    editTask: 'कार्य संपादित करें',
    taskTitle: 'कार्य शीर्षक',
    enterTitle: 'कार्य शीर्षक दर्ज करें',
    description: 'विवरण',
    enterDescription: 'कार्य विवरण दर्ज करें',
    priority: 'प्राथमिकता',
    lowPriority: 'कम प्राथमिकता',
    mediumPriority: 'मध्यम प्राथमिकता',
    highPriority: 'उच्च प्राथमिकता',
    selectDepartment: 'विभाग चुनें',
    dueDate: 'नियत तारीख',
    assignTo: 'सौंपें',
    unassigned: 'असाइन नहीं',
    createTaskBtn: 'कार्य बनाएं',
    updateTask: 'कार्य अपडेट करें',
    cancel: 'रद्द करें',
    
    // Login
    welcomeBack: 'वापसी पर स्वागत है',
    signInContinue: 'जारी रखने के लिए साइन इन करें',
    password: 'पासवर्ड',
    otp: 'ओटीपी',
    emailAddress: 'ईमेल पता',
    enterEmail: 'अपना @ssism.org ईमेल दर्ज करें',
    enterPassword: 'अपना पासवर्ड दर्ज करें',
    signIn: 'साइन इन करें',
    sendOTP: 'ओटीपी भेजें',
    enterOTP: 'ओटीपी दर्ज करें',
    verifyOTP: 'ओटीपी सत्यापित करें',
    resendOTP: 'ओटीपी पुनः भेजें',
    otpSent: 'ओटीपी भेजा गया',
    
    // Register
    registerUser: 'नया उपयोगकर्ता रजिस्टर करें',
    createAccount: 'नया खाता बनाएं',
    fullName: 'पूरा नाम',
    enterName: 'नाम दर्ज करें',
    enterEmailReg: '@ssism.org ईमेल दर्ज करें',
    phoneSignal: 'फोन (सिग्नल)',
    minCharacters: 'न्यूनतम 6 अक्षर',
    role: 'भूमिका',
    user: 'उपयोगकर्ता',
    addCustom: 'कस्टम जोड़ें',
    enterCustomDept: 'कस्टम विभाग दर्ज करें',
    back: 'वापस',
    
    // Modals
    deleteTask: 'कार्य हटाएं?',
    deleteConfirm: 'क्या आप वाकई इस कार्य को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।',
    delete: 'हटाएं',
    logoutConfirm: 'क्या आप वाकई लॉगआउट करना चाहते हैं?',
    updateProfile: 'प्रोफाइल अपडेट करें',
    name: 'नाम',
    email: 'ईमेल',
    newPassword: 'नया पासवर्ड (वैकल्पिक)',
    leaveBlank: 'वर्तमान रखने के लिए खाली छोड़ें',
    update: 'अपडेट करें',
    
    // Messages
    loading: 'लोड हो रहा है...',
    loadingDashboard: 'डैशबोर्ड लोड हो रहा है...',
    noTasks: 'कोई कार्य नहीं',
    onlySSISM: 'केवल @ssism.org ईमेल पते की अनुमति है',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'hi' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const t = (key) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
