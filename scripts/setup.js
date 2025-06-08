#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      stdio: 'pipe', 
      encoding: 'utf8',
      ...options 
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

async function main() {
  log('🚀 Setting up Legal Contract Analyzer...', 'blue');

  // Check if Python is available
  const pythonCommands = ['python3', 'python'];
  let pythonCmd = null;
  
  for (const cmd of pythonCommands) {
    if (checkCommand(cmd)) {
      pythonCmd = cmd;
      break;
    }
  }

  if (!pythonCmd) {
    log('❌ Python is not installed. Please install Python 3.8+ and try again.', 'red');
    process.exit(1);
  }

  log('📋 Checking Python version...', 'yellow');
  const pythonVersion = runCommand(`${pythonCmd} --version`);
  if (pythonVersion.success) {
    log(`   ${pythonVersion.output}`, 'green');
  }

  // Check if .env.local exists
  if (!fs.existsSync('.env.local')) {
    log('📝 Creating .env.local from template...', 'yellow');
    fs.copyFileSync('.env.example', '.env.local');
    log('⚠️  Please edit .env.local and add your GEMINI_API_KEY', 'yellow');
  } else {
    log('✅ .env.local already exists', 'green');
  }

  // Check if GEMINI_API_KEY is set
  if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    if (envContent.includes('GEMINI_API_KEY=your_gemini_api_key_here')) {
      log('⚠️  GEMINI_API_KEY is not set in .env.local', 'yellow');
      log('   Please edit .env.local and add your actual Gemini API key', 'yellow');
    } else {
      log('✅ GEMINI_API_KEY appears to be configured', 'green');
    }
  }

  // Setup Python virtual environment
  log('🐍 Setting up Python environment...', 'yellow');
  
  const legalHelpDir = path.join(process.cwd(), 'legalHelp');
  const venvDir = path.join(legalHelpDir, 'venv');
  
  if (!fs.existsSync(venvDir)) {
    log('   Creating Python virtual environment...', 'yellow');
    const venvResult = runCommand(`${pythonCmd} -m venv venv`, { cwd: legalHelpDir });
    if (!venvResult.success) {
      log('❌ Failed to create virtual environment', 'red');
      log(venvResult.error, 'red');
      process.exit(1);
    }
  } else {
    log('✅ Virtual environment already exists', 'green');
  }

  // Determine venv python and pip paths
  const isWindows = os.platform() === 'win32';
  const venvBinDir = isWindows ? path.join(venvDir, 'Scripts') : path.join(venvDir, 'bin');
  const venvPython = isWindows ? path.join(venvBinDir, 'python.exe') : path.join(venvBinDir, 'python');
  const venvPip = isWindows ? path.join(venvBinDir, 'pip.exe') : path.join(venvBinDir, 'pip');

  // Install Python dependencies
  log('   Installing Python dependencies...', 'yellow');
  const pipResult = runCommand(`"${venvPip}" install -r requirements.txt`, { cwd: legalHelpDir });
  if (!pipResult.success) {
    log('❌ Failed to install Python dependencies', 'red');
    log(pipResult.error, 'red');
    process.exit(1);
  }

  // Test Python dependencies
  log('   Testing Python dependencies...', 'yellow');
  const testResult = runCommand(
    `"${venvPython}" -c "import google.generativeai, fitz, weasyprint; print('✅ All Python dependencies available')"`,
    { cwd: legalHelpDir }
  );
  if (!testResult.success) {
    log('❌ Python dependencies test failed', 'red');
    log(testResult.error, 'red');
    process.exit(1);
  } else {
    log(`   ${testResult.output}`, 'green');
  }

  // Test TypeScript compilation
  log('🔧 Checking TypeScript compilation...', 'yellow');
  const tscResult = runCommand('npx tsc --noEmit');
  if (!tscResult.success) {
    log('❌ TypeScript compilation failed', 'red');
    log(tscResult.error, 'red');
    process.exit(1);
  }

  log('✅ Setup complete!', 'green');
  log('📋 Summary:', 'blue');
  log('   • Python virtual environment: ✅', 'green');
  log('   • Python dependencies: ✅', 'green');
  log('   • TypeScript compilation: ✅', 'green');
  log('   • Environment file: ✅', 'green');

  if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    if (envContent.includes('GEMINI_API_KEY=your_gemini_api_key_here')) {
      log('⚠️  Don\'t forget to set your GEMINI_API_KEY in .env.local', 'yellow');
    }
  }

  log('🚀 Ready to start development server!', 'green');
}

main().catch(error => {
  log(`❌ Setup failed: ${error.message}`, 'red');
  process.exit(1);
});
