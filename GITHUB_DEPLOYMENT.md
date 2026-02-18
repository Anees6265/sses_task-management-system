# 🚀 GitHub Upload & Deployment Guide

## Step 1: GitHub pe Upload Karna

### 1.1 Git Initialize karo
```bash
cd d:\github\Todo_List
git init
git add .
git commit -m "Initial commit - Task Management System"
```

### 1.2 GitHub pe Repository banao
1. GitHub.com pe jao aur login karo
2. "New Repository" button click karo
3. Repository name: `task-management-system`
4. Description: "Department-wise Task Management System"
5. Public ya Private select karo
6. **DON'T** add README, .gitignore, or license (already hai)
7. "Create Repository" click karo

### 1.3 GitHub se connect karo
```bash
git remote add origin https://github.com/YOUR_USERNAME/task-management-system.git
git branch -M main
git push -u origin main
```

---

## Step 2: Backend Deployment (Render.com - FREE)

### 2.1 Render.com Account banao
1. https://render.com pe jao
2. "Get Started for Free" click karo
3. GitHub se sign up karo

### 2.2 Backend Deploy karo
1. Dashboard pe "New +" button click karo
2. "Web Service" select karo
3. GitHub repository connect karo
4. Settings:
   - **Name**: `task-manager-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 2.3 Environment Variables add karo
"Environment" tab me jao aur add karo:
```
MONGODB_URI=mongodb+srv://anees123:anees786786@itegmanagementsystem.qlag4.mongodb.net/User?retryWrites=true&w=majority
JWT_SECRET=0f8fc53cf6b5f73df2a963cce812aa45f766c6b565175c98b47acea1589c6a00e3b5d67c1a2331933ad49a108b74ab0a2546ab7507814b195ff90b275fe036c5
NODE_ENV=production
PORT=5000
```

### 2.4 Deploy karo
- "Create Web Service" button click karo
- Wait for deployment (5-10 minutes)
- Backend URL copy karo (e.g., `https://task-manager-backend-xxxx.onrender.com`)

---

## Step 3: Frontend Deployment (Vercel - FREE)

### 3.1 Frontend me Backend URL update karo
File: `frontend/src/services/api.js`
```javascript
const API_URL = 'https://your-backend-url.onrender.com/api';
```

### 3.2 Changes commit karo
```bash
git add .
git commit -m "Update backend URL for production"
git push origin main
```

### 3.3 Vercel Account banao
1. https://vercel.com pe jao
2. "Sign Up" click karo
3. GitHub se sign up karo

### 3.4 Frontend Deploy karo
1. "Add New Project" click karo
2. GitHub repository import karo
3. Settings:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. "Deploy" button click karo
5. Wait for deployment (3-5 minutes)

---

## Step 4: Testing

### 4.1 Backend Test karo
```
https://your-backend-url.onrender.com/
```
Response: `{"message": "Task Manager API Running"}`

### 4.2 Frontend Test karo
```
https://your-app.vercel.app
```
- Register karke new user banao
- Login karo
- Task create karo
- Drag & drop test karo

---

## 🎯 Quick Commands Summary

```bash
# Git setup
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/task-management-system.git
git push -u origin main

# Future updates
git add .
git commit -m "Your update message"
git push origin main
```

---

## 🔧 Troubleshooting

### Backend Issues:
- **CORS Error**: Backend me CORS properly configured hai
- **MongoDB Connection**: Environment variables check karo
- **Port Error**: Render automatically PORT set karta hai

### Frontend Issues:
- **API Not Found**: Backend URL check karo in `api.js`
- **Build Failed**: `npm install` locally run karke check karo
- **Blank Page**: Browser console me errors check karo

---

## 📱 Alternative Deployment Options

### Backend:
- **Railway.app** (Free tier available)
- **Heroku** (Paid now)
- **AWS EC2** (More control)

### Frontend:
- **Netlify** (Similar to Vercel)
- **GitHub Pages** (Static only)
- **AWS S3 + CloudFront**

---

## 🎉 Done!

Aapki website ab live hai:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend.onrender.com

Share karo aur use karo! 🚀
