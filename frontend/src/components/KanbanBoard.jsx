import React, { useState, useEffect, useContext } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { taskAPI, userAPI, departmentAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import Dashboard from './Dashboard.jsx';
import LeaveDashboard from './LeaveDashboard.jsx';
import Chat from './Chat.jsx';
import Loader from './Loader.jsx';
import Modal from './Modal.jsx';
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
  FiChevronDown
} from 'react-icons/fi';

import DepartmentDashboard from './DepartmentDashboard.jsx';
import DepartmentDetailPage from './DepartmentDetailPage.jsx';
import FacultyProfilePage from './FacultyProfilePage.jsx';
import UserManagementPage from './UserManagementPage.jsx';

const KanbanBoard = () => {
  const [tasks, setTasks] = useState({ todo: [], inprogress: [], completed: [] });
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '', assignType: 'single', assignedUsers: [] });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('board');
  const [selectedDepartmentName, setSelectedDepartmentName] = useState(null);
  const [selectedFacultyForProfile, setSelectedFacultyForProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const handleSelectDepartment = (deptName) => {
    setSelectedDepartmentName(deptName);
    setActiveView('dept-detail');
  };

  const handleOpenFacultyProfile = (facultyObj) => {
    setSelectedFacultyForProfile(facultyObj || user);
    setActiveView('faculty-profile');
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'hod') {
      setActiveView('dashboard');
      fetchDepartments();
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
      setUsers(data);
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
    destTasks.splice(destination.index, 0, movedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: sourceTasks,
      [destination.droppableId]: destTasks
    });

    try {
      await taskAPI.updateTask(draggableId, { status: destination.droppableId });
    } catch (error) {
      fetchTasks();
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
    
    if (user?.role === 'admin') {
      if (!taskData.department) {
        toast.error('Please select a department', { position: 'top-center', autoClose: 2000 });
        return;
      }
    } else if (user?.role === 'hod') {
      taskData.department = user.department;
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
      
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '', assignType: 'single', assignedUsers: [] });
      setUserSearchQuery('');
      setEditingTask(null);
      await fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task', { position: 'top-center', autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    const assignedIds = Array.isArray(task.assignedTo) 
      ? task.assignedTo.map(u => u._id || u)
      : task.assignedTo ? [task.assignedTo._id || task.assignedTo] : [];
    
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: assignedIds.length === 1 ? assignedIds[0] : '',
      department: task.department || '',
      assignType: assignedIds.length > 1 ? 'multi' : 'single',
      assignedUsers: assignedIds.length > 1 ? assignedIds : []
    });
    setShowModal(true);
  };

  const handleDeleteTask = async (id) => {
    try {
      await taskAPI.deleteTask(id);
      setDeleteConfirm(null);
      fetchTasks();
      toast.success('Task deleted!', { position: 'top-center', autoClose: 2000 });
    } catch (error) {
      console.error('Error deleting task:', error);
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

  const Column = ({ title, tasks, droppableId, icon: IconComponent, badgeColor }) => {
    const hasScroll = tasks.length > 5;
    
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
                className={`space-y-3 flex-1 transition-colors rounded-2xl p-1 ${
                  snapshot.isDraggingOver ? 'bg-orange-50/50 border-2 border-dashed border-orange-300' : ''
                }`}
              >
                {tasks.map((task, index) => (
                  <Draggable key={task._id} draggableId={task._id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-orange-300 transition-all duration-200 glass-card-hover ${
                          snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105 border-orange-500' : 'shadow-sm'
                        }`}
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
                              title="Edit Task"
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
                                ? task.assignedTo.map(u => u.name).join(', ')
                                : task.assignedTo.name}
                            </span>
                          </div>
                        )}
                        
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 mb-3 text-xs font-medium">
                            <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className={`${
                              new Date(task.dueDate) < new Date() && task.status !== 'completed'
                                ? 'text-rose-600 font-bold'
                                : 'text-slate-600'
                            }`}>
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 ${
                            task.priority === 'high' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                            task.priority === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span>{task.priority}</span>
                          </span>
                          
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
          
          <main className={`flex-1 p-4 md:p-6 overflow-x-hidden transition-all duration-300 ${
            isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
          }`}>
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
              <FacultyProfilePage faculty={selectedFacultyForProfile || user} onBack={() => setActiveView('leaves')} />
            )}

            {activeView !== 'dashboard' && activeView !== 'leaves' && activeView !== 'departments-overview' && activeView !== 'dept-detail' && activeView !== 'faculty-profile' && activeView !== 'chats' && activeView !== 'users' && activeView !== 'analytics' && activeView !== 'settings' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 fade-in">
                  <div className="flex items-center gap-3">
                    {selectedFacultyId && (
                      <button
                        onClick={() => {
                          setSelectedFacultyId(null);
                          setActiveView('dashboard');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-xl transition flex items-center gap-2 text-xs font-bold shadow-xs"
                      >
                        <FiArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                    )}
                    <div>
                      <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                        <span>{activeView === 'board' ? t('sprintBoard') : activeView}</span>
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">{t('dragDrop')}</p>
                    </div>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="md:hidden p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                      <FiRefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold transition shadow-lg shadow-orange-500/20 text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>{user?.role === 'user' ? 'New Personal Task' : t('newTask')}</span>
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

            {activeView === 'analytics' && (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center py-16">
                <FiList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">{t('analytics')}</h2>
                <p className="text-xs text-slate-500 font-semibold">{t('comingSoon')}</p>
              </div>
            )}

            {activeView === 'settings' && (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center py-16">
                <FiList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">{t('settings')}</h2>
                <p className="text-xs text-slate-500 font-semibold">{t('comingSoon')}</p>
              </div>
            )}
          </main>
        </div>

        {/* Create / Edit Task Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          {showModal && (
            <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-100 fade-in">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <FiPlus className="w-5 h-5 text-orange-500" />
                  <span>{editingTask ? t('editTask') : t('createTask')}</span>
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTask} className="space-y-4">
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
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('priority')}</label>
                    <select
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  
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
                
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('selectDepartment')} *</label>
                    <select
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition"
                      value={newTask.department}
                      onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                      required
                    >
                      <option value="">{t('selectDepartment')}</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}

                {user?.role === 'hod' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Department</label>
                    <input
                      type="text"
                      disabled
                      value={`${user?.department || 'Department'}`}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-sm font-bold text-slate-700 cursor-not-allowed"
                    />
                  </div>
                )}
                
                {(user?.role === 'admin' || user?.role === 'hod') && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">{t('assignTo')}</label>
                    
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
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition"
                        value={newTask.assignedTo}
                        onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                      >
                        <option value="">{t('unassigned')}</option>
                        {users
                          .filter(u => user?.role === 'admin' ? true : u.department === user?.department)
                          .map(u => (
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
                            placeholder="Search faculty members..."
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
                          {users
                            .filter(u => user?.role === 'admin' ? true : u.department === user?.department)
                            .filter(u => 
                              u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                              u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                            )
                            .map(u => (
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
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
          {deleteConfirm && (
            <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 text-center fade-in">
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
          )}
        </Modal>
      </div>
    </>
  );
};

export default KanbanBoard;
