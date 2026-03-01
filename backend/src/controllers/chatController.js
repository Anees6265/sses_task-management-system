const Message = require('../models/Message');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('🔍 Getting conversations for user:', req.user.email, 'Role:', req.user.role, 'Department:', req.user.department);
    
    // Get all users the current user can chat with
    let allowedUsers = [];
    
    if (req.user.role === 'admin') {
      // Admin can chat with everyone
      allowedUsers = await User.find({ _id: { $ne: userId } }).select('name email role department');
      console.log('✅ Admin - Found', allowedUsers.length, 'users');
    } else if (req.user.role === 'hod') {
      // HOD can chat with admin and faculty in their department
      allowedUsers = await User.find({
        _id: { $ne: userId },
        $or: [
          { role: 'admin' },
          { department: req.user.department, role: 'user' }
        ]
      }).select('name email role department');
      console.log('✅ HOD - Found', allowedUsers.length, 'users (admin + faculty in', req.user.department, ')');
    } else {
      // Faculty can chat with admin and their HOD
      allowedUsers = await User.find({
        _id: { $ne: userId },
        $or: [
          { role: 'admin' },
          { role: 'hod', department: req.user.department }
        ]
      }).select('name email role department');
      console.log('✅ Faculty - Found', allowedUsers.length, 'users (admin + HOD in', req.user.department, ')');
    }
    
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
          lastMessage,
          unreadCount
        };
      })
    );
    
    // Sort by last message time
    conversations.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || 0;
      const timeB = b.lastMessage?.createdAt || 0;
      return timeB - timeA;
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
    res.status(500).json({ message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiver, message } = req.body;
    
    const encryptedMessage = encrypt(message);
    
    const newMessage = await Message.create({
      sender: req.user._id,
      receiver,
      message: encryptedMessage
    });
    
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email')
      .populate('receiver', 'name email');
    
    res.status(201).json({
      ...populatedMessage.toObject(),
      message: decrypt(populatedMessage.message)
    });
  } catch (error) {
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
    res.status(500).json({ message: error.message });
  }
};
