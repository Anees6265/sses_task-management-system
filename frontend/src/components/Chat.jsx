import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { chatAPI } from '../services/api.jsx';

const Chat = () => {
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!socket) {
      console.log('⚠️ Socket not available');
      return;
    }

    console.log('📡 Setting up socket listeners');

    const handleReceiveMessage = (message) => {
      console.log('📨 Message received:', message);
      if (selectedUser && (message.sender._id === selectedUser._id || message.receiver._id === selectedUser._id)) {
        setMessages(prev => [...prev, message]);
        socket.emit('mark-read', { sender: message.sender._id });
      }
      fetchConversations();
    };

    const handleMessageSent = (message) => {
      console.log('✅ Message sent:', message);
      setMessages(prev => [...prev, message]);
    };

    const handleUserTyping = ({ userId }) => {
      console.log('⌨️ User typing:', userId);
      if (selectedUser && userId === selectedUser._id) {
        setTyping(true);
      }
    };

    const handleUserStopTyping = ({ userId }) => {
      console.log('⏸️ User stop typing:', userId);
      if (selectedUser && userId === selectedUser._id) {
        setTyping(false);
      }
    };

    socket.on('receive-message', handleReceiveMessage);
    socket.on('message-sent', handleMessageSent);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);

    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('receive-message', handleReceiveMessage);
      socket.off('message-sent', handleMessageSent);
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
      console.log('🔍 Fetching conversations...');
      const { data } = await chatAPI.getConversations();
      console.log('✅ Conversations fetched:', data.length, 'users');
      setConversations(data);
    } catch (error) {
      console.error('❌ Error fetching conversations:', error.response?.data || error.message);
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

    // Clear input immediately for better UX
    setNewMessage('');

    if (socket) {
      // Use socket if available
      socket.emit('send-message', messageData);
      socket.emit('stop-typing', { receiver: selectedUser._id });
    } else {
      // Fallback to REST API
      try {
        const { data } = await chatAPI.sendMessage(messageData);
        setMessages(prev => [...prev, data]);
        fetchConversations();
      } catch (error) {
        console.error('Error sending message:', error);
        // Restore message on error
        setNewMessage(messageData.message);
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

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] md:h-[calc(100vh-120px)] bg-white md:rounded-lg overflow-hidden md:shadow-lg">
      {/* Conversations List */}
      <div className={`${
        selectedUser ? 'hidden md:flex' : 'flex'
      } w-full md:w-1/3 bg-white border-r border-gray-200 flex-col`}>
        <div className="p-3 md:p-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white sticky top-0 z-10">
          <h2 className="text-lg md:text-xl font-bold">💬 Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-sm text-center">No conversations yet</p>
            </div>
          ) : (
            conversations.map(({ user, lastMessage, unreadCount }) => (
              <div
                key={user._id}
                onClick={() => fetchMessages(user)}
                className={`p-3 md:p-4 border-b border-gray-100 cursor-pointer active:bg-gray-100 transition ${
                  selectedUser?._id === user._id ? 'bg-orange-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-base md:text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {isOnline(user._id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className="font-semibold text-gray-800 truncate text-sm md:text-base">{user.name}</h3>
                      {lastMessage && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatTime(lastMessage.createdAt)}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs md:text-sm text-gray-600 truncate">
                        {lastMessage?.message || 'No messages yet'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 ml-2 flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{user.role}</span>
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
      } flex-1 flex-col bg-gray-50`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-4 bg-white border-b border-gray-200 flex items-center space-x-3 sticky top-0 z-10">
              <button
                onClick={() => setSelectedUser(null)}
                className="md:hidden text-orange-500 mr-2 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-sm md:text-base">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                {isOnline(selectedUser._id) && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 truncate text-sm md:text-base">{selectedUser.name}</h3>
                <p className="text-xs text-gray-500">
                  {isOnline(selectedUser._id) ? '🟢 Online' : '⚫ Offline'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isSent = msg.sender._id !== selectedUser._id;
                    return (
                      <div key={msg._id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] md:max-w-xs px-3 py-2 md:px-4 md:py-2 rounded-2xl ${
                            isSent
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-none'
                              : 'bg-white text-gray-800 rounded-bl-none shadow'
                          }`}
                        >
                          <p className="break-words text-sm md:text-base">{msg.message}</p>
                          <p className={`text-[10px] md:text-xs mt-1 ${isSent ? 'text-orange-100' : 'text-gray-500'}`}>
                            {formatTime(msg.createdAt)}
                            {isSent && msg.read && ' ✓✓'}
                            {isSent && !msg.read && msg.delivered && ' ✓'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {typing && (
                    <div className="flex justify-start">
                      <div className="bg-white px-3 py-2 md:px-4 md:py-2 rounded-2xl rounded-bl-none shadow">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-2 md:p-4 bg-white border-t border-gray-200 sticky bottom-0">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 md:px-4 md:py-2 text-sm md:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-semibold hover:from-orange-600 hover:to-amber-600 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base flex-shrink-0"
                >
                  📤
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
            <div className="text-center">
              <div className="text-5xl md:text-6xl mb-3 md:mb-4">💬</div>
              <p className="text-base md:text-xl">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
