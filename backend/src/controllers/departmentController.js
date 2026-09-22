const Department = require('../models/Department');
const User = require('../models/User');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');

// Helper to auto-seed existing department strings if Department collection is empty
const autoSeedDepartments = async () => {
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
    await autoSeedDepartments();
    const depts = await Department.find({ status: 'active' }).select('name').sort({ name: 1 });
    if (depts.length > 0) {
      return res.json(depts.map(d => d.name));
    }
    // Fallback to User distinct
    const departments = await User.distinct('department', { department: { $ne: null, $ne: '' } });
    res.json(departments.sort());
  } catch (error) {
    console.error('getAllDepartments error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 1b. Get Admin Department Details (Full metrics table for DepartmentManagement page)
exports.getAdminDepartments = async (req, res) => {
  try {
    await autoSeedDepartments();

    const { status, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const departments = await Department.find(query)
      .populate('hod', 'name email role status phoneNumber')
      .sort({ name: 1 });

    const now = new Date();

    const enrichedDepartments = await Promise.all(
      departments.map(async (dept) => {
        const deptObj = dept.toObject();
        const deptIdentifier = [dept.name, dept.code];

        const facultyList = await User.find({
          role: 'user',
          department: { $in: deptIdentifier }
        }).select('_id');

        const totalFaculty = facultyList.length;

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
          totalFaculty,
          activeFaculty: totalFaculty,
          inactiveFaculty: 0,
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

    res.json(enrichedDepartments);
  } catch (error) {
    console.error('getAdminDepartments error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 2. Create Department
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const cleanName = name.trim();
    const cleanCode = code ? code.trim().toUpperCase() : cleanName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();

    // Check duplicates
    const existingName = await Department.findOne({ name: { $regex: `^${cleanName}$`, $options: 'i' } });
    if (existingName) {
      return res.status(400).json({ message: 'A department with this name already exists' });
    }

    const existingCode = await Department.findOne({ code: cleanCode });
    if (existingCode) {
      return res.status(400).json({ message: 'A department with this code already exists' });
    }

    const department = await Department.create({
      name: cleanName,
      code: cleanCode,
      description: description ? description.trim() : '',
      status: status || 'active'
    });

    // Log Activity
    await ActivityLog.create({
      performedBy: req.user._id,
      action: 'DEPARTMENT_CREATED',
      department: department._id,
      departmentName: department.name,
      details: { name: department.name, code: department.code, description: department.description }
    });

    res.status(201).json(department);
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
    const { name, code, description, status } = req.body;

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
      details: { oldName, newName: department.name, oldCode, newCode: department.code }
    });

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

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active or inactive' });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    department.status = status;
    await department.save();

    const action = status === 'active' ? 'DEPARTMENT_ACTIVATED' : 'DEPARTMENT_DEACTIVATED';

    await ActivityLog.create({
      performedBy: req.user._id,
      action,
      department: department._id,
      departmentName: department.name,
      details: { status }
    });

    res.json({ message: `Department ${status === 'active' ? 'activated' : 'deactivated'} successfully`, department });
  } catch (error) {
    console.error('toggleDepartmentStatus error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 6. Assign HOD to Department
exports.assignHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const { hodId } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (!hodId) {
      return res.status(400).json({ message: 'HOD User ID is required' });
    }

    const hodUser = await User.findById(hodId);
    if (!hodUser || hodUser.role !== 'hod') {
      return res.status(400).json({ message: 'Selected user is not an HOD' });
    }

    department.hod = hodUser._id;
    await department.save();

    // Sync HOD user department field
    hodUser.department = department.name;
    await hodUser.save();

    await ActivityLog.create({
      performedBy: req.user._id,
      action: 'HOD_ASSIGNED',
      department: department._id,
      departmentName: department.name,
      details: { hodId: hodUser._id, hodName: hodUser.name, hodEmail: hodUser.email }
    });

    res.json({ message: 'HOD assigned successfully', department });
  } catch (error) {
    console.error('assignHOD error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 7. Change HOD of Department
exports.changeHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const { newHodId } = req.body;

    const department = await Department.findById(id).populate('hod', 'name email');
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (!newHodId) {
      return res.status(400).json({ message: 'New HOD User ID is required' });
    }

    const newHodUser = await User.findById(newHodId);
    if (!newHodUser || newHodUser.role !== 'hod') {
      return res.status(400).json({ message: 'Selected new user is not an HOD' });
    }

    const previousHod = department.hod;

    // Update Department HOD link
    department.hod = newHodUser._id;
    await department.save();

    // Update new HOD's department field
    newHodUser.department = department.name;
    await newHodUser.save();

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

    res.json({
      message: 'HOD changed successfully',
      previousHod: previousHod ? { _id: previousHod._id, name: previousHod.name, email: previousHod.email } : null,
      newHod: { _id: newHodUser._id, name: newHodUser.name, email: newHodUser.email },
      department
    });
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
