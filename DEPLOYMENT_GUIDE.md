# 🚀 Deployment Guide - Task Manager

## Backend Deployment (Vercel/Render)

### Option 1: Vercel Deployment

1. **GitHub par code push karo:**
   ```bash
   git add .
   git commit -m "deployment setup"
   git push origin main
   ```

2. **Vercel par deploy karo:**
   - [Vercel](https://vercel.com) par jao aur login karo
   - "New Project" click karo
   - GitHub repository select karo
   - Root Directory: `backend` set karo
   - Environment Variables add karo:
     ```
     MONGODB_URI=your_mongodb_uri
     JWT_SECRET=your_jwt_secret
     NODE_ENV=production
     ```
   - Deploy button click karo

3. **Backend URL copy karo** (e.g., `https://your-backend.vercel.app`)

### Option 2: Render Deployment

1. **GitHub par code push karo**

2. **Render par deploy karo:**
   - [Render](https://render.com) par jao aur login karo
   - "New +" → "Web Service" click karo
   - GitHub repository connect karo
   - Settings:
     - Name: `task-manager-backend`
     - Root Directory: `backend`
     - Build Command: `npm install`
     - Start Command: `npm start`
   - Environment Variables add karo:
     ```
     MONGODB_URI=your_mongodb_uri
     JWT_SECRET=your_jwt_secret
     NODE_ENV=production
     PORT=5000
     ```
   - "Create Web Service" click karo

3. **Backend URL copy karo**

---

## Frontend Deployment (Vercel/Netlify)

### Option 1: Vercel Deployment

1. **Backend URL update karo:**
   - `frontend/.env.production` file mein:
   ```
   VITE_API_URL=https://your-backend-url.vercel.app/api
   ```

2. **Vercel par deploy karo:**
   - [Vercel](https://vercel.com) par jao
   - "New Project" click karo
   - Same repository select karo
   - Root Directory: `frontend` set karo
   - Environment Variables add karo:
     ```
     VITE_API_URL=https://your-backend-url.vercel.app/api
     ```
   - Deploy button click karo

### Option 2: Netlify Deployment

1. **Build karo:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Netlify par deploy karo:**
   - [Netlify](https://netlify.com) par jao aur login karo
   - "Add new site" → "Import an existing project"
   - GitHub repository connect karo
   - Settings:
     - Base directory: `frontend`
     - Build command: `npm run build`
     - Publish directory: `frontend/dist`
   - Environment Variables:
     ```
     VITE_API_URL=https://your-backend-url.vercel.app/api
     ```
   - Deploy button click karo

---

## ✅ Deployment Checklist

### Backend:
- [x] `vercel.json` file created
- [x] `render.yaml` file created
- [ ] MongoDB URI production ready hai
- [ ] Environment variables set kiye
- [ ] Backend deployed aur working hai

### Frontend:
- [x] API URL environment variable se configure kiya
- [x] `.env.production` file created
- [ ] Backend URL update kiya
- [ ] Frontend deployed aur working hai

---

## 🔧 Post-Deployment Steps

1. **Backend URL test karo:**
   ```
   https://your-backend-url.vercel.app/
   ```
   Response: `{"message": "Task Manager API Running"}`

2. **Frontend URL test karo:**
   - Login/Register page kholo
   - Account banao aur login karo
   - Tasks create/update/delete test karo

3. **CORS issue ho to backend mein update karo:**
   ```javascript
   // server.js
   app.use(cors({
     origin: ['https://your-frontend-url.vercel.app'],
     credentials: true
   }));
   ```

---

## 📝 Important URLs

- **Backend URL:** `https://your-backend.vercel.app`
- **Frontend URL:** `https://your-frontend.vercel.app`
- **MongoDB:** Already configured in `.env`

---

## 🐛 Common Issues

### Issue 1: API calls fail
**Solution:** Frontend `.env.production` mein correct backend URL check karo

### Issue 2: CORS error
**Solution:** Backend `server.js` mein frontend URL add karo

### Issue 3: MongoDB connection error
**Solution:** MongoDB Atlas mein IP whitelist check karo (0.0.0.0/0 allow karo)

---

## 🎉 Done!

Aapka Task Manager ab live hai! 🚀
