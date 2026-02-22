import React, { useState, useEffect, useContext } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { taskAPI, userAPI, departmentAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import Dashboard from './Dashboard.jsx';
import Loader from './Loader.jsx';

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
      } else {
        await taskAPI.createTask(taskData);
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

  const Column = ({ title, tasks, droppableId, emoji, bgColor }) => (
    <div className="w-full lg:flex-1 lg:min-w-[300px] h-[400px] lg:h-[calc(100vh-200px)]">
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
              className={`space-y-2 overflow-y-auto flex-1 pr-1 ${
                snapshot.isDraggingOver ? 'bg-gray-200 rounded-lg p-2' : ''
              }`}
              style={{ maxHeight: 'calc(100vh - 280px)' }}
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
                  <p className="text-xs md:text-sm">No tasks</p>
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
      {loading && <Loader />}
      <div className="min-h-screen bg-gray-100" style={{ paddingTop: 'calc(65px + env(safe-area-inset-top, 0px))' }}>
      <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
      
      <div className="flex flex-col md:flex-row">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          userRole={user?.role}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />
        
        <main className="flex-1 p-3 md:p-6 overflow-x-hidden md:ml-64">
          {activeView === 'dashboard' && user?.role === 'admin' && (
            <Dashboard />
          )}

          {activeView !== 'dashboard' && activeView !== 'tasks' && activeView !== 'analytics' && activeView !== 'settings' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 md:mb-6 gap-2 md:gap-3">
                <div>
                  <h2 className="text-lg md:text-3xl font-bold text-gray-800">
                    {activeView === 'board' ? 'Sprint Board' : activeView}
                  </h2>
                  <p className="text-gray-600 mt-0.5 md:mt-1 text-xs md:text-base">Drag & drop tasks</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full sm:w-auto px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-xs md:text-base"
                >
                  + New Task
                </button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 md:gap-6">
                  <Column 
                    title="To Do" 
                    tasks={tasks.todo} 
                    droppableId="todo" 
                    emoji="📋" 
                    bgColor="bg-white"
                  />
                  <Column 
                    title="In Progress" 
                    tasks={tasks.inprogress} 
                    droppableId="inprogress" 
                    emoji="🚀" 
                    bgColor="bg-white"
                  />
                  <Column 
                    title="Completed" 
                    tasks={tasks.completed} 
                    droppableId="completed" 
                    emoji="✅" 
                    bgColor="bg-white"
                  />
                </div>
              </DragDropContext>
            </>
          )}

          {activeView === 'tasks' && (
            <div className="bg-white rounded-xl p-4 md:p-8 border border-gray-200">
              <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-4">All Tasks</h2>
              <p className="text-gray-600 text-sm md:text-base">Coming soon...</p>
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="bg-white rounded-xl p-4 md:p-8 border border-gray-200">
              <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-4">Analytics</h2>
              <p className="text-gray-600 text-sm md:text-base">Coming soon...</p>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="bg-white rounded-xl p-4 md:p-8 border border-gray-200">
              <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-4">Settings</h2>
              <p className="text-gray-600 text-sm md:text-base">Coming soon...</p>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white p-4 md:p-8 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base md:text-2xl font-bold mb-3 md:mb-6 text-gray-800">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-2.5 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Task Title</label>
                <input
                  type="text"
                  placeholder="Enter task title"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs md:text-base"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Description</label>
                <textarea
                  placeholder="Enter task description"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs md:text-base"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows="3"
                />
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Priority</label>
                <select
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs md:text-base"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                </select>
              </div>
              
              {user?.role === 'admin' && (
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Department *</label>
                  <select
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs md:text-base"
                    value={newTask.department}
                    onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                    required={user?.role === 'admin'}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs md:text-base"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Assign To</label>
                <select
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-xs md:text-base"
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-4 md:mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 md:py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-xs md:text-base"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '', department: '' });
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 md:py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-xs md:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-800">Delete Task?</h3>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteTask(deleteConfirm)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 md:py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition text-xs md:text-base"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 md:py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-xs md:text-base"
              >
                Cancel
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
