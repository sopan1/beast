@echo off
echo 🦁 BeastBrowser Portable Build Script
echo ===================================

echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo 🏗️ Building React app...
call npm run build

echo.
echo 📱 Building portable Electron app...
call npx electron-builder --win portable

echo.
echo ✅ Portable build completed! 
echo 📁 Check the 'dist' folder for BeastBrowser-2.0.0.exe
echo 📤 You can share this portable .exe file with others for testing
echo.
pause