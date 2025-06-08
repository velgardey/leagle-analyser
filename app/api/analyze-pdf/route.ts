import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import { spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(spawn)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Create temporary file path
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempPdfPath = join(process.cwd(), 'legalHelp', 'temp_contract.pdf')
    const outputPath = join(process.cwd(), 'legalHelp', 'contract_summary.txt')
    const jsonOutputPath = join(process.cwd(), 'legalHelp', 'contract_analysis.json')

    try {
      // Write PDF to temporary file
      await writeFile(tempPdfPath, buffer)

      // Execute Python script using virtual environment
      const legalHelpPath = join(process.cwd(), 'legalHelp')
      const isWindows = process.platform === 'win32'
      const pythonPath = isWindows
        ? join(legalHelpPath, 'venv', 'Scripts', 'python.exe')
        : join(legalHelpPath, 'venv', 'bin', 'python')

      // Set up environment variables for the virtual environment
      const env = { ...process.env }
      if (!isWindows) {
        env.PATH = `${join(legalHelpPath, 'venv', 'bin')}:${env.PATH}`
        env.VIRTUAL_ENV = join(legalHelpPath, 'venv')
        env.PYTHONPATH = join(legalHelpPath, 'venv', 'lib', 'python3.11', 'site-packages')
      } else {
        env.PATH = `${join(legalHelpPath, 'venv', 'Scripts')};${env.PATH}`
        env.VIRTUAL_ENV = join(legalHelpPath, 'venv')
      }

      const pythonProcess = spawn(pythonPath, ['comprehensive_analysis.py'], {
        cwd: legalHelpPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env
      })

      let stdout = ''
      let stderr = ''

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      // Wait for Python process to complete
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve(code)
          } else {
            reject(new Error(`Python process exited with code ${code}: ${stderr}`))
          }
        })
      })

      // Try to read the comprehensive JSON analysis first
      let structuredData
      let summaryText = ""

      try {
        const jsonData = await readFile(jsonOutputPath, 'utf-8')
        structuredData = JSON.parse(jsonData)
        console.log('[API] Successfully loaded comprehensive JSON analysis')
      } catch (jsonError) {
        console.log('[API] JSON analysis not available, falling back to text summary processing')

        // STRICT MODE: No fallback processing allowed
        console.error('[API] JSON analysis not available - failing analysis to maintain data quality')
        throw new Error('AI analysis failed to generate structured data. No fallback data will be provided to ensure analysis quality.')
      }

      // Clean up temporary files (but keep PDF for highlighting)
      // Note: Keep tempPdfPath for potential highlighting in highlight-pdf endpoint
      await unlink(outputPath).catch(() => {}) // Ignore errors
      await unlink(jsonOutputPath).catch(() => {}) // Ignore errors

      return NextResponse.json({
        success: true,
        data: structuredData,
        summary: summaryText || "Comprehensive analysis completed"
      })

    } catch (error) {
      // Clean up on error (but keep PDF for potential highlighting)
      await unlink(outputPath).catch(() => {})
      await unlink(jsonOutputPath).catch(() => {})
      throw error
    }

  } catch (error) {
    console.error('Error processing PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: 'Failed to process PDF: ' + errorMessage },
      { status: 500 }
    )
  }
}

async function processWithGemini(summaryText: string, fileName: string, fileSize: number) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  const prompt = `
You are an expert legal contract analyzer with 20+ years of experience in contract law, risk assessment, and business analysis. Your task is to extract comprehensive, accurate, and actionable information from the contract analysis summary below.

CRITICAL INSTRUCTIONS:
1. Read the ENTIRE summary carefully and extract ALL relevant information
2. Ensure all dates are in YYYY-MM-DD format
3. CRITICAL: Generate AI-calculated risk scores (20-95) based on comprehensive analysis of contract complexity, financial exposure, and business impact - NO placeholder scores
4. Extract specific dollar amounts, percentages, and quantities where mentioned
5. Identify ALL parties, not just the main contracting parties
6. Create detailed timeline events with proper categorization
7. Provide specific, actionable risk assessments
8. Extract key terms with precise definitions from the contract text

CONTRACT ANALYSIS SUMMARY:
${summaryText}

FILE METADATA:
- File Name: ${fileName}
- File Size: ${fileSize} bytes

Extract and structure this information into the following comprehensive JSON format:
{
  "contractInfo": {
    "title": "Extract exact contract title from document",
    "contractType": "e.g., Service Agreement, Purchase Order, Employment Contract",
    "effectiveDate": "YYYY-MM-DD format",
    "expirationDate": "YYYY-MM-DD format",
    "totalValue": "Extract monetary value if mentioned",
    "currency": "USD, EUR, INR, etc.",
    "parties": [
      {
        "id": "unique_identifier",
        "name": "Full legal name as stated in contract",
        "location": "Complete address if available",
        "role": "Primary role in contract (e.g., Buyer, Seller, Contractor)",
        "type": "Entity type (corporation, individual, LLC, etc.)",
        "description": "Detailed description of party's role and responsibilities",
        "contactInfo": "Email, phone, or other contact details if mentioned"
      }
    ],
    "contractTerm": {
      "initialTerm": "Duration of initial contract period",
      "renewalType": "automatic, manual, or none",
      "renewalPeriod": "Duration of renewal periods",
      "noticePeriod": "Required notice period for termination/non-renewal",
      "autoRenewal": "boolean - whether contract auto-renews"
    },
    "territory": "Geographic scope or jurisdiction",
    "exclusivity": "boolean - whether agreement is exclusive",
    "governingLaw": "Applicable law and jurisdiction"
  },
  "risks": [
    {
      "id": "sequential number starting from 1",
      "category": "Legal, Financial, Operational, Compliance, or Commercial",
      "title": "Concise risk title",
      "description": "Detailed explanation of the risk and its implications",
      "impact": "Specific business impact (e.g., financial loss, legal liability)",
      "likelihood": "High, Medium, or Low probability of occurrence",
      "riskScore": "REQUIRED: AI-generated numeric score 20-95 based on comprehensive risk analysis considering contract complexity, financial exposure, legal implications, and business impact",
      "mitigation": "Specific steps to mitigate or manage this risk",
      "clauses": ["List of relevant clause numbers or sections"],
      "recommendations": ["Actionable recommendations to address this risk"],
      "urgency": "Immediate, Short-term, or Long-term attention required"
    }
  ],
  "keyTerms": [
    {
      "id": "sequential number starting from 1",
      "term": "Extract actual term from contract",
      "definition": "Precise definition as stated in contract or legal interpretation",
      "importance": "High, Medium, or Low based on business impact",
      "clauses": ["List of clause numbers where this term appears"],
      "category": "legal, financial, technical, operational, or commercial"
    }
  ],
  "products": [
    {
      "id": "sequential number starting from 1",
      "name": "Product or service name from contract",
      "quantity": "Numeric quantity if specified",
      "unit": "Unit of measurement (pieces, hours, etc.)",
      "category": "Product category or service type"
    }
  ],
  "clauseRiskMap": [
    {
      "clause": "Clause number or identifier",
      "riskLevel": "high, medium, or low",
      "description": "Description of the risk in this clause",
      "riskScore": "Numeric score 0-100",
      "pageNumber": "Page number where clause appears",
      "position": {
        "top": 20,
        "left": 10,
        "width": 80,
        "height": 15
      }
    }
  ],
  "analytics": {
    "overallRiskScore": "Average risk score across all identified risks",
    "riskDistribution": {
      "high": "Number of high-risk items",
      "medium": "Number of medium-risk items",
      "low": "Number of low-risk items"
    },
    "completionRate": "Percentage of timeline events completed",
    "criticalDeadlines": "Number of high-priority upcoming deadlines",
    "totalClauses": "Total number of clauses analyzed",
    "riskyClauses": "Number of clauses with medium or high risk"
  },
  "timeline": [
    {
      "id": "sequential number starting from 1",
      "date": "YYYY-MM-DD format - extract actual dates from contract",
      "event": "Extract actual event name from contract",
      "type": "milestone, obligation, deadline, renewal, termination, or payment",
      "description": "Detailed description of the event/obligation",
      "completed": "Boolean: true if past date or marked complete, false otherwise",
      "priority": "high, medium, or low based on business importance",
      "responsibleParty": "Which party is responsible for this event",
      "consequences": "What happens if this deadline is missed",
      "noticeRequired": "Any advance notice requirements for this event"
    }
  ],
  "documentStructure": {
    "sections": [
      {
        "title": "Section title from contract",
        "pageStart": "Starting page number",
        "pageEnd": "Ending page number",
        "clauses": ["List of clause numbers in this section"],
        "riskLevel": "Overall risk level for this section",
        "summary": "Brief summary of section content"
      }
    ],
    "totalPages": "Total number of pages in document"
  }
}

IMPORTANT EXTRACTION GUIDELINES:
1. Extract ALL parties mentioned, including subsidiaries, guarantors, and third parties
2. Identify ALL dates in the contract and categorize them appropriately
3. Generate AI-calculated risk scores (20-95) based on comprehensive analysis of contract complexity, financial exposure, and business impact
4. Extract specific monetary amounts, percentages, and quantities where mentioned
5. Identify all products, services, and deliverables with their specifications
6. Create comprehensive timeline events with proper categorization and priority
7. Provide actionable risk assessments with specific mitigation strategies
8. Extract key terms with precise definitions from the actual contract text
9. Ensure all cross-references between sections are accurate and consistent
10. Focus on business-critical information that stakeholders need for decision-making

Return ONLY the JSON object with no additional text or formatting. Ensure all data is extracted from the provided summary text and is accurate, comprehensive, and actionable.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const analysisText = data.candidates[0].content.parts[0].text

    // Extract JSON from the response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response')
    }

    const parsedData = JSON.parse(jsonMatch[0])

    // Validate and enhance the parsed data
    return validateAndEnhanceAnalysisData(parsedData, fileName, fileSize)
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    console.log('STRICT MODE: No fallback analysis - failing to maintain data quality')
    throw new Error('AI analysis failed. No fallback data will be generated to ensure analysis quality.')
  }
}

function validateAndEnhanceAnalysisData(data: any, fileName: string, fileSize: number): any {
  console.log('STRICT VALIDATION: Ensuring all data is AI-generated with no fallbacks')

  // CRITICAL VALIDATION: Ensure all essential data is present and AI-generated
  if (!data.contractInfo) {
    throw new Error('AI analysis incomplete: Missing contract information')
  }

  if (!data.contractInfo.parties || data.contractInfo.parties.length === 0) {
    throw new Error('AI analysis incomplete: No contract parties identified')
  }

  if (!data.risks || data.risks.length === 0) {
    throw new Error('AI analysis incomplete: No risks identified in contract')
  }

  if (!data.keyTerms || data.keyTerms.length === 0) {
    throw new Error('AI analysis incomplete: No key terms identified')
  }

  // Validate that all risks have AI-generated scores
  data.risks.forEach((risk: any, index: number) => {
    if (!risk.riskScore || risk.riskScore < 20 || risk.riskScore > 95) {
      throw new Error(`AI analysis incomplete: Invalid risk score for risk ${index + 1}: ${risk.riskScore}`)
    }
  })

  // Return data as-is with minimal enhancement (no defaults that could mask missing AI data)
  const enhanced = {
    contractInfo: data.contractInfo,
    risks: data.risks,
    keyTerms: data.keyTerms,
    timeline: data.timeline || [],
    products: data.products || [],
    clauseRiskMap: data.clauseRiskMap || [],
    analytics: data.analytics || {
      overallRiskScore: 0,
      riskDistribution: { high: 0, medium: 0, low: 0 },
      completionRate: 0,
      criticalDeadlines: 0,
      totalClauses: 0,
      riskyClauses: 0
    },
    documentStructure: data.documentStructure || {
      sections: [],
      totalPages: 1
    }
  }

  // STRICT: Only add IDs to timeline events, no other defaults
  enhanced.timeline.forEach((event: any, index: number) => {
    if (!event.id) event.id = index + 1
    // Validate that timeline events have proper dates (no fallback generation)
    if (!event.date || !event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.warn(`Timeline event ${index + 1} has invalid date: ${event.date}`)
    }
  })

  // Validate risk scores - no random generation allowed
  enhanced.risks.forEach((risk: any, index: number) => {
    if (!risk.id) risk.id = index + 1
    if (!risk.riskScore || risk.riskScore < 20 || risk.riskScore > 95) {
      console.error(`Invalid risk score for risk ${risk.title || index + 1}: ${risk.riskScore}`)
      throw new Error(`All risks must have AI-generated scores between 20-95. Invalid score: ${risk.riskScore}`)
    }
  })

  return enhanced
}

// REMOVED: createEnhancedFallbackAnalysis function
// This function was removed to ensure NO hardcoded data reaches users.
// All analysis must come from AI to maintain data quality and accuracy.

// REMOVED: All fallback text extraction functions
// These functions were removed to ensure NO hardcoded or extracted data reaches users.
// All data must come from comprehensive AI analysis to maintain quality and accuracy.
