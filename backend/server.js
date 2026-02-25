require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const userRoutes = require('./src/routes/userRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');
const healthRoutes = require('./src/routes/healthRoutes');
const testRoutes = require('./src/routes/testRoutes');

const app = express();

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
app.use('/api', healthRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Task Manager API Running' });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Allow network access

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://172.19.16.1:${PORT}`);
  console.log(`\n📧 Email Config: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not Configured'}`);
});
