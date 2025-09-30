@echo off
echo 🦁 BeastBrowser Safe Build (Development Version)
echo ===============================================

echo.
echo 🛑 Step 1: Close any running BeastBrowser instances
echo Please close BeastBrowser if it's running, then press any key...
pause

echo.
echo 🧹 Step 2: Force cleanup
taskkill /F /IM "BeastBrowser.exe" 2>nul
taskkill /F /IM "electron.exe" 2>nul
timeout /t 3 /nobreak >nul

echo.
echo 📦 Step 3: Installing/updating dependencies...
call npm install

echo.
echo 🧹 Step 4: Clean previous builds...
if exist "dist\BeastBrowser-portable" (
    echo Removing old portable build...
    rmdir /s /q "dist\BeastBrowser-portable"
    timeout /t 2 /nobreak >nul
)

REM Clean Vite build cache
if exist "dist\index.html" (
    del /q "dist\*.*" 2>nul
    for /d %%x in ("dist\*") do rmdir /s /q "%%x" 2>nul
)

echo.
echo 🏗️ Step 5: Building React app...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ React build failed! 
    echo 💡 Common solutions:
    echo    1. Close all BeastBrowser windows
    echo    2. Delete dist folder manually
    echo    3. Run: npm run dev (to test if code works)
    echo    4. Fix any TypeScript errors shown above
    pause
    exit /b 1
)

echo.
echo 📁 Step 6: Creating portable app...

REM Create directories
mkdir "dist\BeastBrowser-Final"
mkdir "dist\BeastBrowser-Final\resources"
mkdir "dist\BeastBrowser-Final\resources\app"

REM Copy Electron
echo Copying Electron runtime...
xcopy "node_modules\electron\dist\*" "dist\BeastBrowser-Final\" /E /I /H /Y /Q

REM Copy built React app
echo Copying React app...
xcopy "dist\index.html" "dist\BeastBrowser-Final\resources\app\dist\" /Y
if exist "dist\assets" xcopy "dist\assets\*" "dist\BeastBrowser-Final\resources\app\dist\assets\" /E /I /Y /Q

REM Copy Electron app files
echo Copying Electron files...
xcopy "electron\*" "dist\BeastBrowser-Final\resources\app\electron\" /E /I /Y /Q
xcopy "public\*" "dist\BeastBrowser-Final\resources\app\public\" /E /I /Y /Q
xcopy "useragents\*" "dist\BeastBrowser-Final\resources\app\useragents\" /E /I /Y /Q

REM Copy essential dependencies only (faster)
echo Copying essential dependencies...
mkdir "dist\BeastBrowser-Final\resources\app\node_modules"
xcopy "node_modules\electron-log\*" "dist\BeastBrowser-Final\resources\app\node_modules\electron-log\" /E /I /Y /Q
xcopy "node_modules\http-proxy\*" "dist\BeastBrowser-Final\resources\app\node_modules\http-proxy\" /E /I /Y /Q
xcopy "node_modules\socks\*" "dist\BeastBrowser-Final\resources\app\node_modules\socks\" /E /I /Y /Q
xcopy "node_modules\socks-proxy-agent\*" "dist\BeastBrowser-Final\resources\app\node_modules\socks-proxy-agent\" /E /I /Y /Q

REM Copy package.json
echo {"name":"beast-browser","main":"electron/main.js","version":"2.0.0"} > "dist\BeastBrowser-Final\resources\app\package.json"

REM Rename executable
ren "dist\BeastBrowser-Final\electron.exe" "BeastBrowser.exe"

echo.
echo ✅ Safe build completed successfully! 
echo 📁 Location: 'dist\BeastBrowser-Final\'
echo 🚀 Test: Run 'dist\BeastBrowser-Final\BeastBrowser.exe'
echo.
echo 💡 If app opens but shows blank screen:
echo    1. Check browser dev tools (F12)
echo    2. Look for console errors
echo    3. Verify dist/index.html was created properly
echo.
pause