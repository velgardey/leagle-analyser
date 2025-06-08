import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { join } from 'path'
import { readFile, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    let contractData: any
    let originalFileName: string
    let pdfFile: File | null = null

    // Handle both FormData and JSON requests
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with PDF file)
      const formData = await request.formData()
      const contractDataStr = formData.get('contractData') as string
      originalFileName = formData.get('originalFileName') as string || 'contract.pdf'
      pdfFile = formData.get('pdfFile') as File

      if (!contractDataStr) {
        return NextResponse.json({ error: 'No contract data provided' }, { status: 400 })
      }

      contractData = JSON.parse(contractDataStr)
    } else {
      // Handle JSON request (fallback to temp file)
      const body = await request.json()
      contractData = body.contractData
      originalFileName = body.originalFileName || 'contract.pdf'

      if (!contractData) {
        return NextResponse.json({ error: 'No contract data provided' }, { status: 400 })
      }
    }

    const legalHelpPath = join(process.cwd(), 'legalHelp')
    const inputPdfPath = join(legalHelpPath, 'temp_contract.pdf')
    const analysisJsonPath = join(legalHelpPath, 'temp_analysis.json')
    const outputPdfPath = join(legalHelpPath, 'highlighted_contract.pdf')

    // Handle PDF file
    if (pdfFile) {
      // Write the uploaded PDF file to temp location
      const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
      await writeFile(inputPdfPath, pdfBuffer)
    } else {
      // Check if temp PDF exists from previous analysis
      if (!existsSync(inputPdfPath)) {
        return NextResponse.json({ error: 'Original PDF not found' }, { status: 404 })
      }
    }

    try {
      // Write contract data to temporary JSON file
      await writeFile(analysisJsonPath, JSON.stringify(contractData, null, 2), 'utf-8')

      // Set up Python environment
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

      // Execute PDF highlighter script
      const pythonProcess = spawn(pythonPath, [
        'pdf_highlighter.py',
        inputPdfPath,
        analysisJsonPath,
        outputPdfPath
      ], {
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

      // Wait for process to complete
      const exitCode = await new Promise<number>((resolve) => {
        pythonProcess.on('close', resolve)
      })

      console.log('PDF Highlighter stdout:', stdout)
      if (stderr) {
        console.log('PDF Highlighter stderr:', stderr)
      }

      if (exitCode !== 0) {
        throw new Error(`PDF highlighter process exited with code ${exitCode}: ${stderr}`)
      }

      // Check if highlighted PDF was created
      if (!existsSync(outputPdfPath)) {
        throw new Error('Highlighted PDF was not created')
      }

      // Read the highlighted PDF
      const highlightedPdfBuffer = await readFile(outputPdfPath)

      // Clean up temporary files
      try {
        await unlink(analysisJsonPath)
        // Keep the highlighted PDF for potential future use
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary files:', cleanupError)
      }

      // Return the highlighted PDF
      return new NextResponse(highlightedPdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="highlighted_${originalFileName || 'contract.pdf'}"`,
          'Content-Length': highlightedPdfBuffer.length.toString(),
        },
      })

    } catch (processError) {
      console.error('Error in PDF highlighting process:', processError)
      return NextResponse.json(
        { 
          error: 'Failed to highlight PDF',
          details: processError instanceof Error ? processError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in highlight-pdf API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Alternative endpoint for getting highlighted PDF as blob URL
export async function GET(request: NextRequest) {
  try {
    const legalHelpPath = join(process.cwd(), 'legalHelp')
    const highlightedPdfPath = join(legalHelpPath, 'highlighted_contract.pdf')

    // Check if highlighted PDF exists
    if (!existsSync(highlightedPdfPath)) {
      return NextResponse.json({ error: 'Highlighted PDF not found' }, { status: 404 })
    }

    // Read the highlighted PDF
    const pdfBuffer = await readFile(highlightedPdfPath)

    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })

  } catch (error) {
    console.error('Error serving highlighted PDF:', error)
    return NextResponse.json(
      { 
        error: 'Failed to serve highlighted PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
