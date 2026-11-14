import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

const translations = {
  en: {
    // Navbar
    register: 'Register Faculty',
    settings: 'Account Settings',
    logout: 'Secure Sign Out',
    admin: 'System Administrator',
    department: 'Academic Department',
    
    // Dashboard
    adminDashboard: 'Institutional Executive Dashboard',
    overviewDepartments: 'Cross-departmental operations, deliverable tracking & faculty performance overview',
    overallProgress: 'Overall Institutional Completion Rate',
    totalTasks: 'Total Academic Deliverables',
    todo: 'Pending / Queue',
    inProgress: 'Active Execution',
    completed: 'Completed & Verified',
    departmentPerformance: 'Departmental Progress & Deliverables',
    departments: 'Academic Departments',
    total: 'Total Assigned',
    progress: 'Completion Progress',
    
    // Kanban Board
    sprintBoard: 'Academic Task Board',
    dragDrop: 'Drag and drop cards across columns to advance workflow stages, or click edit for complete task records',
    newTask: 'New Academic Task',
    allTasks: 'All Institutional Deliverables',
    analytics: 'Departmental Analytics',
    comingSoon: 'Feature currently under scheduled development...',
    
    // Task Form
    createTask: 'Create & Assign Academic Task',
    editTask: 'Edit Institutional Task Details',
    taskTitle: 'Task Designation / Title',
    enterTitle: 'Enter a concise, descriptive title (e.g. NAAC Criteria 3 Documentation)',
    description: 'Detailed Objectives, Guidelines & Deliverables',
    enterDescription: 'Specify task parameters, deliverable standards, reference links, and expectations...',
    priority: 'Urgency & Institutional Priority',
    lowPriority: 'Routine Operational (Low)',
    mediumPriority: 'Standard Academic (Medium)',
    highPriority: 'High Institutional Urgency (High)',
    criticalPriority: 'Statutory / Accreditation Deadline (Critical)',
    selectDepartment: 'Select Academic Department',
    dueDate: 'Deliverable Deadline (Target Date)',
    assignTo: 'Assignee Faculty Member',
    unassigned: 'Unassigned / Open Pool',
    createTaskBtn: 'Create & Assign Task',
    updateTask: 'Save Task Changes',
    cancel: 'Cancel & Dismiss',
    
    // Login
    welcomeBack: 'Welcome to SSES Institutional Portal',
    signInContinue: 'Sign in with your official academic credentials to continue',
    password: 'Account Password',
    otp: 'One-Time Security Passcode (OTP)',
    emailAddress: 'Official Institutional Email',
    enterEmail: 'Enter your registered @ssism.org email',
    enterPassword: 'Enter your institutional account password',
    signIn: 'Authorize & Sign In',
    sendOTP: 'Generate & Send One-Time Passcode',
    enterOTP: 'Enter 6-Digit Passcode',
    verifyOTP: 'Verify Passcode & Access Portal',
    resendOTP: 'Request New Passcode',
    otpSent: 'Verification passcode dispatched to',
    
    // Register
    registerUser: 'Register Academic Faculty / Staff',
    createAccount: 'Establish a new institutional user profile',
    fullName: 'Official Full Name',
    enterName: 'Enter formal name with title (e.g. Dr. Ramesh Sharma)',
    enterEmailReg: 'Official @ssism.org institutional email',
    phoneSignal: 'Mobile Contact Number (Signal / WhatsApp)',
    minCharacters: 'Minimum 8 alphanumeric characters required',
    role: 'Institutional Role & Access Level',
    user: 'Academic Faculty Member',
    addCustom: '+ Add New Department',
    enterCustomDept: 'Enter official department designation',
    back: 'Return to Directory',
    
    // Modals
    deleteTask: 'Confirm Deliverable Deletion',
    deleteConfirm: 'Are you sure you want to permanently delete this academic deliverable? This operational record cannot be recovered.',
    delete: 'Permanently Delete',
    logoutConfirm: 'Are you sure you wish to terminate your current institutional session?',
    updateProfile: 'Update Academic Profile Details',
    name: 'Official Full Name',
    email: 'Registered Institutional Email',
    newPassword: 'Update Password (optional)',
    leaveBlank: 'Leave blank to preserve current credentials',
    update: 'Save Profile Updates',
    
    // Messages & Tooltips
    loading: 'Processing institutional request...',
    loadingDashboard: 'Compiling departmental metrics and faculty presence data...',
    noTasks: 'No deliverables currently scheduled in this stage.',
    onlySSISM: 'Institutional Security Protocol: Only authorized @ssism.org domain addresses are permitted.',
  },
  hi: {
    // Navbar
    register: 'संकाय सदस्य पंजीकृत करें',
    settings: 'खाता सेटिंग्स',
    logout: 'सुरक्षित साइन आउट',
    admin: 'सिस्टम प्रशासक',
    department: 'शैक्षणिक विभाग',
    
    // Dashboard
    adminDashboard: 'संस्थान प्रशासनिक डैशबोर्ड',
    overviewDepartments: 'समस्त शैक्षणिक विभागों की प्रगति, संकाय उपस्थिति एवं निष्पादन का विस्तृत विवरण',
    overallProgress: 'समग्र संस्थानिक कार्य पूर्णता दर',
    totalTasks: 'कुल शैक्षणिक दायित्व',
    todo: 'प्रलंबित / नियत कार्य',
    inProgress: 'प्रगतिरत / संपादन अधीन',
    completed: 'सफलतापूर्वक पूर्ण एवं सत्यापित',
    departmentPerformance: 'विभागीय कार्य निष्पादन एवं प्रगति',
    departments: 'शैक्षणिक विभाग',
    total: 'कुल दायित्व',
    progress: 'कार्य पूर्णता प्रगति',
    
    // Kanban Board
    sprintBoard: 'शैक्षणिक कार्य एवं दायित्व बोर्ड',
    dragDrop: 'कार्यों की प्रगति अद्यतन करने हेतु कार्ड्स को आगे बढ़ाएं, अथवा पूर्ण विवरण हेतु संपादित करें',
    newTask: 'नवीन शैक्षणिक कार्य',
    allTasks: 'समस्त संस्थानिक दायित्व',
    analytics: 'विभागीय विश्लेषण एवं सांख्यिकी',
    comingSoon: 'यह सुविधा वर्तमान में विकासाधीन है...',
    
    // Task Form
    createTask: 'नवीन शैक्षणिक कार्य आवंटित करें',
    editTask: 'कार्य विवरण एवं निर्देश संपादित करें',
    taskTitle: 'कार्य का शीर्षक एवं विषय',
    enterTitle: 'स्पष्ट एवं वर्णनात्मक शीर्षक दर्ज करें (उदा. नैक मापदंड ३ दस्तावेज)',
    description: 'विस्तृत उद्देश्य, दिशा-निर्देश एवं संदर्भ सामग्री',
    enterDescription: 'कार्य की अपेक्षाएं, संदर्भ मानक एवं दिशा-निर्देश दर्ज करें...',
    priority: 'प्राथमिकता एवं गंभीरता स्तर',
    lowPriority: 'नियमित संस्थानिक कार्य (Low)',
    mediumPriority: 'मानक शैक्षणिक दायित्व (Medium)',
    highPriority: 'उच्च प्राथमिकता (High)',
    criticalPriority: 'वैधानिक / प्रत्यायन अनिवार्यता (Critical)',
    selectDepartment: 'संबद्ध शैक्षणिक विभाग का चयन करें',
    dueDate: 'अंतिम पूर्णता तिथि (डेडलाइन)',
    assignTo: 'दायित्व संकाय सदस्य को सौंपें',
    unassigned: 'अनावंटित / आवंटन प्रतीक्षित',
    createTaskBtn: 'कार्य बनाएं एवं आवंटित करें',
    updateTask: 'परिवर्तन सुरक्षित करें',
    cancel: 'रद्द करें / वापस',
    
    // Login
    welcomeBack: 'संत सिंगाजी शैक्षणिक संस्थान पोर्टल में आपका स्वागत है',
    signInContinue: 'जारी रखने हेतु अपने अधिकृत संस्थानिक क्रेडेंशियल्स से साइन इन करें',
    password: 'गोपनीय पासवर्ड',
    otp: 'एकमुश्त सुरक्षा कोड (OTP)',
    emailAddress: 'आधिकारिक संस्थानिक ईमेल पता',
    enterEmail: 'अपना पंजीकृत @ssism.org ईमेल दर्ज करें',
    enterPassword: 'अपना खाता पासवर्ड दर्ज करें',
    signIn: 'सुरक्षित प्रवेश (साइन इन)',
    sendOTP: 'एकमुश्त सत्यापन कोड (OTP) भेजें',
    enterOTP: '६-अंकीय सत्यापन कोड दर्ज करें',
    verifyOTP: 'सत्यापित कर पोर्टल खोलें',
    resendOTP: 'सत्यापन कोड पुनः भेजें',
    otpSent: 'सत्यापन कोड इस पते पर प्रेषित किया गया:',
    
    // Register
    registerUser: 'नवीन संकाय / कर्मचारी पंजीकृत करें',
    createAccount: 'नवीन संस्थानिक खाता स्थापित करें',
    fullName: 'पूर्ण नाम (पदनाम सहित)',
    enterName: 'उदा. डॉ. रमेश शर्मा / प्रो. सुनीता पटेल',
    enterEmailReg: 'आधिकारिक @ssism.org ईमेल',
    phoneSignal: 'मोबाइल संपर्क नंबर (Signal / WhatsApp)',
    minCharacters: 'न्यूनतम ८ अल्फ़ान्यूमेरिक वर्ण आवश्यक',
    role: 'संस्थानिक भूमिका एवं अधिकार',
    user: 'संकाय सदस्य (Academic Faculty)',
    addCustom: '+ नवीन विभाग जोड़ें',
    enterCustomDept: 'विभाग का औपचारिक नाम दर्ज करें',
    back: 'निर्देशिका पर वापस लौटें',
    
    // Modals
    deleteTask: 'कार्य हटाने की पुष्टि',
    deleteConfirm: 'क्या आप वाकई इस शैक्षणिक दायित्व को स्थायी रूप से हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं होगी।',
    delete: 'स्थायी रूप से हटाएं',
    logoutConfirm: 'क्या आप वर्तमान संस्थानिक सत्र से सुरक्षित रूप से लॉगआउट करना चाहते हैं?',
    updateProfile: 'संकाय प्रोफाइल अद्यतन करें',
    name: 'पूर्ण नाम',
    email: 'पंजीकृत ईमेल पता',
    newPassword: 'नवीन पासवर्ड (वैकल्पिक)',
    leaveBlank: 'वर्तमान पासवर्ड बनाए रखने हेतु रिक्त छोड़ें',
    update: 'जानकारी सुरक्षित करें',
    
    // Messages & Tooltips
    loading: 'संस्थानिक डेटा संसाधित हो रहा है...',
    loadingDashboard: 'विभागीय आंकड़े एवं संकाय उपस्थिति विश्लेषित हो रही है...',
    noTasks: 'इस चरण में वर्तमान में कोई कार्य नियत नहीं है।',
    onlySSISM: 'संस्थानिक सुरक्षा प्रोटोकॉल: केवल अधिकृत @ssism.org ईमेल पते मान्य हैं।',
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
