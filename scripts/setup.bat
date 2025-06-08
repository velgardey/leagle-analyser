@echo off
setlocal enabledelayedexpansion

echo 🚀 Setting up Legal Contract Analyzer...

:: Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ and try again.
    exit /b 1
)

echo 📋 Checking Python version...
python --version

:: Check if .env.local exists
if not exist ".env.local" (
    echo 📝 Creating .env.local from template...
    copy .env.example .env.local
    echo ⚠️  Please edit .env.local and add your GEMINI_API_KEY
) else (
    echo ✅ .env.local already exists
)

:: Check if GEMINI_API_KEY is set
if exist ".env.local" (
    findstr /C:"GEMINI_API_KEY=your_gemini_api_key_here" .env.local >nul
    if !errorlevel! equ 0 (
        echo ⚠️  GEMINI_API_KEY is not set in .env.local
        echo    Please edit .env.local and add your actual Gemini API key
    ) else (
        echo ✅ GEMINI_API_KEY appears to be configured
    )
)

:: Setup Python virtual environment
echo 🐍 Setting up Python environment...
cd legalHelp

if not exist "venv" (
    echo    Creating Python virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ❌ Failed to create virtual environment
        exit /b 1
    )
) else (
    echo ✅ Virtual environment already exists
)

:: Install Python dependencies
echo    Installing Python dependencies...
venv\Scripts\pip.exe install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    exit /b 1
)

:: Test Python dependencies
echo    Testing Python dependencies...
venv\Scripts\python.exe -c "import google.generativeai, fitz, weasyprint; print('✅ All Python dependencies available')"
if %errorlevel% neq 0 (
    echo ❌ Python dependencies test failed
    exit /b 1
)

cd ..

:: Test TypeScript compilation
echo 🔧 Checking TypeScript compilation...
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ❌ TypeScript compilation failed
    exit /b 1
)

echo ✅ Setup complete!
echo 📋 Summary:
echo    • Python virtual environment: ✅
echo    • Python dependencies: ✅
echo    • TypeScript compilation: ✅
echo    • Environment file: ✅

findstr /C:"GEMINI_API_KEY=your_gemini_api_key_here" .env.local >nul 2>&1
if !errorlevel! equ 0 (
    echo ⚠️  Don't forget to set your GEMINI_API_KEY in .env.local
)

echo 🚀 Ready to start development server!
