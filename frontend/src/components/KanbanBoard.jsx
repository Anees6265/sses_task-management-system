import React, { useState, useEffect, useContext } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { taskAPI, userAPI, departmentAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import Dashboard from './Dashboard.jsx';
import TaskChats from './TaskChats.jsx';
import Loader from './Loader.jsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const KanbanBoard = () => {
  const [tasks, setTasks] = useState({ todo: [], inprogress: [], completed: [] });
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '', assignType: 'single', assignedUsers: [] });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('board');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  useEffect(() => {
    if (user?.role === 'admin') {
      setActiveView('dashboard');
      fetchDepartments();
    }
    fetchTasks();
    fetchUsers();
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [activeView]);

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
      const { data } = await taskAPI.getTasks();
      let filteredData = data;
      
      if (user?.role === 'admin' && activeView !== 'dashboard' && activeView !== 'board') {
        filteredData = data.filter(task => task.department === activeView);
      }
      
      const grouped = { todo: [], inprogress: [], completed: [] };
      filteredData.forEach(task => grouped[task.status].push(task));
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
    
    // Handle assignment based on type
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
    } else {
      delete taskData.department;
    }
    
    // Close modal immediately for better UX
    setShowModal(false);
    setLoading(true);
    
    try {
      if (editingTask) {
        await taskAPI.updateTask(editingTask._id, taskData);
        toast.success('✅ Task updated!', { position: 'top-center', autoClose: 2000 });
      } else {
        await taskAPI.createTask(taskData);
        toast.success('✅ Task created!', { position: 'top-center', autoClose: 2000 });
      }
      
      // Reset form
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '', assignType: 'single', assignedUsers: [] });
      setUserSearchQuery('');
      setEditingTask(null);
      
      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('❌ Failed to save task', { position: 'top-center', autoClose: 3000 });
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

  const Column = ({ title, tasks, droppableId, emoji, bgColor }) => {
    const hasScroll = tasks.length > 5;
    
    return (
    <div className="w-full lg:flex-1 lg:min-w-[300px]" style={{ height: hasScroll ? 'calc(100vh-180px)' : 'auto', minHeight: hasScroll ? 'auto' : '200px' }}>
      <div className={`${bgColor} rounded-lg md:rounded-xl p-2.5 md:p-4 ${hasScroll ? 'h-full' : 'min-h-[180px]'} border-2 border-gray-200 shadow-sm flex flex-col`}>
        <div className="flex items-center justify-between mb-2.5 md:mb-4 pb-2 md:pb-3 border-b-2 border-gray-200 flex-shrink-0">
          <h3 className="font-bold text-xs md:text-lg text-gray-800 flex items-center space-x-1.5 md:space-x-2">
            <span className="text-base md:text-2xl">{emoji}</span>
            <span className="truncate">{title}</span>
          </h3>
          <span className="bg-white text-gray-700 text-xs font-bold px-2 py-1 rounded-full shadow-sm flex-shrink-0">
            {tasks.length}
          </span>
        </div>
        
        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 ${hasScroll ? 'overflow-y-auto flex-1' : ''} pr-1 scroll-smooth ${
                snapshot.isDraggingOver ? 'bg-gray-200 rounded-lg p-2' : ''
              }`}
              style={{ 
                maxHeight: hasScroll ? 'calc(100vh - 280px)' : 'none',
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {tasks.map((task, index) => (
                <Draggable key={task._id} draggableId={task._id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`bg-white rounded-lg border-2 border-gray-200 p-2.5 md:p-4 hover:shadow-lg transition-all duration-200 ${
                        snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105' : 'shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-semibold text-gray-800 flex-1 text-[15px] md:text-base leading-tight break-words">
                          {task.title}
                        </h4>
                        <div className="flex gap-1 flex-shrink-0">
                          <select
                            value={task.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(task._id, e.target.value);
                            }}
                            className="text-[11px] md:text-xs px-1 md:px-1.5 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer leading-tight"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="todo">📋 To Do</option>
                            <option value="inprogress">🚀 In Progress</option>
                            <option value="completed">✅ Completed</option>
                          </select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTask(task);
                            }}
                            className="text-blue-500 hover:text-blue-700 transition text-base md:text-lg font-bold px-1"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(task._id);
                            }}
                            className="text-gray-400 hover:text-red-500 transition text-xl md:text-2xl font-bold -mt-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="text-[13px] md:text-sm text-gray-600 mb-2 line-clamp-2 break-words">
                          {task.description}
                        </p>
                      )}
                      
                      {task.assignedTo && task.assignedTo.length > 0 && (
                        <div className="flex items-center space-x-1 mb-1.5">
                          <span className="text-xs text-gray-500">👤</span>
                          <span className="text-[13px] md:text-sm font-medium text-gray-700 truncate">
                            {Array.isArray(task.assignedTo) 
                              ? task.assignedTo.map(u => u.name).join(', ')
                              : task.assignedTo.name}
                          </span>
                        </div>
                      )}
                      
                      {task.dueDate && (
                        <div className="flex items-center space-x-1 mb-2">
                          <span className="text-xs text-gray-500">📅</span>
                          <span className={`text-[13px] md:text-sm font-medium ${
                            new Date(task.dueDate) < new Date() && task.status !== 'completed'
                              ? 'text-red-600 font-bold'
                              : 'text-gray-700'
                          }`}>
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                        <span className={`text-[11px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-semibold flex items-center space-x-0.5 md:space-x-1 ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          <span className="text-[10px] md:text-xs">{task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}</span>
                          <span className="capitalize hidden sm:inline">{task.priority}</span>
                        </span>
                        
                        <span className="text-xs text-gray-400 font-medium">
                          {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {tasks.length === 0 && (
                <div className="text-center py-6 md:py-12 text-gray-400">
                  <p className="text-2xl md:text-4xl mb-1 md:mb-2">📭</p>
                  <p className="text-xs md:text-sm">{t('noTasks')}</p>
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
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="light" 
        style={{ zIndex: 9999, top: '70px' }}
        toastStyle={{
          fontSize: '14px',
          padding: '12px',
          borderRadius: '8px'
        }}
      />
      {loading && <Loader />}
      <div className="min-h-screen bg-gray-100 pt-[56px] md:pt-[65px]">
      <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
      
      <div className="flex flex-col md:flex-row">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          userRole={user?.role}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />
        
        <main className="flex-1 p-3 md:p-6 overflow-x-hidden md:ml-64 transition-all duration-300">
          {activeView === 'dashboard' && user?.role === 'admin' && (
            <Dashboard />
          )}

          {activeView !== 'dashboard' && activeView !== 'chats' && activeView !== 'analytics' && activeView !== 'settings' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 md:mb-6 gap-2 md:gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg md:text-3xl font-bold text-gray-800">
                      {activeView === 'board' ? t('sprintBoard') : activeView}
                    </h2>
                    <p className="text-gray-600 mt-0.5 md:mt-1 text-xs md:text-base">{t('dragDrop')}</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="md:hidden p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition self-start"
                  >
                    <svg className={`w-5 h-5 text-gray-700 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full sm:w-auto px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-xs md:text-base"
                >
                  + {t('newTask')}
                </button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 md:gap-6 overflow-x-hidden">
                  <Column 
                    title={t('todo')} 
                    tasks={tasks.todo} 
                    droppableId="todo" 
                    emoji="📋" 
                    bgColor="bg-white"
                  />
                  <Column 
                    title={t('inProgress')} 
                    tasks={tasks.inprogress} 
                    droppableId="inprogress" 
                    emoji="🚀" 
                    bgColor="bg-white"
                  />
                  <Column 
                    title={t('completed')} 
                    tasks={tasks.completed} 
                    droppableId="completed" 
                    emoji="✅" 
                    bgColor="bg-white"
                  />
                </div>
              </DragDropContext>
            </>
          )}

          {activeView === 'chats' && (
            <TaskChats />
          )}

          {activeView === 'analytics' && (
            <div className="bg-white rounded-xl p-4 md:p-8 border border-gray-200">
              <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-4">{t('analytics')}</h2>
              <p className="text-gray-600 text-sm md:text-base">{t('comingSoon')}</p>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="bg-white rounded-xl p-4 md:p-8 border border-gray-200">
              <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-4">{t('settings')}</h2>
              <p className="text-gray-600 text-sm md:text-base">{t('comingSoon')}</p>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setEditingTask(null);
              setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '', assignType: 'single', assignedUsers: [] });
              setUserSearchQuery('');
            }
          }}
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setEditingTask(null);
              setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '', assignType: 'single', assignedUsers: [] });
              setUserSearchQuery('');
            }
          }}
        >
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl w-full max-w-[95%] sm:max-w-xl md:max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sm:mb-5 md:mb-6">
              <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-800">
                {editingTask ? t('editTask') : t('createTask')}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTask(null);
                  setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '', assignType: 'single', assignedUsers: [] });
                  setUserSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-light leading-none"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">{t('taskTitle')} *</label>
                <input
                  type="text"
                  placeholder={t('enterTitle')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs sm:text-sm"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">{t('description')}</label>
                <textarea
                  placeholder={t('enterDescription')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs sm:text-sm resize-none"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">{t('priority')}</label>
                  <select
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs sm:text-sm"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="low">🟢 {t('lowPriority')}</option>
                    <option value="medium">🟡 {t('mediumPriority')}</option>
                    <option value="high">🔴 {t('highPriority')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">{t('dueDate')}</label>
                  <input
                    type="date"
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs sm:text-sm"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">{t('selectDepartment')} *</label>
                    <select
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs sm:text-sm"
                      value={newTask.department}
                      onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                      required={user?.role === 'admin'}
                    >
                      <option value="">{t('selectDepartment')}</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Assign To Section - Full Width */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('assignTo')}</label>
                
                {/* Radio Buttons */}
                <div className="flex gap-3 sm:gap-4 mb-3">
                  <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignType"
                      value="single"
                      checked={newTask.assignType === 'single'}
                      onChange={(e) => setNewTask({ ...newTask, assignType: e.target.value, assignedUsers: [] })}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500"
                    />
                    <span className="text-[11px] sm:text-sm text-gray-700 font-medium">Single Assign</span>
                  </label>
                  <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignType"
                      value="multi"
                      checked={newTask.assignType === 'multi'}
                      onChange={(e) => setNewTask({ ...newTask, assignType: e.target.value, assignedTo: '' })}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500"
                    />
                    <span className="text-[11px] sm:text-sm text-gray-700 font-medium">Multi Assign</span>
                  </label>
                </div>
                
                {/* Single Select Dropdown */}
                {newTask.assignType === 'single' && (
                  <select
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs sm:text-sm"
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  >
                    <option value="">{t('unassigned')}</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                )}
                
                {/* Multi Select with Search */}
                {newTask.assignType === 'multi' && (
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-2 bg-gray-50 border-b border-gray-300">
                      <input
                        type="text"
                        placeholder="🔍 Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                    
                    {/* Selected Count */}
                    {newTask.assignedUsers.length > 0 && (
                      <div className="px-2.5 sm:px-3 py-1.5 bg-orange-50 border-b border-orange-200 text-[11px] sm:text-xs text-orange-700 font-medium">
                        ✓ {newTask.assignedUsers.length} user{newTask.assignedUsers.length > 1 ? 's' : ''} selected
                      </div>
                    )}
                    
                    {/* User List */}
                    <div className="p-2 sm:p-3 max-h-36 sm:max-h-40 overflow-y-auto space-y-1.5 sm:space-y-2">
                      {users.filter(u => 
                        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                      ).length === 0 ? (
                        <p className="text-[11px] sm:text-xs text-gray-500 text-center py-2">No users found</p>
                      ) : (
                        users
                          .filter(u => 
                            u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                          )
                          .map(u => (
                            <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded active:bg-gray-100">
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
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 rounded flex-shrink-0"
                              />
                              <span className="text-[11px] sm:text-sm text-gray-700 leading-tight">{u.name} ({u.email})</span>
                            </label>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 sm:py-2.5 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Saving...' : (editingTask ? t('updateTask') : t('createTaskBtn'))}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '', assignType: 'single', assignedUsers: [] });
                    setUserSearchQuery('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-800">{t('deleteTask')}</h3>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">{t('deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteTask(deleteConfirm)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 md:py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition text-xs md:text-base"
              >
                {t('delete')}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 md:py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-xs md:text-base"
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
