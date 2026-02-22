# Backend Deployment Steps

## Changes Made:
1. Added OTP login functionality
2. Added @ssism.org email validation
3. New routes: `/auth/send-otp` and `/auth/verify-otp`

## Deploy to Render:

### Option 1: Auto Deploy (if connected to GitHub)
1. Commit and push changes to GitHub:
   ```bash
   cd backend
   git add .
   git commit -m "Add OTP login and email validation"
   git push origin main
   ```
2. Render will auto-deploy

### Option 2: Manual Deploy
1. Go to Render Dashboard
2. Select your backend service
3. Click "Manual Deploy" → "Deploy latest commit"

## Test Locally First:
```bash
cd backend
npm run dev
```

Then test OTP endpoint:
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ssism.org"}'
```

## Environment Variables Required:
- EMAIL_USER=aneeskhan@ssism.org
- EMAIL_PASS=bvrdrxsylujvfymt
- (Already set in .env)
