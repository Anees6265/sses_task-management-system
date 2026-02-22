# App Icon Update Instructions

## Current Issue
The app icon is showing default icon because JPG files were copied instead of PNG files.

## Solution

### Option 1: Use Online Tool (Easiest)
1. Go to https://icon.kitchen/ or https://easyappicon.com/
2. Upload `src/assets/images/singaji_educational_society_logo.jpg`
3. Download the Android icon pack
4. Extract and replace files in `android/app/src/main/res/mipmap-*` folders

### Option 2: Manual Conversion
1. Convert `singaji_educational_society_logo.jpg` to PNG format (512x512px)
2. Use Android Studio:
   - Right-click on `res` folder
   - New → Image Asset
   - Select your PNG logo
   - Click Next → Finish

### Option 3: Command Line (if ImageMagick installed)
```bash
cd frontend/src/assets/images
magick singaji_educational_society_logo.jpg -resize 512x512 icon-512.png
magick singaji_educational_society_logo.jpg -resize 192x192 icon-192.png
```

Then copy to Android folders:
```bash
copy icon-192.png ..\..\..\..\android\app\src\main\res\mipmap-mdpi\ic_launcher.png
copy icon-192.png ..\..\..\..\android\app\src\main\res\mipmap-hdpi\ic_launcher.png
copy icon-512.png ..\..\..\..\android\app\src\main\res\mipmap-xhdpi\ic_launcher.png
copy icon-512.png ..\..\..\..\android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png
copy icon-512.png ..\..\..\..\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png
```

## After Icon Update
1. `npm run build`
2. `npx cap sync`
3. `npx cap open android`
4. Build → Clean Project
5. Build → Rebuild Project
6. Build → Build APK

## Navbar Fix (Already Applied)
Added safe area padding in `src/index.css` to prevent navbar from going behind mobile status bar.
