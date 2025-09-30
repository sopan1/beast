@echo off
echo 🦁 BeastBrowser Manual Build Solution
echo =========================================

echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo 🏗️ Building React app...
call npm run build

echo.
echo 📁 Creating portable version with dependencies...

REM Delete existing build if present
if exist "dist\BeastBrowser-portable" rmdir /s /q "dist\BeastBrowser-portable"

REM Create portable directory
mkdir "dist\BeastBrowser-portable"
mkdir "dist\BeastBrowser-portable\resources"
mkdir "dist\BeastBrowser-portable\resources\app"

REM Copy Electron executable
echo Copying Electron executable...
xcopy "node_modules\electron\dist\*" "dist\BeastBrowser-portable\" /E /I /H /Y

REM Copy our app files
echo Copying app files...
xcopy "dist\*" "dist\BeastBrowser-portable\resources\app\dist\" /E /I /Y
xcopy "electron\*" "dist\BeastBrowser-portable\resources\app\electron\" /E /I /Y
xcopy "public\*" "dist\BeastBrowser-portable\resources\app\public\" /E /I /Y
xcopy "useragents\*" "dist\BeastBrowser-portable\resources\app\useragents\" /E /I /Y

REM Copy essential node_modules
echo Copying essential dependencies...
mkdir "dist\BeastBrowser-portable\resources\app\node_modules"
xcopy "node_modules\electron-log\*" "dist\BeastBrowser-portable\resources\app\node_modules\electron-log\" /E /I /Y
xcopy "node_modules\http-proxy\*" "dist\BeastBrowser-portable\resources\app\node_modules\http-proxy\" /E /I /Y
xcopy "node_modules\http-proxy-agent\*" "dist\BeastBrowser-portable\resources\app\node_modules\http-proxy-agent\" /E /I /Y
xcopy "node_modules\https-proxy-agent\*" "dist\BeastBrowser-portable\resources\app\node_modules\https-proxy-agent\" /E /I /Y
xcopy "node_modules\socks\*" "dist\BeastBrowser-portable\resources\app\node_modules\socks\" /E /I /Y
xcopy "node_modules\socks-proxy-agent\*" "dist\BeastBrowser-portable\resources\app\node_modules\socks-proxy-agent\" /E /I /Y
xcopy "node_modules\node-fetch\*" "dist\BeastBrowser-portable\resources\app\node_modules\node-fetch\" /E /I /Y

REM Copy dependency of dependencies that might be needed
if exist "node_modules\agent-base" xcopy "node_modules\agent-base\*" "dist\BeastBrowser-portable\resources\app\node_modules\agent-base\" /E /I /Y
if exist "node_modules\ip" xcopy "node_modules\ip\*" "dist\BeastBrowser-portable\resources\app\node_modules\ip\" /E /I /Y
if exist "node_modules\smart-buffer" xcopy "node_modules\smart-buffer\*" "dist\BeastBrowser-portable\resources\app\node_modules\smart-buffer\" /E /I /Y
if exist "node_modules\debug" xcopy "node_modules\debug\*" "dist\BeastBrowser-portable\resources\app\node_modules\debug\" /E /I /Y
if exist "node_modules\ms" xcopy "node_modules\ms\*" "dist\BeastBrowser-portable\resources\app\node_modules\ms\" /E /I /Y

REM Copy package.json with correct structure
echo Creating package.json...
echo {"name":"beast-browser","main":"electron/main.js","version":"2.0.0"} > "dist\BeastBrowser-portable\resources\app\package.json"

REM Rename electron.exe to BeastBrowser.exe
echo Renaming executable...
ren "dist\BeastBrowser-portable\electron.exe" "BeastBrowser.exe"

echo.
echo ✅ Portable build completed! 
echo 📁 Check the 'dist\BeastBrowser-portable' folder
echo 🚀 Run 'BeastBrowser.exe' to test your app
echo 📤 Share the entire 'BeastBrowser-portable' folder for testing
echo.
pause