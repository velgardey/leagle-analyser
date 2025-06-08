#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Legal Contract Analyzer...${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Python is available
if ! command_exists python && ! command_exists python3; then
    echo -e "${RED}❌ Python is not installed. Please install Python 3.8+ and try again.${NC}"
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD="python"
if command_exists python3; then
    PYTHON_CMD="python3"
fi

echo -e "${YELLOW}📋 Checking Python version...${NC}"
$PYTHON_CMD --version

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}📝 Creating .env.local from template...${NC}"
    cp .env.example .env.local
    echo -e "${YELLOW}⚠️  Please edit .env.local and add your GEMINI_API_KEY${NC}"
else
    echo -e "${GREEN}✅ .env.local already exists${NC}"
fi

# Check if GEMINI_API_KEY is set
if [ -f ".env.local" ]; then
    if grep -q "GEMINI_API_KEY=your_gemini_api_key_here" .env.local; then
        echo -e "${YELLOW}⚠️  GEMINI_API_KEY is not set in .env.local${NC}"
        echo -e "${YELLOW}   Please edit .env.local and add your actual Gemini API key${NC}"
    else
        echo -e "${GREEN}✅ GEMINI_API_KEY appears to be configured${NC}"
    fi
fi

# Setup Python virtual environment
echo -e "${YELLOW}🐍 Setting up Python environment...${NC}"
cd legalHelp

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}   Creating Python virtual environment...${NC}"
    $PYTHON_CMD -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create virtual environment${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Virtual environment already exists${NC}"
fi

# Check if venv/bin/python exists (Unix) or venv/Scripts/python.exe (Windows)
if [ -f "venv/bin/python" ]; then
    VENV_PYTHON="./venv/bin/python"
    VENV_PIP="./venv/bin/pip"
elif [ -f "venv/Scripts/python.exe" ]; then
    VENV_PYTHON="./venv/Scripts/python.exe"
    VENV_PIP="./venv/Scripts/pip.exe"
else
    echo -e "${RED}❌ Virtual environment Python not found${NC}"
    exit 1
fi

# Install Python dependencies
echo -e "${YELLOW}   Installing Python dependencies...${NC}"
$VENV_PIP install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
fi

# Test Python dependencies
echo -e "${YELLOW}   Testing Python dependencies...${NC}"
$VENV_PYTHON -c "import google.generativeai, fitz, weasyprint; print('✅ All Python dependencies available')"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Python dependencies test failed${NC}"
    exit 1
fi

cd ..

# Test TypeScript compilation
echo -e "${YELLOW}🔧 Checking TypeScript compilation...${NC}"
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   • Python virtual environment: ${GREEN}✅${NC}"
echo -e "   • Python dependencies: ${GREEN}✅${NC}"
echo -e "   • TypeScript compilation: ${GREEN}✅${NC}"
echo -e "   • Environment file: ${GREEN}✅${NC}"

if grep -q "GEMINI_API_KEY=your_gemini_api_key_here" .env.local 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Don't forget to set your GEMINI_API_KEY in .env.local${NC}"
fi

echo -e "${GREEN}🚀 Ready to start development server!${NC}"
