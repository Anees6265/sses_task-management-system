import React, { useState, useEffect, useContext } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { taskAPI, userAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const KanbanBoard = () => {
  const [tasks, setTasks] = useState({ todo: [], inprogress: [], completed: [] });
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
  const [activeView, setActiveView] = useState('board');
  const [users, setUsers] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await taskAPI.getTasks();
      const grouped = { todo: [], inprogress: [], completed: [] };
      data.forEach(task => grouped[task.status].push(task));
      setTasks(grouped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
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
    try {
      const taskData = { ...newTask };
      if (!taskData.assignedTo) delete taskData.assignedTo;
      if (!taskData.dueDate) delete taskData.dueDate;
      
      await taskAPI.createTask(taskData);
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
      setShowModal(false);
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await taskAPI.deleteTask(id);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const Column = ({ title, tasks, droppableId, emoji, bgColor }) => (
    <div className="flex-1 min-w-[280px] md:min-w-[320px]">
      <div className={`${bgColor} rounded-xl p-4 h-full border-2 border-gray-200 shadow-sm`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200">
          <h3 className="font-bold text-base md:text-lg text-gray-800 flex items-center space-x-2">
            <span className="text-xl md:text-2xl">{emoji}</span>
            <span>{title}</span>
          </h3>
          <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
            {tasks.length}
          </span>
        </div>
        
        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-3 min-h-[calc(100vh-280px)] transition-colors ${
                snapshot.isDraggingOver ? 'bg-orange-100 rounded-lg p-2' : ''
              }`}
            >
              {tasks.map((task, index) => (
                <Draggable key={task._id} draggableId={task._id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-lg transition-all duration-200 ${
                        snapshot.isDragging ? 'shadow-2xl rotate-3 scale-105' : 'shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-gray-800 flex-1 text-sm md:text-base leading-tight">
                          {task.title}
                        </h4>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="text-gray-400 hover:text-red-500 transition ml-2 text-lg font-bold"
                        >
                          ×
                        </button>
                      </div>
                      
                      {task.description && (
                        <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      {task.assignedTo && (
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs text-gray-500">👤 Assigned to:</span>
                          <span className="text-xs font-medium text-gray-700">{task.assignedTo.name}</span>
                        </div>
                      )}
                      
                      {task.dueDate && (
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-xs text-gray-500">📅 Due:</span>
                          <span className={`text-xs font-medium ${
                            new Date(task.dueDate) < new Date() && task.status !== 'completed'
                              ? 'text-red-600 font-bold'
                              : 'text-gray-700'
                          }`}>
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center space-x-1 ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          <span>{task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}</span>
                          <span className="capitalize">{task.priority}</span>
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
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-sm">No tasks here</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Navbar />
      
      <div className="flex flex-col md:flex-row">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {activeView === 'board' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Sprint Board</h2>
                  <p className="text-gray-600 mt-1 text-sm md:text-base">Manage your tasks with drag & drop</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm md:text-base"
                >
                  + New Task
                </button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  <Column 
                    title="To Do" 
                    tasks={tasks.todo} 
                    droppableId="todo" 
                    emoji="📋" 
                    bgColor="bg-blue-50"
                  />
                  <Column 
                    title="In Progress" 
                    tasks={tasks.inprogress} 
                    droppableId="inprogress" 
                    emoji="🚀" 
                    bgColor="bg-purple-50"
                  />
                  <Column 
                    title="Completed" 
                    tasks={tasks.completed} 
                    droppableId="completed" 
                    emoji="✅" 
                    bgColor="bg-green-50"
                  />
                </div>
              </DragDropContext>
            </>
          )}

          {activeView === 'tasks' && (
            <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">All Tasks</h2>
              <p className="text-gray-600 text-sm md:text-base">Coming soon...</p>
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Analytics</h2>
              <p className="text-gray-600 text-sm md:text-base">Coming soon...</p>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Settings</h2>
              <p className="text-gray-600 text-sm md:text-base">Coming soon...</p>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                <input
                  type="text"
                  placeholder="Enter task title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm md:text-base"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  placeholder="Enter task description"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm md:text-base"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows="3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm md:text-base"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm md:text-base"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm md:text-base"
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-sm md:text-base"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-sm md:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
