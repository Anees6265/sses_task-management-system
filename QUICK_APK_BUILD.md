# Quick APK Build Script - Capacitor Method

## Prerequisites Check
- [ ] Node.js installed (v16+)
- [ ] Android Studio installed
- [ ] Java JDK installed (v11+)

## Step-by-Step Commands

### 1. Install Capacitor
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2. Initialize Capacitor
```bash
npx cap init "Task Manager" "com.sses.taskmanager" --web-dir=dist
```

### 3. Build Frontend
```bash
npm run build
```

### 4. Add Android Platform
```bash
npx cap add android
```

### 5. Sync & Open Android Studio
```bash
npx cap sync
npx cap open android
```

### 6. Build APK in Android Studio
1. Wait for Gradle sync to complete
2. Go to: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for build to complete
4. Click "locate" to find APK

**APK Location:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Quick Commands (After First Setup)

### Update & Rebuild APK
```bash
cd frontend
npm run build
npx cap sync
npx cap open android
```
Then build APK in Android Studio

### Run on Connected Device
```bash
npx cap run android
```

---

## Configuration File

Create `capacitor.config.json` in frontend folder:

```json
{
  "appId": "com.sses.taskmanager",
  "appName": "Task Manager",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "allowMixedContent": true
  }
}
```

---

## Update Backend URL

Before building APK, update API URL in `frontend/src/services/api.jsx`:

```javascript
const API_URL = 'https://your-production-backend.com/api';
```

---

## Common Issues & Solutions

### Issue: "Android SDK not found"
**Solution:** 
- Open Android Studio
- Go to: Tools → SDK Manager
- Install Android SDK (API 33 recommended)
- Set ANDROID_HOME environment variable

### Issue: "Gradle build failed"
**Solution:**
```bash
cd android
./gradlew clean
cd ..
npx cap sync
```

### Issue: "App crashes on launch"
**Solution:**
- Check backend URL is correct
- Check internet permission in AndroidManifest.xml
- Check logs: `npx cap run android` and see logcat

---

## Share APK

### Method 1: Direct File Share
- Copy APK from: `android/app/build/outputs/apk/debug/app-debug.apk`
- Share via WhatsApp, Email, Google Drive

### Method 2: Firebase App Distribution
```bash
npm install -g firebase-tools
firebase login
firebase appdistribution:distribute android/app/build/outputs/apk/debug/app-debug.apk --app YOUR_APP_ID
```

---

## Next Steps

1. ✅ Build Debug APK (for testing)
2. ✅ Test on real device
3. ✅ Generate Signed Release APK
4. ✅ Upload to Play Store (optional)

**Happy Building! 🚀**
