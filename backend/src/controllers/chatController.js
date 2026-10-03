const Message = require('../models/Message');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('🔍 Getting conversations for user:', req.user.email, 'Role:', req.user.role, 'Department:', req.user.department);
    
    // Return all active users (excluding current user) so any team member can chat with any other user
    const allowedUsers = await User.find({
      _id: { $ne: userId },
      status: { $ne: 'inactive' }
    }).select('name email role department status');
    
    console.log('✅ Found', allowedUsers.length, 'potential chat partners');
    
    // Get last message with each user
    const conversations = await Promise.all(
      allowedUsers.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: userId, receiver: user._id },
            { sender: user._id, receiver: userId }
          ]
        }).sort({ createdAt: -1 });
        
        const unreadCount = await Message.countDocuments({
          sender: user._id,
          receiver: userId,
          read: false
        });
        
        return {
          user,
          lastMessage: lastMessage ? {
            ...lastMessage.toObject(),
            message: decrypt(lastMessage.message)
          } : null,
          unreadCount
        };
      })
    );
    
    // Sort by last message time, and secondary by name
    conversations.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (a.user.name || '').localeCompare(b.user.name || '');
    });
    
    console.log('✅ Returning', conversations.length, 'conversations');
    res.json(conversations);
  } catch (error) {
    console.error('❌ Error in getConversations:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .sort({ createdAt: 1 });
    
    const decryptedMessages = messages.map(msg => ({
      ...msg.toObject(),
      message: decrypt(msg.message)
    }));
    
    await Message.updateMany(
      { sender: userId, receiver: currentUserId, read: false },
      { read: true }
    );
    
    res.json(decryptedMessages);
  } catch (error) {
    console.error('❌ Error in getMessages:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiver, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }
    
    const encryptedMessage = encrypt(message.trim());
    
    const newMessage = await Message.create({
      sender: req.user._id,
      receiver,
      message: encryptedMessage
    });
    
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email')
      .populate('receiver', 'name email');
    
    const decryptedMessage = {
      ...populatedMessage.toObject(),
      message: decrypt(populatedMessage.message)
    };
    
    // Broadcast via socket if io instance is available
    const io = req.app.get('io');
    if (io) {
      io.to(String(receiver)).emit('receive-message', decryptedMessage);
    }
    
    res.status(201).json(decryptedMessage);
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Message.updateMany(
      { sender: userId, receiver: req.user._id, read: false },
      { read: true }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('❌ Error in markAsRead:', error);
    res.status(500).json({ message: error.message });
  }
};

