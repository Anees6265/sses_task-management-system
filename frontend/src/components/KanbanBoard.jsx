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
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '' });
  const [activeView, setActiveView] = useState('board');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const taskData = { ...newTask };
      if (!taskData.assignedTo) delete taskData.assignedTo;
      if (!taskData.dueDate) delete taskData.dueDate;
      
      if (user?.role === 'admin') {
        if (!taskData.department) {
          alert('Please select a department');
          setLoading(false);
          return;
        }
      } else {
        delete taskData.department;
      }
      
      if (editingTask) {
        await taskAPI.updateTask(editingTask._id, taskData);
        toast.success('Task updated successfully!', { position: 'top-right', autoClose: 3000 });
      } else {
        await taskAPI.createTask(taskData);
        toast.success('Task created successfully!', { position: 'top-right', autoClose: 3000 });
      }
      
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '' });
      setEditingTask(null);
      setShowModal(false);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      department: task.department || ''
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
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const Column = ({ title, tasks, droppableId, emoji, bgColor }) => (
    <div className="w-full lg:flex-1 lg:min-w-[300px] h-[calc(100vh-180px)] md:h-[calc(100vh-200px)]">
      <div className={`${bgColor} rounded-lg md:rounded-xl p-2.5 md:p-4 h-full border-2 border-gray-200 shadow-sm flex flex-col`}>
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
              className={`space-y-2 overflow-y-auto flex-1 pr-1 scroll-smooth ${
                snapshot.isDraggingOver ? 'bg-gray-200 rounded-lg p-2' : ''
              }`}
              style={{ 
                maxHeight: 'calc(100vh - 280px)',
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
                        <h4 className="font-semibold text-gray-800 flex-1 text-xs md:text-base leading-tight break-words">
                          {task.title}
                        </h4>
                        <div className="flex gap-1 flex-shrink-0">
                          <select
                            value={task.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(task._id, e.target.value);
                            }}
                            className="text-xs px-1.5 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
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
                        <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2 break-words">
                          {task.description}
                        </p>
                      )}
                      
                      {task.assignedTo && (
                        <div className="flex items-center space-x-1 mb-1.5">
                          <span className="text-xs text-gray-500">👤</span>
                          <span className="text-xs font-medium text-gray-700 truncate">{task.assignedTo.name}</span>
                        </div>
                      )}
                      
                      {task.dueDate && (
                        <div className="flex items-center space-x-1 mb-2">
                          <span className="text-xs text-gray-500">📅</span>
                          <span className={`text-xs font-medium ${
                            new Date(task.dueDate) < new Date() && task.status !== 'completed'
                              ? 'text-red-600 font-bold'
                              : 'text-gray-700'
                          }`}>
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center space-x-1 ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          <span>{task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}</span>
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

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" style={{ zIndex: 9999 }} />
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
                <div>
                  <h2 className="text-lg md:text-3xl font-bold text-gray-800">
                    {activeView === 'board' ? t('sprintBoard') : activeView}
                  </h2>
                  <p className="text-gray-600 mt-0.5 md:mt-1 text-xs md:text-base">{t('dragDrop')}</p>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowModal(false);
            setEditingTask(null);
            setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '' });
          }
        }}>
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl w-full max-w-[95%] sm:max-w-xl md:max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sm:mb-5 md:mb-6">
              <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-800">
                {editingTask ? t('editTask') : t('createTask')}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTask(null);
                  setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '' });
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
                
                <div className={user?.role === 'admin' ? '' : 'sm:col-span-2'}>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">{t('assignTo')}</label>
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
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 sm:py-2.5 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-xs sm:text-sm"
                >
                  {editingTask ? t('updateTask') : t('createTaskBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '' });
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition text-xs sm:text-sm"
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
