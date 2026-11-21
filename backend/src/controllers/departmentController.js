const mongoose = require('mongoose');
const Department = require('../models/Department');
const User = require('../models/User');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const { demoUsers } = require('../utils/mockStore');

// Helper to validate 10-digit mobile number with or without +91
const validateAndFormatPhone = (phoneNumber) => {
  if (!phoneNumber || !String(phoneNumber).trim()) {
    return { isValid: false, message: 'Department mobile number is required' };
  }
  const cleanPhone = String(phoneNumber).replace(/[\s-]/g, '');
  let digits = cleanPhone;
  if (digits.startsWith('+91')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  }

  if (!/^\d{10}$/.test(digits)) {
    return {
      isValid: false,
      message: 'Mobile number must be exactly 10 digits (e.g. +91 9876543210 or 9876543210)'
    };
  }

  return {
    isValid: true,
    formatted: `+91 ${digits}`
  };
};

// Helper to auto-seed existing department strings if Department collection is empty
const autoSeedDepartments = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const count = await Department.countDocuments();
    if (count === 0) {
      const userDepts = await User.distinct('department', { department: { $ne: null, $ne: '' } });
      const taskDepts = await Task.distinct('department', { department: { $ne: null, $ne: '' } });
      const allDeptNames = Array.from(new Set([...userDepts, ...taskDepts])).filter(Boolean);

      for (const deptName of allDeptNames) {
        const cleanName = deptName.trim();
        if (!cleanName) continue;

        // Generate a simple unique code
        let baseCode = cleanName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'DEPT';
        let code = baseCode;
        let counter = 1;
        while (await Department.findOne({ code })) {
          code = `${baseCode}${counter++}`;
        }

        // Find if there is an existing HOD for this department
        const hodUser = await User.findOne({ role: 'hod', department: cleanName });

        await Department.create({
          name: cleanName,
          code: code,
          description: `${cleanName} Department`,
          status: 'active',
          hod: hodUser ? hodUser._id : null
        });
      }
    }
  } catch (err) {
    console.error('Error auto-seeding departments:', err);
  }
};

// 1. Get All Departments (Simple array of name strings for dropdowns, Register, Sidebar, Kanban)
exports.getAllDepartments = async (req, res) => {
  try {
    // If query parameters or admin management view requested, delegate to full getAdminDepartments
    if (req.query.search !== undefined || req.query.page !== undefined || req.query.limit !== undefined || (req.query.status && req.query.status !== 'active')) {
      return exports.getAdminDepartments(req, res);
    }

    if (mongoose.connection.readyState === 1) {
      await autoSeedDepartments();
      const depts = await Department.find({ status: 'active' }).select('name code hod hodId').populate('hod', 'name email').sort({ name: 1 });
      if (depts.length > 0) {
        if (req.query.simple === 'true') {
          return res.json(depts.map(d => d.name));
        }
        return res.json(depts);
      }
      // Fallback to User distinct
      const departments = await User.distinct('department', { department: { $ne: null, $ne: '' } });
      return res.json(departments.sort());
    } else {
      const mockDepts = Array.from(new Set(demoUsers.map(u => u.department).filter(Boolean)));
      return res.json(mockDepts.sort());
    }
  } catch (error) {
    console.error('getAllDepartments error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 1b. Get Admin Department Details (Full metrics table for DepartmentManagement page)
exports.getAdminDepartments = async (req, res) => {
  try {
    await autoSeedDepartments();

    const { status, search, page, limit } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status.toLowerCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } }
      ];
    }

    const total = await Department.countDocuments(query);
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0; // 0 means return all
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

    let deptQuery = Department.find(query)
      .populate('hod', 'name email role status phoneNumber')
      .populate('hodId', 'name email role status phoneNumber')
      .sort({ createdAt: -1, name: 1 });

    if (limitNum > 0) {
      deptQuery = deptQuery.skip(skip).limit(limitNum);
    }

    const departments = await deptQuery;
    const now = new Date();

    const enrichedDepartments = await Promise.all(
      departments.map(async (dept) => {
        const deptObj = dept.toObject();
        const deptIdentifier = [dept.name, dept.code];

        const facultyList = await User.find({
          role: { $in: ['user', 'faculty'] },
          $or: [
            { departmentId: dept._id },
            { department: { $in: deptIdentifier } }
          ]
        }).select('_id name email status');

        const totalFaculty = facultyList.length;
        const activeFaculty = facultyList.filter(f => (f.status || 'active') === 'active').length;

        const tasks = await Task.find({
          department: { $in: deptIdentifier }
        });

        let totalTasks = tasks.length;
        let todo = 0;
        let inprogress = 0;
        let completed = 0;
        let overdue = 0;

        tasks.forEach(t => {
          if (t.status === 'todo') todo++;
          else if (t.status === 'inprogress') inprogress++;
          else if (t.status === 'completed') completed++;

          if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed') {
            overdue++;
          }
        });

        const pending = todo + inprogress;
        const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

        return {
          ...deptObj,
          hod: deptObj.hod || deptObj.hodId || null,
          hodId: deptObj.hodId || deptObj.hod || null,
          totalFaculty,
          facultyCount: totalFaculty,
          activeFaculty,
          inactiveFaculty: totalFaculty - activeFaculty,
          totalTasks,
          todoTasks: todo,
          inprogressTasks: inprogress,
          completedTasks: completed,
          pendingTasks: pending,
          overdueTasks: overdue,
          completionRate
        };
      })
    );

    // If paginated response is requested with page/limit, attach metadata
    if (limitNum > 0) {
      return res.json({
        departments: enrichedDepartments,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    }

    res.json(enrichedDepartments);
  } catch (error) {
    console.error('getAdminDepartments error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 2. Create Department
exports.createDepartment = async (req, res) => {
  try {
    // Only ADMIN can create departments
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Only administrators can create departments.' });
    }

    const { name, code, description, phoneNumber, status } = req.body;
    const targetHodId = req.body.hodId || req.body.hod;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Department code is required' });
    }

    // HOD selection is MANDATORY for active departments
    if (!targetHodId) {
      return res.status(400).json({ message: 'HOD selection is mandatory. Every active department must have exactly one active HOD assigned.' });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    // 10-digit mobile number validation (if provided)
    let formattedPhone = '';
    if (phoneNumber && String(phoneNumber).replace(/[\s-]/g, '') !== '+91' && String(phoneNumber).trim() !== '') {
      const phoneCheck = validateAndFormatPhone(phoneNumber);
      if (!phoneCheck.isValid) {
        return res.status(400).json({ message: phoneCheck.message });
      }
      formattedPhone = phoneCheck.formatted;
    }

    if (mongoose.connection.readyState === 1) {
      // 1. Check duplicate department name (case-insensitive)
      const existingName = await Department.findOne({ name: { $regex: `^${cleanName}$`, $options: 'i' } });
      if (existingName) {
        return res.status(400).json({ message: 'A department with this name already exists' });
      }

      // 2. Check duplicate department code
      const existingCode = await Department.findOne({ code: cleanCode });
      if (existingCode) {
        return res.status(400).json({ message: 'A department with this code already exists' });
      }

      // 3. Validate selected HOD
      const hodUser = await User.findById(targetHodId);
      if (!hodUser) {
        return res.status(404).json({ message: 'Selected HOD user does not exist' });
      }

      // HOD's role must be 'hod'
      if (hodUser.role !== 'hod') {
        return res.status(400).json({ message: 'Selected user must have the HOD role. Faculty members cannot be appointed as HOD.' });
      }

      // HOD must have an active account
      if ((hodUser.status || 'active') !== 'active') {
        return res.status(400).json({ message: 'Selected HOD account is inactive. Only active HODs can be assigned.' });
      }

      // One HOD can manage only ONE active department
      const existingActiveDept = await Department.findOne({
        status: 'active',
        $or: [{ hod: hodUser._id }, { hodId: hodUser._id }]
      });
      if (existingActiveDept) {
        return res.status(400).json({
          message: `This HOD is already assigned to the active "${existingActiveDept.name}" department. One HOD can manage only one active department.`
        });
      }

      // 4. Create Department
      const department = await Department.create({
        name: cleanName,
        code: cleanCode,
        description: description ? description.trim() : '',
        phoneNumber: formattedPhone,
        status: status || 'active',
        hodId: hodUser._id,
        hod: hodUser._id,
        createdBy: req.user._id
      });

      // 5. Assign the new departmentId to the selected HOD
      hodUser.departmentId = department._id;
      hodUser.department = department.name;
      await hodUser.save();

      // Log Activity
      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'DEPARTMENT_CREATED',
        department: department._id,
        departmentName: department.name,
        details: { name: department.name, code: department.code, hodId: hodUser._id, hodName: hodUser.name }
      });

      // Broadcast socket event for real-time synchronization
      const io = req.app.get('io');
      if (io) {
        io.emit('department-updated', { action: 'created', department });
      }

      await department.populate('hod', 'name email role phoneNumber status');

      return res.status(201).json({
        message: `Department "${department.name}" created successfully with HOD ${hodUser.name}`,
        department
      });
    } else {
      // Offline mock fallback
      const mockDept = {
        _id: 'mock_dept_' + Date.now(),
        name: cleanName,
        code: cleanCode,
        description: description ? description.trim() : '',
        phoneNumber: formattedPhone,
        status: status || 'active',
        hodId: targetHodId,
        hod: targetHodId
      };

      const io = req.app.get('io');
      if (io) {
        io.emit('department-updated', { action: 'created', department: mockDept });
      }

      return res.status(201).json({
        message: `Department "${cleanName}" created successfully`,
        department: mockDept
      });
    }
  } catch (error) {
    console.error('createDepartment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 3. Get Department By ID
exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id).populate('hod', 'name email role phoneNumber');

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const deptIdentifier = [department.name, department.code];
    const now = new Date();

    // Faculty details with task counts
    const facultyMembers = await User.find({
      role: 'user',
      department: { $in: deptIdentifier }
    }).select('-password');

    const facultyWithMetrics = await Promise.all(
      facultyMembers.map(async (faculty) => {
        const tasks = await Task.find({ assignedTo: faculty._id });
        let total = tasks.length;
        let completed = 0;
        let pending = 0;
        let overdue = 0;

        tasks.forEach(t => {
          if (t.status === 'completed') completed++;
          else pending++;

          if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed') {
            overdue++;
          }
        });

        return {
          ...faculty.toObject(),
          totalTasks: total,
          completedTasks: completed,
          pendingTasks: pending,
          overdueTasks: overdue
        };
      })
    );

    // Department Task Statistics
    const deptTasks = await Task.find({ department: { $in: deptIdentifier } });
    let totalTasks = deptTasks.length;
    let todo = 0;
    let inprogress = 0;
    let completed = 0;
    let overdue = 0;
    let highPriority = 0;
    let mediumPriority = 0;
    let lowPriority = 0;

    deptTasks.forEach(t => {
      if (t.status === 'todo') todo++;
      else if (t.status === 'inprogress') inprogress++;
      else if (t.status === 'completed') completed++;

      if (t.priority === 'high') highPriority++;
      else if (t.priority === 'medium') mediumPriority++;
      else if (t.priority === 'low') lowPriority++;

      if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed') {
        overdue++;
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    res.json({
      department,
      faculty: facultyWithMetrics,
      stats: {
        totalTasks,
        todo,
        inprogress,
        completed,
        pending: todo + inprogress,
        overdue,
        highPriority,
        mediumPriority,
        lowPriority,
        completionRate,
        totalFaculty: facultyMembers.length
      }
    });
  } catch (error) {
    console.error('getDepartmentById error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 4. Update Department
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, phoneNumber, status } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const oldName = department.name;
    const oldCode = department.code;

    if (name && name.trim() !== oldName) {
      const cleanName = name.trim();
      const existingName = await Department.findOne({ _id: { $ne: id }, name: { $regex: `^${cleanName}$`, $options: 'i' } });
      if (existingName) {
        return res.status(400).json({ message: 'Another department with this name already exists' });
      }
      department.name = cleanName;
    }

    if (code && code.trim().toUpperCase() !== oldCode) {
      const cleanCode = code.trim().toUpperCase();
      const existingCode = await Department.findOne({ _id: { $ne: id }, code: cleanCode });
      if (existingCode) {
        return res.status(400).json({ message: 'Another department with this code already exists' });
      }
      department.code = cleanCode;
    }

    if (phoneNumber !== undefined) {
      const phoneCheck = validateAndFormatPhone(phoneNumber);
      if (!phoneCheck.isValid) {
        return res.status(400).json({ message: phoneCheck.message });
      }
      department.phoneNumber = phoneCheck.formatted;
    }

    if (description !== undefined) {
      department.description = description.trim();
    }

    if (status && ['active', 'inactive'].includes(status)) {
      department.status = status;
    }

    await department.save();

    // If department name or code changed, sync associated Users & Tasks to preserve references
    if (department.name !== oldName) {
      await User.updateMany({ department: oldName }, { department: department.name });
      await Task.updateMany({ department: oldName }, { department: department.name });
    }

    // Log Activity
    await ActivityLog.create({
      performedBy: req.user._id,
      action: 'DEPARTMENT_UPDATED',
      department: department._id,
      departmentName: department.name,
      details: { oldName, newName: department.name, oldCode, newCode: department.code, phoneNumber: department.phoneNumber }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('department-updated', { action: 'updated', department });
    }

    res.json(department);
  } catch (error) {
    console.error('updateDepartment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 5. Toggle Department Status (Activate / Deactivate)
exports.toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active or inactive' });
    }

    const cleanStatus = status.toLowerCase();
    const department = await Department.findById(id).populate('hod', 'name email role status');
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Validation before status change
    if (cleanStatus === 'active') {
      // Must not leave an active department without an eligible active HOD
      const assignedHod = department.hod;
      if (!assignedHod) {
        return res.status(400).json({
          message: 'Cannot activate department without an assigned HOD. Every active department must have exactly one active HOD assigned.'
        });
      }

      if (assignedHod.status !== 'active') {
        return res.status(400).json({
          message: `Cannot activate department because assigned HOD (${assignedHod.name}) is inactive. Please assign an active HOD first.`
        });
      }

      // Check if this HOD is already managing another active department
      const otherActiveDept = await Department.findOne({
        _id: { $ne: department._id },
        status: 'active',
        $or: [{ hod: assignedHod._id }, { hodId: assignedHod._id }]
      });
      if (otherActiveDept) {
        return res.status(400).json({
          message: `Cannot activate department: HOD ${assignedHod.name} is already managing active department "${otherActiveDept.name}". Please assign a different eligible HOD.`
        });
      }
    } else {
      // Deactivating department: Validate active users and pending records to ensure safety
      const activeFacultyCount = await User.countDocuments({
        role: { $in: ['user', 'faculty'] },
        status: 'active',
        $or: [{ departmentId: department._id }, { department: department.name }]
      });

      const pendingTasksCount = await Task.countDocuments({
        department: department.name,
        status: { $ne: 'completed' }
      });

      if (activeFacultyCount > 0 || pendingTasksCount > 0) {
        console.log(`Notice: Department "${department.name}" deactivated with ${activeFacultyCount} active faculty and ${pendingTasksCount} pending tasks. Records preserved.`);
      }
    }

    department.status = cleanStatus;
    await department.save();

    const action = cleanStatus === 'active' ? 'DEPARTMENT_ACTIVATED' : 'DEPARTMENT_DEACTIVATED';

    await ActivityLog.create({
      performedBy: req.user._id,
      action,
      department: department._id,
      departmentName: department.name,
      details: { status: cleanStatus }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('department-updated', { action: 'status_changed', department });
    }

    res.json({
      message: `Department ${cleanStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      department
    });
  } catch (error) {
    console.error('toggleDepartmentStatus error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 6. Assign HOD to Department
exports.assignHOD = async (req, res) => {
  return exports.changeHOD(req, res);
};

// 7. Change HOD of Department
exports.changeHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const newHodId = req.body.newHodId || req.body.hodId;

    if (!newHodId) {
      return res.status(400).json({ message: 'New HOD User ID is required' });
    }

    if (mongoose.connection.readyState === 1) {
      const department = await Department.findById(id).populate('hod', 'name email role status departmentId');
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      const newHodUser = await User.findById(newHodId);
      if (!newHodUser) {
        return res.status(404).json({ message: 'Selected HOD user does not exist' });
      }

      // 1. Role must be HOD
      if (newHodUser.role !== 'hod') {
        return res.status(400).json({ message: 'Selected user must have role HOD. Faculty members cannot be appointed as HOD.' });
      }

      // 2. Status must be active
      if ((newHodUser.status || 'active') !== 'active') {
        return res.status(400).json({ message: 'Selected HOD account is inactive. Only active HODs can be assigned.' });
      }

      // 3. New HOD must not already be assigned to another active department
      const existingDept = await Department.findOne({
        _id: { $ne: department._id },
        status: 'active',
        $or: [{ hod: newHodUser._id }, { hodId: newHodUser._id }]
      });
      if (existingDept) {
        return res.status(400).json({
          message: `This HOD is already managing the active "${existingDept.name}" department. One HOD can manage only one active department.`
        });
      }

      const previousHod = department.hod;

      // 4. Update Department HOD link
      department.hodId = newHodUser._id;
      department.hod = newHodUser._id;
      await department.save();

      // 5. Update New HOD's departmentId and department name
      newHodUser.departmentId = department._id;
      newHodUser.department = department.name;
      await newHodUser.save();

      // 6. Handle previous HOD consistently without converting to FACULTY
      if (previousHod && String(previousHod._id) !== String(newHodUser._id)) {
        const otherDeptsAsHod = await Department.findOne({
          _id: { $ne: department._id },
          status: 'active',
          $or: [{ hod: previousHod._id }, { hodId: previousHod._id }]
        });
        if (!otherDeptsAsHod) {
          // Keep role as 'hod'! Only clear departmentId
          await User.findByIdAndUpdate(previousHod._id, {
            departmentId: null,
            department: 'Unassigned'
          });
        }
      }

      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'HOD_CHANGED',
        department: department._id,
        departmentName: department.name,
        details: {
          previousHod: previousHod ? { _id: previousHod._id, name: previousHod.name, email: previousHod.email } : null,
          newHod: { _id: newHodUser._id, name: newHodUser.name, email: newHodUser.email }
        }
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('department-updated', { action: 'hod_changed', department });
      }

      await department.populate('hod', 'name email role phoneNumber status');

      return res.json({
        message: `HOD changed to ${newHodUser.name} successfully`,
        previousHod: previousHod ? { _id: previousHod._id, name: previousHod.name, email: previousHod.email } : null,
        newHod: { _id: newHodUser._id, name: newHodUser.name, email: newHodUser.email },
        department
      });
    } else {
      const user = demoUsers.find(u => u._id === newHodId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json({ message: 'HOD changed successfully' });
    }
  } catch (error) {
    console.error('changeHOD error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 8. Get Department Faculty
exports.getDepartmentFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const deptIdentifier = [department.name, department.code];
    const faculty = await User.find({
      role: 'user',
      department: { $in: deptIdentifier }
    }).select('-password');

    const now = new Date();

    const facultyMetrics = await Promise.all(
      faculty.map(async (fac) => {
        const tasks = await Task.find({ assignedTo: fac._id });
        let totalTasks = tasks.length;
        let completedTasks = 0;
        let pendingTasks = 0;
        let overdueTasks = 0;

        tasks.forEach(t => {
          if (t.status === 'completed') completedTasks++;
          else pendingTasks++;

          if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed') {
            overdueTasks++;
          }
        });

        return {
          ...fac.toObject(),
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks
        };
      })
    );

    res.json(facultyMetrics);
  } catch (error) {
    console.error('getDepartmentFaculty error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 9. Get Department Task Statistics
exports.getDepartmentTaskStats = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const deptIdentifier = [department.name, department.code];
    const tasks = await Task.find({ department: { $in: deptIdentifier } });
    const now = new Date();

    let total = tasks.length;
    let todo = 0;
    let inprogress = 0;
    let completed = 0;
    let overdue = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    tasks.forEach(t => {
      if (t.status === 'todo') todo++;
      else if (t.status === 'inprogress') inprogress++;
      else if (t.status === 'completed') completed++;

      if (t.priority === 'high') high++;
      else if (t.priority === 'medium') medium++;
      else if (t.priority === 'low') low++;

      if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed') {
        overdue++;
      }
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      departmentName: department.name,
      totalTasks: total,
      todo,
      inprogress,
      completed,
      pending: todo + inprogress,
      overdue,
      highPriority: high,
      mediumPriority: medium,
      lowPriority: low,
      completionRate
    });
  } catch (error) {
    console.error('getDepartmentTaskStats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 10. View All HODs Across Organization
exports.getAllHODs = async (req, res) => {
  try {
    const { search, department, status } = req.query;

    let userQuery = { role: 'hod' };

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (department && department !== 'all') {
      userQuery.department = department;
    }

    const hods = await User.find(userQuery).select('-password');
    const now = new Date();

    const hodList = await Promise.all(
      hods.map(async (hod) => {
        const hodObj = hod.toObject();
        const deptName = hod.department || 'Unassigned';

        // Find department record if any
        const deptRecord = await Department.findOne({
          $or: [{ name: deptName }, { hod: hod._id }]
        });

        // Filter status if requested
        if (status && status !== 'all') {
          const currentStatus = deptRecord ? deptRecord.status : 'active';
          if (currentStatus !== status) return null;
        }

        // Count faculty in this department
        const facultyCount = await User.countDocuments({
          role: 'user',
          department: deptName
        });

        // Tasks in department or created by HOD
        const tasks = await Task.find({
          $or: [
            { department: deptName },
            { createdBy: hod._id }
          ]
        });

        let totalTasks = tasks.length;
        let completedTasks = 0;
        let pendingTasks = 0;
        let overdueTasks = 0;

        tasks.forEach(t => {
          if (t.status === 'completed') completedTasks++;
          else pendingTasks++;

          if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed') {
            overdueTasks++;
          }
        });

        return {
          ...hodObj,
          departmentName: deptRecord ? deptRecord.name : deptName,
          departmentStatus: deptRecord ? deptRecord.status : 'active',
          departmentId: deptRecord ? deptRecord._id : null,
          facultyCount,
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks
        };
      })
    );

    res.json(hodList.filter(Boolean));
  } catch (error) {
    console.error('getAllHODs error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 11. Get Department Activity Logs
exports.getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('performedBy', 'name email role')
      .populate('department', 'name code')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(logs);
  } catch (error) {
    console.error('getActivityLogs error:', error);
    res.status(500).json({ message: error.message });
  }
};
