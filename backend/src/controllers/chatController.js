const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');
const { demoUsers, demoMessages } = require('../utils/mockStore');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    if (mongoose.connection.readyState === 1) {
      let allowedUsers = [];
      try {
        allowedUsers = await User.find({ _id: { $ne: userId } }).select('name email role department');
      } catch (dbErr) {
        console.warn('DB search failed in getConversations, using demo users:', dbErr.message);
        allowedUsers = demoUsers.filter(u => String(u._id) !== String(userId));
      }

      const conversations = await Promise.all(
        allowedUsers.map(async (u) => {
          let lastMsg = null;
          let unread = 0;
          try {
            const rawMsg = await Message.findOne({
              $or: [
                { sender: userId, receiver: u._id },
                { sender: u._id, receiver: userId }
              ]
            }).sort({ createdAt: -1 });

            if (rawMsg) {
              lastMsg = {
                ...rawMsg.toObject(),
                message: decrypt(rawMsg.message)
              };
            }

            unread = await Message.countDocuments({
              sender: u._id,
              receiver: userId,
              read: false
            });
          } catch (mErr) {
            // Fallback to demoMessages
            const userMsgs = demoMessages.filter(m => {
              const sId = m.sender._id || m.sender;
              const rId = m.receiver._id || m.receiver;
              return (String(sId) === String(userId) && String(rId) === String(u._id)) ||
                     (String(sId) === String(u._id) && String(rId) === String(userId));
            });
            if (userMsgs.length > 0) {
              lastMsg = userMsgs[userMsgs.length - 1];
            }
            unread = userMsgs.filter(m => String(m.sender._id || m.sender) === String(u._id) && !m.read).length;
          }

          return {
            user: u,
            lastMessage: lastMsg,
            unreadCount: unread
          };
        })
      );

      conversations.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      return res.json(conversations);
    } else {
      const allowedUsers = demoUsers.filter(u => String(u._id) !== String(userId));
      const conversations = allowedUsers.map((u) => {
        const userMsgs = demoMessages.filter(m => {
          const sId = m.sender._id || m.sender;
          const rId = m.receiver._id || m.receiver;
          return (String(sId) === String(userId) && String(rId) === String(u._id)) ||
                 (String(sId) === String(u._id) && String(rId) === String(userId));
        });

        const lastMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1] : null;
        const unread = userMsgs.filter(m => String(m.sender._id || m.sender) === String(u._id) && !m.read).length;

        return {
          user: u,
          lastMessage: lastMsg,
          unreadCount: unread
        };
      });

      conversations.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      return res.json(conversations);
    }
  } catch (error) {
    console.error('Error in getConversations:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (mongoose.connection.readyState === 1) {
      try {
        const messages = await Message.find({
          $or: [
            { sender: currentUserId, receiver: userId },
            { sender: userId, receiver: currentUserId }
          ]
        })
          .populate('sender', 'name email role department')
          .populate('receiver', 'name email role department')
          .sort({ createdAt: 1 });

        const decryptedMessages = messages.map(msg => ({
          ...msg.toObject(),
          message: decrypt(msg.message)
        }));

        await Message.updateMany(
          { sender: userId, receiver: currentUserId, read: false },
          { read: true }
        );

        return res.json(decryptedMessages);
      } catch (dbErr) {
        console.warn('DB getMessages failed, using demoMessages:', dbErr.message);
      }
    }

    const matchedMsgs = demoMessages.filter(m => {
      const sId = m.sender._id || m.sender;
      const rId = m.receiver._id || m.receiver;
      return (String(sId) === String(currentUserId) && String(rId) === String(userId)) ||
             (String(sId) === String(userId) && String(rId) === String(currentUserId));
    });

    matchedMsgs.forEach(m => {
      if (String(m.sender._id || m.sender) === String(userId)) {
        m.read = true;
      }
    });

    return res.json(matchedMsgs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiver, message } = req.body;
    if (!message || !receiver) {
      return res.status(400).json({ message: 'Receiver and message text are required' });
    }

    const currentUserId = req.user._id;
    const encryptedMessage = encrypt(message);

    if (mongoose.connection.readyState === 1) {
      try {
        const newMessage = await Message.create({
          sender: currentUserId,
          receiver,
          message: encryptedMessage
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'name email role department')
          .populate('receiver', 'name email role department');

        const resultMessage = {
          ...populatedMessage.toObject(),
          message: message.trim()
        };

        demoMessages.push(resultMessage);
        return res.status(201).json(resultMessage);
      } catch (dbErr) {
        console.warn('DB sendMessage failed, falling back to mock store:', dbErr.message);
      }
    }

    const senderObj = req.user;
    const receiverObj = demoUsers.find(u => String(u._id) === String(receiver)) || { _id: receiver, name: 'Faculty' };

    const newMsg = {
      _id: '64m' + Date.now().toString(16),
      sender: {
        _id: senderObj._id,
        name: senderObj.name,
        email: senderObj.email,
        role: senderObj.role,
        department: senderObj.department
      },
      receiver: {
        _id: receiverObj._id,
        name: receiverObj.name,
        email: receiverObj.email,
        role: receiverObj.role,
        department: receiverObj.department
      },
      message: message.trim(),
      read: false,
      delivered: true,
      createdAt: new Date()
    };

    demoMessages.push(newMsg);
    return res.status(201).json(newMsg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (mongoose.connection.readyState === 1) {
      try {
        await Message.updateMany(
          { sender: userId, receiver: currentUserId, read: false },
          { read: true }
        );
      } catch (dbErr) {
        console.warn('DB markAsRead failed:', dbErr.message);
      }
    }

    demoMessages.forEach(m => {
      const sId = m.sender._id || m.sender;
      const rId = m.receiver._id || m.receiver;
      if (String(sId) === String(userId) && String(rId) === String(currentUserId)) {
        m.read = true;
      }
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
