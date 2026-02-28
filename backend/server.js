require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const userRoutes = require('./src/routes/userRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');
const healthRoutes = require('./src/routes/healthRoutes');
const testRoutes = require('./src/routes/testRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const Message = require('./src/models/Message');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('./src/utils/encryption');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

connectDB();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 86400
}));

// Handle preflight requests
app.options('*', cors());

// Additional headers for mobile apps
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🌐 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`📱 User-Agent: ${req.get('user-agent') || 'Unknown'}`);
  console.log(`🔑 Authorization: ${req.get('authorization') ? 'Present' : 'None'}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/test', testRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', healthRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Task Manager API Running' });
});

// Socket.IO for real-time chat
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.userId);
  
  onlineUsers.set(socket.userId, socket.id);
  io.emit('user-online', { userId: socket.userId });
  socket.emit('online-users', Array.from(onlineUsers.keys()));
  socket.join(socket.userId);
  
  socket.on('send-message', async (data) => {
    try {
      const encryptedMessage = encrypt(data.message);
      
      const message = await Message.create({
        sender: socket.userId,
        receiver: data.receiver,
        message: encryptedMessage
      });
      
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name email')
        .populate('receiver', 'name email');
      
      const decryptedMessage = {
        ...populatedMessage.toObject(),
        message: decrypt(populatedMessage.message)
      };
      
      const receiverSocketId = onlineUsers.get(data.receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-message', decryptedMessage);
        await Message.findByIdAndUpdate(message._id, { delivered: true });
        socket.emit('message-delivered', { messageId: message._id });
      }
      
      socket.emit('message-sent', decryptedMessage);
    } catch (error) {
      socket.emit('message-error', { error: error.message });
    }
  });
  
  socket.on('typing', (data) => {
    const receiverSocketId = onlineUsers.get(data.receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-typing', { userId: socket.userId });
    }
  });
  
  socket.on('stop-typing', (data) => {
    const receiverSocketId = onlineUsers.get(data.receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-stop-typing', { userId: socket.userId });
    }
  });
  
  socket.on('mark-read', async (data) => {
    try {
      await Message.updateMany(
        { sender: data.sender, receiver: socket.userId, read: false },
        { read: true }
      );
      
      const senderSocketId = onlineUsers.get(data.sender);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages-read', { userId: socket.userId });
      }
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.userId);
    onlineUsers.delete(socket.userId);
    io.emit('user-offline', { userId: socket.userId });
  });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://172.19.16.1:${PORT}`);
  console.log(`\n📧 Email Config: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not Configured'}`);
  console.log('💬 Socket.IO chat enabled');
});
