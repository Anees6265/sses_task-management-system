import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api.jsx';

const TaskChats = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] bg-gray-50">
      {/* Left Sidebar - Task List */}
      <div className={`${selectedTask ? 'hidden md:block' : 'block'} w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col`}>
        {/* Filter Tabs */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>💬</span>
            <span>Task Chats</span>
          </h2>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('todo')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filter === 'todo' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📋 To Do ({tasks.filter(t => t.status === 'todo').length})
            </button>
            <button
              onClick={() => setFilter('inprogress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filter === 'inprogress' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🚀 In Progress ({tasks.filter(t => t.status === 'inprogress').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filter === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ Completed ({tasks.filter(t => t.status === 'completed').length})
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-lg">No tasks found</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task._id}
                onClick={() => setSelectedTask(task)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition ${
                  selectedTask?._id === task._id ? 'bg-blue-50 border-l-4 border-l-orange-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-2xl">{getStatusIcon(task.status)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">{task.title}</h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{formatDate(task.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'high' && '🔴'}
                        {task.priority === 'medium' && '🟡'}
                        {task.priority === 'low' && '🟢'}
                        {' '}{task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Task Detail */}
      <div className={`${selectedTask ? 'block' : 'hidden md:block'} flex-1 bg-white`}>
        {selectedTask ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <button
                onClick={() => setSelectedTask(null)}
                className="md:hidden mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <span>←</span>
                <span>Back</span>
              </button>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{getStatusIcon(selectedTask.status)}</span>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedTask.title}</h2>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status}
                    </span>
                    <span className={`text-sm font-medium ${getPriorityColor(selectedTask.priority)}`}>
                      Priority: {selectedTask.priority}
                    </span>
                    <span className="text-sm text-gray-500">
                      Created: {new Date(selectedTask.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>

                {selectedTask.assignedTo && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Assigned To</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {selectedTask.assignedTo.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{selectedTask.assignedTo.name}</p>
                        <p className="text-sm text-gray-500">{selectedTask.assignedTo.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTask.department && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Department</h3>
                    <p className="text-gray-700">{selectedTask.department}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-6xl mb-4">💬</p>
              <p className="text-xl">Select a task to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskChats;
