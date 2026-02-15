@echo off
echo ================================================================
echo    Time Based Reverse Strategy - Setup Script (Windows)
echo ================================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo X Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js version:
node -v
echo [OK] npm version:
npm -v
echo.

REM Check if package.json exists
if not exist "package.json" (
    echo X package.json not found!
    echo Please run this script from the project directory.
    pause
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
call npm install

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo Setup completed successfully!
    echo ================================================================
    echo.
    echo Next Steps:
    echo 1. Start the server: npm start
    echo 2. Open dashboard: https://eausdjpyopposite.onrender.com/dashboard.html
    echo 3. Configure MT5:
    echo    - Tools -^> Options -^> Expert Advisors
    echo    - Allow WebRequest for: https://eausdjpyopposite.onrender.com
    echo 4. Attach EA to M5 chart
    echo.
    echo Ready to trade!
    echo.
) else (
    echo.
    echo X Installation failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

pause
