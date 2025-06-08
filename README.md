# Legal Contract Analyzer

A comprehensive AI-powered legal contract analysis application that processes PDF contracts using Python-based text extraction and Google Gemini AI for intelligent analysis.

## Architecture Overview

The application follows a proper PDF processing workflow:

1. **PDF Upload** → Frontend receives PDF file
2. **Backend Processing** → PDF sent to Python app in `legalHelp` directory
3. **Text Extraction** → Python app extracts text using PyMuPDF with OCR fallback
4. **AI Analysis** → Python app analyzes contract using Gemini AI
5. **Summary Generation** → Python app generates comprehensive summary as `.txt` file
6. **Structured Data** → Backend processes summary with Gemini to create structured JSON
7. **Frontend Display** → Components display analysis results and interactive visualizations

## Quick Start

### 1. Add your Gemini API Key

Edit `.env.local` and add your API key:
```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 2. Start Development Server

```bash
pnpm dev
```

That's it! 🚀 The `pnpm dev` command will automatically:
- ✅ Set up Python virtual environment
- ✅ Install all Python dependencies
- ✅ Install Node.js dependencies
- ✅ Verify TypeScript compilation
- ✅ Start the development server

The application will be available at http://localhost:3000

## Manual Setup (if needed)

If you prefer to set up manually or the automatic setup fails:

### 1. Environment Variables
```bash
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
```

### 2. Python Environment
```bash
cd legalHelp
python -m venv venv
./venv/bin/pip install -r requirements.txt
cd ..
```

### 3. Frontend Dependencies
```bash
pnpm install
```

### 4. Start Server
```bash
pnpm dev:quick  # Skips setup checks
```

## Available Scripts

- `pnpm dev` - Full setup + start development server
- `pnpm dev:quick` - Start development server (skip setup)
- `pnpm setup` - Run setup checks only
- `pnpm build` - Build for production
- `pnpm start` - Start production server

## Testing the Workflow

1. Open http://localhost:3000 in your browser
2. Upload a PDF file through the interface
3. Or use `test-upload.html` for direct API testing

**Note**: You need a valid GEMINI_API_KEY in your `.env.local` file for AI analysis to work.

## PDF Processing Workflow

### Current Implementation

The application now properly processes PDFs through the following workflow:

1. **File Upload**: User uploads PDF through the frontend interface
2. **API Endpoint**: `/api/analyze-pdf` receives the PDF file
3. **Python Processing**: 
   - PDF saved as `temp_contract.pdf` in `legalHelp` directory
   - `new_main.py` script processes the PDF:
     - Extracts text using PyMuPDF
     - Falls back to OCR for scanned PDFs
     - Analyzes contract using Gemini AI
     - Generates comprehensive summary
   - Outputs `contract_summary.txt`
4. **Structured Analysis**: Backend processes the summary with Gemini to create structured JSON data
5. **Frontend Display**: Components render the analysis results

### Key Features

- **Real PDF Text Extraction**: Uses PyMuPDF for accurate text extraction
- **OCR Fallback**: Handles scanned PDFs using Tesseract OCR
- **AI-Powered Analysis**: Leverages Google Gemini for intelligent contract analysis
- **Risk Assessment**: Identifies and categorizes legal risks
- **Interactive Visualizations**: Timeline, risk heatmaps, party relationships
- **No Hardcoded Data**: All analysis comes from actual PDF content

## File Structure

```
├── app/
│   ├── api/
│   │   └── analyze-pdf/
│   │       └── route.ts          # Main PDF processing API endpoint
│   └── ...
├── legalHelp/
│   ├── new_main.py               # Python PDF analysis engine
│   ├── main.py                   # Legacy analysis script
│   ├── requirements.txt          # Python dependencies
│   └── ...
├── lib/
│   ├── contract-service.ts       # Frontend contract processing service
│   ├── pdf-processor.ts          # PDF utilities (deprecated functions)
│   └── ...
├── components/                   # React components for UI
└── ...
```

## Security Notes

- API keys are stored in environment variables, not hardcoded
- Temporary PDF files are cleaned up after processing
- File size limits enforced (10MB max)
- File type validation ensures only PDFs are processed

## Development Notes

- The old fake text generation has been removed
- Direct Gemini API calls from frontend are deprecated
- All PDF processing now goes through the Python backend
- Environment variables are required for API access
