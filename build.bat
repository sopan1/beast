@echo off
echo 🦁 BeastBrowser Build Script
echo ========================

echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo 🏗️ Building React app...
call npm run build

echo.
echo 📱 Building Electron app...
call npm run electron-pack

echo.
echo ✅ Build completed! 
echo 📁 Check the 'dist' folder for your built app
echo.
pause