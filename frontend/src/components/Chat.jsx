import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { chatAPI } from '../services/api.jsx';
import { showNotification } from '../utils/notifications';
import { 
  FiSend, 
  FiMessageSquare, 
  FiUser, 
  FiArrowLeft, 
  FiWifi, 
  FiWifiOff, 
  FiCheck,
  FiCheckCircle,
  FiSearch
} from 'react-icons/fi';

const Chat = () => {
  const { socket, onlineUsers, connected } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    
    let intervalId;
    if (!connected) {
      intervalId = setInterval(() => {
        fetchConversations();
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [connected]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (selectedUser && (message.sender._id === selectedUser._id || message.receiver._id === selectedUser._id)) {
        setMessages(prev => [...prev, message]);
        socket.emit('mark-read', { sender: message.sender._id });
      } else {
        showNotification(`New message from ${message.sender.name}`, message.message);
      }
      fetchConversations();
    };

    const handleMessageSent = (message) => {
      setMessages(prev => [...prev, message]);
    };
    
    const handleMessageError = (error) => {
      alert('Failed to send message: ' + error.error);
    };
    
    const handleMessageDelivered = ({ messageId }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, delivered: true } : msg
      ));
    };

    const handleUserTyping = ({ userId }) => {
      if (selectedUser && userId === selectedUser._id) setTyping(true);
    };

    const handleUserStopTyping = ({ userId }) => {
      if (selectedUser && userId === selectedUser._id) setTyping(false);
    };

    socket.on('receive-message', handleReceiveMessage);
    socket.on('message-sent', handleMessageSent);
    socket.on('message-error', handleMessageError);
    socket.on('message-delivered', handleMessageDelivered);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('message-sent', handleMessageSent);
      socket.off('message-error', handleMessageError);
      socket.off('message-delivered', handleMessageDelivered);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stop-typing', handleUserStopTyping);
    };
  }, [socket, selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error.response?.data || error.message);
    }
  };

  const fetchMessages = async (user) => {
    try {
      setLoading(true);
      setSelectedUser(user);
      const { data } = await chatAPI.getMessages(user._id);
      setMessages(data);
      socket?.emit('mark-read', { sender: user._id });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const messageData = {
      receiver: selectedUser._id,
      message: newMessage.trim()
    };

    const originalMessage = newMessage;
    setNewMessage('');

    if (socket && connected) {
      socket.emit('send-message', messageData);
      socket.emit('stop-typing', { receiver: selectedUser._id });
    } else {
      try {
        const { data } = await chatAPI.sendMessage(messageData);
        setMessages(prev => [...prev, data]);
        fetchConversations();
      } catch (error) {
        setNewMessage(originalMessage);
        alert('Failed to send message. Please try again.');
      }
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !selectedUser) return;
    socket.emit('typing', { receiver: selectedUser._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { receiver: selectedUser._id });
    }, 1000);
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(c => 
    c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 fade-in">
      {/* Conversations List */}
      <div className={`${
        selectedUser ? 'hidden md:flex' : 'flex'
      } w-full md:w-80 lg:w-96 bg-white border-r border-slate-100 flex-col`}>
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <FiMessageSquare className="text-orange-400 w-5 h-5" />
              <span>Team Messaging</span>
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-xs font-semibold">
              {connected ? <FiWifi className="w-3.5 h-3.5 text-emerald-400" /> : <FiWifiOff className="w-3.5 h-3.5 text-rose-400" />}
              <span className="text-[11px]">{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
              <FiMessageSquare className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-xs font-bold">No active conversations</p>
            </div>
          ) : (
            filteredConversations.map(({ user, lastMessage, unreadCount }) => (
              <div
                key={user._id}
                onClick={() => fetchMessages(user)}
                className={`p-3.5 border-b border-slate-100 cursor-pointer transition ${
                  selectedUser?._id === user._id ? 'bg-orange-50/70 border-l-4 border-l-orange-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-orange-500/20">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    {isOnline(user._id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{user.name}</h3>
                      {lastMessage && (
                        <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 ml-1">
                          {formatTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500 truncate leading-relaxed">
                        {lastMessage?.message || 'Start conversation...'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-orange-500 text-white text-[10px] font-extrabold rounded-full px-2 py-0.5 ml-2">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1 block">
                      {user.role} • {user.department || 'All'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${
        selectedUser ? 'flex' : 'hidden md:flex'
      } flex-1 flex-col bg-slate-50/50`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 md:p-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  <FiArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-orange-500/20">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </div>
                  {isOnline(selectedUser._id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight">{selectedUser.name}</h3>
                  <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${isOnline(selectedUser._id) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>{isOnline(selectedUser._id) ? 'Active Now' : 'Offline'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isSent = msg.sender._id !== selectedUser._id;
                    return (
                      <div key={msg._id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs md:text-sm font-medium shadow-xs ${
                            isSent
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-xs shadow-orange-500/10'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                          }`}
                        >
                          <p className="break-words leading-relaxed">{msg.message}</p>
                          <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${isSent ? 'text-orange-100' : 'text-slate-400'}`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isSent && (msg.read ? <FiCheckCircle className="w-3 h-3 text-white" /> : <FiCheck className="w-3 h-3 text-orange-200" />)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {typing && (
                    <div className="flex justify-start">
                      <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-xs border border-slate-200/80 shadow-xs">
                        <div className="flex space-x-1 items-center">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 sticky bottom-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Write a message..."
                  className="flex-1 px-4 py-2.5 text-xs md:text-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-400 text-slate-800 font-medium"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl transition shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <FiMessageSquare className="w-16 h-16 mb-4 text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">Select a Conversation</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Choose a team member from the left list to start real-time encrypted messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
