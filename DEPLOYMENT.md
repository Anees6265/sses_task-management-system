# Deployment Guide

## Backend Deployment (Render.com - Free)

1. **Create Account** on Render.com

2. **Create New Web Service**
   - Connect your GitHub repository
   - Select `backend` folder as root directory
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables**
   Add these in Render dashboard:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_random_secret_key
   NODE_ENV=production
   ```

4. **Deploy** - Render will auto-deploy

5. **Copy Backend URL** (e.g., https://your-app.onrender.com)

---

## Frontend Deployment (Vercel - Free)

1. **Update API URL**
   Edit `frontend/src/services/api.js`:
   ```javascript
   const API_URL = 'https://your-backend-url.onrender.com/api';
   ```

2. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

3. **Deploy via Vercel Dashboard**
   - Go to vercel.com
   - Import your GitHub repository
   - Select `frontend` folder as root
   - Framework Preset: Create React App
   - Click Deploy

4. **Or Deploy via CLI**
   ```bash
   cd frontend
   vercel --prod
   ```

---

## MongoDB Atlas Setup (Free)

1. Create account at mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist IP: 0.0.0.0/0 (allow all)
5. Get connection string
6. Replace `<password>` with your database user password

---

## Alternative Deployment Options

### Backend
- **Railway.app** - Similar to Render
- **Heroku** - Classic option
- **AWS EC2** - More control

### Frontend
- **Netlify** - Similar to Vercel
- **GitHub Pages** - Free static hosting
- **AWS S3 + CloudFront** - Scalable option

---

## Post-Deployment Checklist

✅ Backend is running and accessible
✅ MongoDB connection is working
✅ Frontend can communicate with backend
✅ CORS is properly configured
✅ Environment variables are set
✅ First user registered successfully
✅ Tasks can be created and moved

---

## Troubleshooting

**CORS Error**: Add frontend URL to CORS whitelist in backend
**MongoDB Connection Failed**: Check connection string and IP whitelist
**API Not Found**: Verify API_URL in frontend matches backend URL
**Build Failed**: Check Node version compatibility
