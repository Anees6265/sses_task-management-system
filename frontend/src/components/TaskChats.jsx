import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api.jsx';

const TaskChats = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
    // Auto-refresh every 5 seconds to show new tasks
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await taskAPI.getTasks();
      setTasks(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-blue-100 text-blue-700';
      case 'inprogress': return 'bg-orange-100 text-orange-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'todo': return '📋';
      case 'inprogress': return '🚀';
      case 'completed': return '✅';
      default: return '📄';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-200">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>💬</span>
          <span>Task Chats</span>
        </h2>
        
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
              filter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('todo')}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
              filter === 'todo' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 To Do ({tasks.filter(t => t.status === 'todo').length})
          </button>
          <button
            onClick={() => setFilter('inprogress')}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
              filter === 'inprogress' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚀 In Progress ({tasks.filter(t => t.status === 'inprogress').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
              filter === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ✅ Completed ({tasks.filter(t => t.status === 'completed').length})
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-gray-200 max-h-[calc(100vh-280px)] overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg">No tasks found</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task._id}
              className="p-4 md:p-6 hover:bg-gray-50 transition"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0 mt-1">
                  <span className="text-2xl md:text-3xl">{getStatusIcon(task.status)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-base md:text-lg text-gray-800">{task.title}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(task.createdAt)}</span>
                  </div>
                  
                  {task.description && (
                    <p className="text-sm md:text-base text-gray-600 mb-3 leading-relaxed">{task.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`text-xs md:text-sm font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' && '🔴'}
                      {task.priority === 'medium' && '🟡'}
                      {task.priority === 'low' && '🟢'}
                      {' '}{task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        📅 Due: {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>

                  {task.assignedTo && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-semibold">
                        {task.assignedTo.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs md:text-sm font-medium text-gray-800">{task.assignedTo.name}</p>
                        <p className="text-xs text-gray-500">{task.assignedTo.email}</p>
                      </div>
                    </div>
                  )}

                  {task.department && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">🏢 {task.department}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskChats;
