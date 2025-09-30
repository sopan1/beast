@echo off
echo 🦁 BeastBrowser Complete Build Solution
echo ========================================

echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo 🛑 Stopping any running BeastBrowser processes...
taskkill /F /IM "BeastBrowser.exe" 2>nul
taskkill /F /IM "electron.exe" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 🧹 Cleaning previous build...
if exist "dist\BeastBrowser-portable" (
    echo Removing existing build directory...
    rmdir /s /q "dist\BeastBrowser-portable" 2>nul
    timeout /t 3 /nobreak >nul
)

if exist "dist\index.html" (
    echo Cleaning previous React build...
    del /q "dist\*.*" 2>nul
    for /d %%x in ("dist\*") do rmdir /s /q "%%x" 2>nul
)

echo.
echo 🏗️ Building React app...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ React build failed! Please check the errors above.
    pause
    exit /b 1
)

echo.
echo 📁 Creating complete portable version...

REM Create portable directory structure
mkdir "dist\BeastBrowser-portable"
mkdir "dist\BeastBrowser-portable\resources"
mkdir "dist\BeastBrowser-portable\resources\app"

REM Copy Electron executable
echo Copying Electron executable...
xcopy "node_modules\electron\dist\*" "dist\BeastBrowser-portable\" /E /I /H /Y /Q

REM Copy our complete app
echo Copying application files...
xcopy "dist\index.html" "dist\BeastBrowser-portable\resources\app\dist\" /Y
xcopy "dist\assets\*" "dist\BeastBrowser-portable\resources\app\dist\assets\" /E /I /Y /Q
xcopy "electron\*" "dist\BeastBrowser-portable\resources\app\electron\" /E /I /Y /Q
xcopy "public\*" "dist\BeastBrowser-portable\resources\app\public\" /E /I /Y /Q
xcopy "useragents\*" "dist\BeastBrowser-portable\resources\app\useragents\" /E /I /Y /Q

REM Copy ALL node_modules (ensures all dependencies are included)
echo Copying all dependencies (this may take a moment)...
xcopy "node_modules\*" "dist\BeastBrowser-portable\resources\app\node_modules\" /E /I /Y /Q

REM Copy package.json
copy "package.json" "dist\BeastBrowser-portable\resources\app\package.json"

REM Rename electron.exe to BeastBrowser.exe
echo Renaming executable...
ren "dist\BeastBrowser-portable\electron.exe" "BeastBrowser.exe"

REM Copy icon file to root for better icon display
copy "public\free.png" "dist\BeastBrowser-portable\free.png"

echo.
echo ✅ Complete portable build finished! 
echo 📁 Location: 'dist\BeastBrowser-portable' 
echo 🚀 Run 'BeastBrowser.exe' to test
echo 📤 Share the entire 'BeastBrowser-portable' folder
echo 💡 This build includes ALL dependencies
echo.
echo 🔍 Build size info:
dir "dist\BeastBrowser-portable" /s /-c | find "File(s)"
echo.
pause