# Task Manager - GitHub Style Sprint Board

Professional task management system with Kanban board, authentication, and MongoDB backend.

## 🚀 Features
- 📱 **Mobile-First Design** - Perfect responsive UI for mobile & desktop
- 🔐 JWT Authentication (Login/Register)
- 📋 Drag & Drop Kanban Board (To Do → In Progress → Completed)
- 🎯 Task Priority Management
- 💾 MongoDB Database
- 🎨 Beautiful UI with Tailwind CSS
- 📲 PWA Support - Install as mobile app
- 🍔 Mobile Sidebar with Hamburger Menu
- 👆 Touch-Optimized Drag & Drop

## 📁 Project Structure
```
Todo_List/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── routes/
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   └── services/
    └── package.json
```

## 🛠️ Setup Instructions

### Backend Setup
1. Navigate to backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key_here
   NODE_ENV=development
   ```

4. Start server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm start
   ```

## 📱 Mobile App (APK)

### Build Android APK
Detailed guide: See `APK_BUILD_GUIDE.md` and `QUICK_APK_BUILD.md`

**Quick Method:**
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Task Manager" "com.sses.taskmanager" --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android
```
Then build APK in Android Studio: **Build → Build APK**

### Share APK
- Direct file share (WhatsApp, Email, Drive)
- Firebase App Distribution
- Google Play Store

---

## 🌐 Deployment

### Backend Deployment (Render/Railway/Heroku)
1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy

### Frontend Deployment (Vercel/Netlify)
1. Build production version:
   ```bash
   npm run build
   ```
2. Deploy `build` folder to hosting platform
3. Update API_URL in `src/services/api.js` to production backend URL

## 📝 API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Tasks
- GET `/api/tasks` - Get all tasks
- POST `/api/tasks` - Create task
- PUT `/api/tasks/:id` - Update task
- DELETE `/api/tasks/:id` - Delete task

## 🔐 Admin Access
First registered user can be made admin by updating `role` field in MongoDB to `admin`.

## 🎨 Tech Stack
- **Frontend**: React, Tailwind CSS, React Beautiful DnD
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT

## 📦 Dependencies
See `package.json` files in backend and frontend folders.
