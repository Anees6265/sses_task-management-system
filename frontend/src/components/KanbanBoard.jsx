import React, { useState, useEffect, useContext } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { taskAPI, userAPI, departmentAPI, taskTemplateAPI, getBackendBaseUrl } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import Dashboard from './Dashboard.jsx';
import Chat from './Chat.jsx';
import Loader from './Loader.jsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiPlus,
  FiRefreshCw,
  FiArrowLeft,
  FiEdit3,
  FiTrash2,
  FiCalendar,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiList,
  FiSearch,
  FiInbox,
  FiX,
  FiAlertTriangle,
  FiBriefcase,
  FiChevronDown,
  FiPaperclip,
  FiMessageSquare,
  FiRepeat,
  FiLayers,
  FiSend,
  FiDownload,
  FiFileText
} from 'react-icons/fi';

import LeaveDashboard from './LeaveDashboard.jsx';
import DepartmentDashboard from './DepartmentDashboard.jsx';
import DepartmentDetailPage from './DepartmentDetailPage.jsx';
import FacultyProfilePage from './FacultyProfilePage.jsx';
import UserManagementPage from './UserManagementPage.jsx';
import DepartmentManagement from './DepartmentManagement.jsx';
import AllHODs from './AllHODs.jsx';

const viewToPathMap = {
  dashboard: '/dashboard',
  board: '/board',
  chats: '/chats',
  users: '/users',
  leaves: '/leaves',
  departments: '/departments',
  'departments-overview': '/departments-overview',
  'dept-detail': '/dept-detail',
  'faculty-profile': '/faculty-profile',
  'all-hods': '/all-hods',
};

const pathToViewMap = {
  '/dashboard': 'dashboard',
  '/board': 'board',
  '/chats': 'chats',
  '/users': 'users',
  '/leaves': 'leaves',
  '/departments': 'departments',
  '/departments-overview': 'departments-overview',
  '/dept-detail': 'dept-detail',
  '/faculty-profile': 'faculty-profile',
  '/all-hods': 'all-hods',
};

const getViewFromUrl = () => {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);

  if (pathToViewMap[pathname]) {
    return {
      view: pathToViewMap[pathname],
      deptName: searchParams.get('dept')
    };
  }

  if (pathname.startsWith('/department/')) {
    const deptName = decodeURIComponent(pathname.replace('/department/', ''));
    return { view: deptName, deptName };
  }

  return null;
};

const getUrlFromView = (view, deptName) => {
  if (viewToPathMap[view]) {
    if (view === 'dept-detail' && deptName) {
      return `/dept-detail?dept=${encodeURIComponent(deptName)}`;
    }
    return viewToPathMap[view];
  }
  if (!view) return '/board';
  return `/department/${encodeURIComponent(view)}`;
};

const KanbanBoard = () => {
  const [tasks, setTasks] = useState({ todo: [], inprogress: [], completed: [] });
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form State
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    department: '',
    assignType: 'single',
    assignedUsers: [],
    isRecurring: false,
    recurrencePattern: 'none',
    recurrenceInterval: 1
  });

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeView, setActiveViewRaw] = useState(() => {
    const urlState = getViewFromUrl();
    if (urlState) return urlState.view;
    return 'board';
  });
  const [selectedDepartmentName, setSelectedDepartmentName] = useState(() => {
    const urlState = getViewFromUrl();
    return urlState?.deptName || null;
  });

  const setActiveView = (newView, deptName) => {
    setActiveViewRaw(newView);
    const targetDept = deptName !== undefined ? deptName : (newView === 'dept-detail' ? selectedDepartmentName : null);
    if (deptName !== undefined) {
      setSelectedDepartmentName(deptName);
    }
    const targetUrl = getUrlFromView(newView, targetDept);
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({ view: newView, deptName: targetDept }, '', targetUrl);
    }
  };

  const [selectedFacultyForProfile, setSelectedFacultyForProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);

  // Modal Sub-Tabs (Details | Comments | Attachments | Reassignment)
  const [modalTab, setModalTab] = useState('details');
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const handleSelectDepartment = (deptName) => {
    setActiveView('dept-detail', deptName);
  };

  const handleOpenFacultyProfile = (facultyObj) => {
    setSelectedFacultyForProfile(facultyObj || user);
    setActiveView('faculty-profile');
  };

  useEffect(() => {
    const handlePopState = () => {
      const urlState = getViewFromUrl();
      if (urlState) {
        setActiveViewRaw(urlState.view);
        if (urlState.deptName) {
          setSelectedDepartmentName(urlState.deptName);
        }
      } else {
        const defaultView = (user?.role === 'admin' || user?.role === 'hod') ? 'dashboard' : 'board';
        setActiveViewRaw(defaultView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  useEffect(() => {
    const urlState = getViewFromUrl();
    if (urlState) {
      setActiveViewRaw(urlState.view);
      if (urlState.deptName) {
        setSelectedDepartmentName(urlState.deptName);
      }
    } else if (user?.role === 'admin' || user?.role === 'hod') {
      setActiveViewRaw('dashboard');
      window.history.replaceState({ view: 'dashboard' }, '', '/dashboard');
    } else if (user) {
      setActiveViewRaw('board');
      window.history.replaceState({ view: 'board' }, '', '/board');
    }

    if (user?.role === 'admin' || user?.role === 'hod') {
      fetchDepartments();
      fetchTemplates();
    }
    fetchTasks();
    fetchUsers();
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [activeView, selectedFacultyId]);

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentAPI.getAllDepartments();
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await taskTemplateAPI.getTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching task templates:', error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let data;
      if (selectedFacultyId) {
        const response = await taskAPI.getTasksByFaculty(selectedFacultyId);
        data = response.data;
      } else {
        const response = await taskAPI.getTasks();
        data = response.data;
      }

      let filteredData = data;

      if ((user?.role === 'admin' || user?.role === 'hod') && activeView !== 'dashboard' && activeView !== 'board' && !selectedFacultyId) {
        filteredData = data.filter(task => task.department === activeView);
      }

      const grouped = { todo: [], inprogress: [], completed: [] };
      filteredData.forEach(task => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        } else {
          grouped.todo.push(task);
        }
      });
      setTasks(grouped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await userAPI.getAllUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const sourceTasks = [...tasks[source.droppableId]];
    const destTasks = [...tasks[destination.droppableId]];
    const [movedTask] = sourceTasks.splice(source.index, 1);
    
    // Update task status optimistically so card status dropdown and object remain in sync
    const updatedTask = { ...movedTask, status: destination.droppableId };
    destTasks.splice(destination.index, 0, updatedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: sourceTasks,
      [destination.droppableId]: destTasks
    });

    try {
      await taskAPI.updateTask(draggableId, { status: destination.droppableId });
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task status via drag:', error);
      toast.error(error.response?.data?.message || 'Failed to update task status');
      await fetchTasks();
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();

    const taskData = { ...newTask };

    if (newTask.assignType === 'multi') {
      taskData.assignedTo = newTask.assignedUsers;
      delete taskData.assignType;
      delete taskData.assignedUsers;
    } else {
      if (!taskData.assignedTo) {
        taskData.assignedTo = [];
      } else {
        taskData.assignedTo = [taskData.assignedTo];
      }
      delete taskData.assignType;
      delete taskData.assignedUsers;
    }

    if (!taskData.dueDate) delete taskData.dueDate;

    if (user?.role === 'admin' || user?.role === 'hod') {
      taskData.department = user?.role === 'hod' ? user.department : (taskData.department || 'General');
    } else {
      delete taskData.department;
    }

    setShowModal(false);
    setLoading(true);

    try {
      if (editingTask) {
        await taskAPI.updateTask(editingTask._id, taskData);
        toast.success('Task updated successfully!', { position: 'top-center', autoClose: 2000 });
      } else {
        await taskAPI.createTask(taskData);
        toast.success('Task created successfully!', { position: 'top-center', autoClose: 2000 });
      }

      resetTaskForm();
      await fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error(error.response?.data?.message || 'Failed to save task', { position: 'top-center', autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const resetTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      assignedTo: '',
      department: user?.role === 'hod' ? user.department : '',
      assignType: 'single',
      assignedUsers: [],
      isRecurring: false,
      recurrencePattern: 'none',
      recurrenceInterval: 1
    });
    setUserSearchQuery('');
    setEditingTask(null);
    setSelectedTemplateId('');
    setModalTab('details');
    setComments([]);
    setAttachments([]);
    setSelectedFile(null);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    const assignedIds = Array.isArray(task.assignedTo)
      ? task.assignedTo.map(u => u._id || u)
      : task.assignedTo ? [task.assignedTo._id || task.assignedTo] : [];

    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: assignedIds.length === 1 ? assignedIds[0] : '',
      department: task.department || (user?.role === 'hod' ? user.department : ''),
      assignType: assignedIds.length > 1 ? 'multi' : 'single',
      assignedUsers: assignedIds.length > 1 ? assignedIds : [],
      isRecurring: task.isRecurring || false,
      recurrencePattern: task.recurrencePattern || 'none',
      recurrenceInterval: task.recurrenceInterval || 1
    });

    setComments(task.comments || []);
    setAttachments(task.attachments || []);
    setModalTab('details');
    setShowModal(true);
  };

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find(t => String(t._id) === String(templateId));
    if (tmpl) {
      const defaultDate = new Date(Date.now() + (tmpl.defaultDueDateOffsetDays || 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setNewTask(prev => ({
        ...prev,
        title: tmpl.title,
        description: tmpl.description || '',
        priority: tmpl.priority || 'medium',
        dueDate: defaultDate,
        department: tmpl.department || (user?.role === 'hod' ? user.department : '')
      }));
      toast.info(`Loaded template "${tmpl.title}"`, { autoClose: 1500 });
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!newTask.title.trim()) {
      toast.error('Please specify a title before saving template');
      return;
    }
    try {
      await taskTemplateAPI.createTemplate({
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        department: user?.role === 'hod' ? user.department : (newTask.department || 'General')
      });
      toast.success('Saved as task template!');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !editingTask) return;
    try {
      const { data } = await taskAPI.addComment(editingTask._id, newCommentText.trim());
      const updatedComments = data || [];
      setComments(updatedComments);
      setEditingTask(prev => prev ? { ...prev, comments: updatedComments } : null);
      setNewCommentText('');
      await fetchTasks();
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingTask) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit!');
      return;
    }

    const formData = new FormData();
    formData.append('attachment', file);

    setUploadingFile(true);
    try {
      const { data } = await taskAPI.uploadAttachment(editingTask._id, formData);
      const updatedAttachments = data || [];
      setAttachments(updatedAttachments);
      setEditingTask(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
      await fetchTasks();
      toast.success('Attachment uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!editingTask) return;
    try {
      const { data } = await taskAPI.deleteAttachment(editingTask._id, attachmentId);
      const updatedAttachments = data || [];
      setAttachments(updatedAttachments);
      setEditingTask(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
      await fetchTasks();
      toast.success('Attachment deleted');
    } catch (error) {
      toast.error('Failed to delete attachment');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await taskAPI.deleteTask(id);
      setDeleteConfirm(null);
      fetchTasks();
      toast.success('Task deleted!', { position: 'top-center', autoClose: 2000 });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(error.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateTask(taskId, { status: newStatus });
      await fetchTasks();
      toast.success('Task status updated!', { position: 'top-center', autoClose: 2000 });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update status', { position: 'top-center', autoClose: 2000 });
    }
  };

  const handleFacultyClick = (facultyId) => {
    setSelectedFacultyId(facultyId);
    setActiveView('board');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTasks();
      toast.success('Refreshed!', { position: 'top-center', autoClose: 1500 });
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter department faculty for HOD
  const availableFaculty = user?.role === 'hod'
    ? users.filter(u => u.role === 'user' && u.department === user.department)
    : users.filter(u => u.role === 'user');

  const Column = ({ title, tasks, droppableId, icon: IconComponent, badgeColor }) => {
    return (
      <div className="w-full lg:flex-1 lg:min-w-[300px]">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 border border-slate-200/80 shadow-md flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
            <h3 className="font-extrabold text-sm md:text-base text-slate-800 flex items-center gap-2">
              <span className={`p-2 rounded-xl text-white ${badgeColor}`}>
                <IconComponent className="w-4 h-4" />
              </span>
              <span className="truncate">{title}</span>
            </h3>
            <span className="bg-slate-100 text-slate-700 text-xs font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
              {tasks.length}
            </span>
          </div>

          <Droppable droppableId={droppableId}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-3 flex-1 transition-colors rounded-2xl p-1 ${snapshot.isDraggingOver ? 'bg-orange-50/50 border-2 border-dashed border-orange-300' : ''}`}
              >
                {tasks.map((task, index) => (
                  <Draggable key={task._id} draggableId={task._id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-orange-300 transition-all duration-200 glass-card-hover ${snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105 border-orange-500' : 'shadow-sm'}`}
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-bold text-slate-800 text-sm md:text-base leading-snug break-words flex-1">
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <select
                              value={task.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChange(task._id, e.target.value);
                              }}
                              className="text-[11px] font-semibold px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="todo">To Do</option>
                              <option value="inprogress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTask(task);
                              }}
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                              title="Edit / View Details"
                            >
                              <FiEdit3 className="w-4 h-4" />
                            </button>
                            {(user?.role === 'admin' || user?.role === 'hod') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(task._id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Task"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {task.assignedTo && task.assignedTo.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600">
                            <FiUser className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">
                              {Array.isArray(task.assignedTo)
                                ? task.assignedTo.map(u => u.name || u).join(', ')
                                : (task.assignedTo.name || task.assignedTo)}
                            </span>
                          </div>
                        )}

                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 mb-3 text-xs font-medium">
                            <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className={`${new Date(task.dueDate) < new Date() && task.status !== 'completed'
                                ? 'text-rose-600 font-bold'
                                : 'text-slate-600'
                              }`}>
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}

                        {/* Priority Badge */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 ${
                              task.priority === 'critical' ? 'bg-rose-600 text-white shadow-xs' :
                              task.priority === 'high' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                              task.priority === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                              'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span>{task.priority}</span>
                            </span>

                            {task.isRecurring && (
                              <span className="px-2 py-0.5 rounded-full font-extrabold text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                                <FiRepeat className="w-3 h-3" /> Recurring
                              </span>
                            )}

                            {task.comments && task.comments.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full font-extrabold text-[10px] bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1" title="Comments">
                                <FiMessageSquare className="w-3 h-3 text-slate-500" /> {task.comments.length}
                              </span>
                            )}

                            {task.attachments && task.attachments.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full font-extrabold text-[10px] bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1" title="Attachments">
                                <FiPaperclip className="w-3 h-3 text-slate-500" /> {task.attachments.length}
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] text-slate-400 font-semibold">
                            {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {tasks.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <FiInbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold">{t('noTasks')}</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    );
  };

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        theme="light"
        style={{ zIndex: 9999, top: '70px' }}
      />
      {loading && <Loader />}
      <div className="min-h-screen bg-slate-50/50 pt-[60px] md:pt-[68px]">
        <Navbar
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          onFacultyCreated={() => setSidebarRefreshTrigger(prev => prev + 1)}
          onOpenProfile={() => handleOpenFacultyProfile(user)}
        />

        <div className="flex flex-col md:flex-row">
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            userRole={user?.role}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            refreshTrigger={sidebarRefreshTrigger}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={(collapsed) => {
              setIsSidebarCollapsed(collapsed);
              localStorage.setItem('sidebar_collapsed', String(collapsed));
            }}
          />

          <main className={`flex-1 p-4 md:p-6 overflow-x-hidden transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
            {(activeView === 'dashboard' && (user?.role === 'admin' || user?.role === 'hod')) && (
              <Dashboard onFacultyClick={handleFacultyClick} onSelectDepartment={handleSelectDepartment} />
            )}

            {activeView === 'leaves' && (
              <LeaveDashboard onSelectDepartment={handleSelectDepartment} onOpenFacultyProfile={handleOpenFacultyProfile} />
            )}

            {activeView === 'departments-overview' && (
              <DepartmentDashboard onSelectDepartment={handleSelectDepartment} />
            )}

            {activeView === 'dept-detail' && (
              <DepartmentDetailPage departmentName={selectedDepartmentName} onBack={() => setActiveView('departments-overview')} onOpenFacultyProfile={handleOpenFacultyProfile} />
            )}

            {activeView === 'faculty-profile' && (
              <FacultyProfilePage targetUser={selectedFacultyForProfile || user} onBack={() => setActiveView('leaves')} />
            )}

            {activeView !== 'dashboard' && activeView !== 'leaves' && activeView !== 'departments-overview' && activeView !== 'dept-detail' && activeView !== 'faculty-profile' && activeView !== 'chats' && activeView !== 'users' && activeView !== 'analytics' && activeView !== 'settings' && activeView !== 'departments' && activeView !== 'all-hods' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 md:mb-6 gap-2 md:gap-3">
                  <div className="flex items-center gap-3">
                    {selectedFacultyId && (
                      <button
                        onClick={() => {
                          setSelectedFacultyId(null);
                          setActiveView('dashboard');
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm font-medium shadow-sm"
                      >
                        <span className="text-lg">←</span>
                        <span className="hidden sm:inline">Back</span>
                      </button>
                    )}
                    <div>
                      <h2 className="text-lg md:text-3xl font-bold text-gray-800">
                        {activeView === 'board' ? (user?.role === 'hod' ? `${user?.department} Department Tasks` : t('sprintBoard')) : activeView}
                      </h2>
                      <p className="text-gray-600 mt-0.5 md:mt-1 text-xs md:text-base">{t('dragDrop')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      resetTaskForm();
                      setShowModal(true);
                    }}
                    className="w-full sm:w-auto px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-xs md:text-base"
                  >
                    + {user?.role === 'user' ? 'New Personal Task' : t('newTask')}
                  </button>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="flex flex-col lg:grid lg:grid-cols-3 gap-5">
                    <Column
                      title={t('todo')}
                      tasks={tasks.todo}
                      droppableId="todo"
                      icon={FiClock}
                      badgeColor="bg-indigo-600"
                    />
                    <Column
                      title={t('inProgress')}
                      tasks={tasks.inprogress}
                      droppableId="inprogress"
                      icon={FiList}
                      badgeColor="bg-amber-500"
                    />
                    <Column
                      title={t('completed')}
                      tasks={tasks.completed}
                      droppableId="completed"
                      icon={FiCheckCircle}
                      badgeColor="bg-emerald-600"
                    />
                  </div>
                </DragDropContext>
              </>
            )}

            {activeView === 'users' && (
              <UserManagementPage onOpenFacultyProfile={handleOpenFacultyProfile} />
            )}

            {activeView === 'chats' && (
              <Chat />
            )}

            {activeView === 'departments' && (
              <DepartmentManagement onSelectDepartment={handleSelectDepartment} />
            )}

            {activeView === 'all-hods' && (
              <AllHODs onSelectDepartment={handleSelectDepartment} />
            )}
          </main>
        </div>

        {/* Create / Edit Task Modal with HOD Features */}
        {showModal && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <div 
              className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-100 fade-in space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header & Sub-Tabs */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <FiPlus className="w-5 h-5 text-orange-500" />
                    <span>{editingTask ? t('editTask') : t('createTask')}</span>
                  </h2>
                  {user?.role === 'hod' && (
                    <p className="text-xs text-orange-600 font-bold mt-0.5">
                      Department: {user.department}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Editing Task Navigation Sub-Tabs */}
              {editingTask && (
                <div className="flex border-b border-slate-200 gap-4 text-xs font-extrabold">
                  <button
                    onClick={() => setModalTab('details')}
                    className={`pb-2 border-b-2 transition ${modalTab === 'details' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'}`}
                  >
                    Task Details
                  </button>
                  <button
                    onClick={() => setModalTab('comments')}
                    className={`pb-2 border-b-2 transition flex items-center gap-1 ${modalTab === 'comments' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'}`}
                  >
                    <FiMessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
                  </button>
                  <button
                    onClick={() => setModalTab('attachments')}
                    className={`pb-2 border-b-2 transition flex items-center gap-1 ${modalTab === 'attachments' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'}`}
                  >
                    <FiPaperclip className="w-3.5 h-3.5" /> Attachments ({attachments.length})
                  </button>
                </div>
              )}

              {/* SUB-TAB 1: DETAILS & FORM */}
              {modalTab === 'details' && (
                <form onSubmit={handleCreateTask} className="space-y-4">
                  {/* Task Template Selector (HOD & Admin) */}
                  {(user?.role === 'admin' || user?.role === 'hod') && !editingTask && templates.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <FiLayers className="text-orange-500 w-4 h-4" />
                          <span>Use Department Task Template</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleSaveAsTemplate}
                          className="text-[11px] font-extrabold text-orange-600 hover:underline"
                        >
                          + Save Current Form as Template
                        </button>
                      </div>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleSelectTemplate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white"
                      >
                        <option value="">-- Select Task Template (Optional) --</option>
                        {templates.map(tmpl => (
                          <option key={tmpl._id} value={tmpl._id}>{tmpl.title} ({tmpl.priority})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('taskTitle')} *</label>
                    <input
                      type="text"
                      placeholder={t('enterTitle')}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('description')}</label>
                    <textarea
                      placeholder={t('enterDescription')}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition resize-none"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows="3"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Priority Selector (Low, Medium, High, Critical) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('priority')} *</label>
                      <select
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-bold text-slate-800 transition bg-white"
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="critical">🚨 Critical Priority</option>
                      </select>
                    </div>

                    {/* Due Date / Deadline Picker */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('dueDate')}</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* Recurring Task Options */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTask.isRecurring}
                        onChange={(e) => setNewTask({ ...newTask, isRecurring: e.target.checked })}
                        className="rounded text-orange-500 w-4 h-4"
                      />
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <FiRepeat className="text-orange-500 w-4 h-4" /> Make this a Recurring Department Task
                      </span>
                    </label>

                    {newTask.isRecurring && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Recurrence Pattern</label>
                          <select
                            value={newTask.recurrencePattern}
                            onChange={(e) => setNewTask({ ...newTask, recurrencePattern: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom (Days Interval)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Interval (e.g. Every N days)</label>
                          <input
                            type="number"
                            min="1"
                            value={newTask.recurrenceInterval}
                            onChange={(e) => setNewTask({ ...newTask, recurrenceInterval: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Department Assignment for Admin */}
                  {user?.role === 'admin' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('selectDepartment')} *</label>
                      <select
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition bg-white"
                        value={newTask.department}
                        onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                        required
                      >
                        <option value="">{t('selectDepartment')}</option>
                        {departments.map(dept => {
                          const deptName = typeof dept === 'object' ? (dept.name || '') : String(dept || '');
                          return <option key={deptName} value={deptName}>{deptName}</option>;
                        })}
                      </select>
                    </div>
                  )}

                  {/* Faculty Assignment (HOD & Admin) */}
                  {(user?.role === 'admin' || user?.role === 'hod') && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        {user?.role === 'hod' ? `Assign to ${user.department} Faculty` : t('assignTo')}
                      </label>

                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                          <input
                            type="radio"
                            name="assignType"
                            value="single"
                            checked={newTask.assignType === 'single'}
                            onChange={(e) => setNewTask({ ...newTask, assignType: e.target.value, assignedUsers: [] })}
                            className="text-orange-500"
                          />
                          <span>Single Faculty</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                          <input
                            type="radio"
                            name="assignType"
                            value="multi"
                            checked={newTask.assignType === 'multi'}
                            onChange={(e) => setNewTask({ ...newTask, assignType: e.target.value, assignedTo: '' })}
                            className="text-orange-500"
                          />
                          <span>Multiple Faculty</span>
                        </label>
                      </div>

                      {newTask.assignType === 'single' && (
                        <select
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition bg-white"
                          value={newTask.assignedTo}
                          onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                        >
                          <option value="">{t('unassigned')}</option>
                          {availableFaculty.map(u => (
                            <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                      )}

                      {newTask.assignType === 'multi' && (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <div className="p-3 bg-slate-50 border-b border-slate-200 relative">
                            <FiSearch className="absolute left-6 top-5 text-slate-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search department faculty..."
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400"
                            />
                          </div>

                          {newTask.assignedUsers.length > 0 && (
                            <div className="px-4 py-2 bg-orange-50 text-orange-700 text-xs font-bold border-b border-orange-200">
                              ✓ {newTask.assignedUsers.length} faculty member(s) selected
                            </div>
                          )}

                          <div className="p-3 max-h-40 overflow-y-auto space-y-1">
                            {availableFaculty.filter(u =>
                              u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                              u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                            ).map(u => (
                              <label key={u._id} className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-xl cursor-pointer text-xs font-semibold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={newTask.assignedUsers.includes(u._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewTask({ ...newTask, assignedUsers: [...newTask.assignedUsers, u._id] });
                                    } else {
                                      setNewTask({ ...newTask, assignedUsers: newTask.assignedUsers.filter(id => id !== u._id) });
                                    }
                                  }}
                                  className="rounded text-orange-500"
                                />
                                <span>{u.name} ({u.email})</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition shadow-md shadow-orange-500/20 text-sm"
                    >
                      {loading ? 'Saving...' : (editingTask ? t('updateTask') : t('createTaskBtn'))}
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowModal(false)}
                      className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              )}

              {/* SUB-TAB 2: TASK COMMENTS */}
              {modalTab === 'comments' && editingTask && (
                <div className="space-y-4">
                  <div className="max-h-60 overflow-y-auto space-y-3 p-1">
                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-6">No comments added yet.</p>
                    ) : (
                      comments.map((c, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span>{c.userName || 'User'}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
                    />
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <FiSend className="w-4 h-4" /> Send
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: TASK ATTACHMENTS */}
              {modalTab === 'attachments' && editingTask && (
                <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-orange-400 transition bg-slate-50">
                    <input
                      type="file"
                      id="task-attachment-input"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="task-attachment-input" className="cursor-pointer space-y-1 block">
                      <FiPaperclip className="w-6 h-6 text-orange-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Click to upload document or image</p>
                      <p className="text-[10px] text-slate-400">PDF, Word, Excel, Images, Zip (Max 10MB)</p>
                    </label>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {attachments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">No attachments uploaded yet.</p>
                    ) : (
                      attachments.map((att) => (
                        <div key={att._id || att.filename} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FiFileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="truncate font-bold text-slate-800">{att.originalName || att.filename}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({Math.round((att.size || 0) / 1024)} KB)</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                              href={att.path ? `${getBackendBaseUrl()}${att.path}` : '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Download Attachment"
                            >
                              <FiDownload className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att._id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Attachment"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl my-auto border border-slate-100 text-center fade-in">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 mb-2">{t('deleteTask')}?</h3>
              <p className="text-xs text-slate-500 mb-6">{t('deleteConfirm')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteTask(deleteConfirm)}
                  className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 transition text-sm shadow-md shadow-rose-600/20"
                >
                  {t('delete')}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default KanbanBoard;
