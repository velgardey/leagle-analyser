export interface PDFProcessingResult {
  text: string
  pages: number
  metadata: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
  arrayBuffer: ArrayBuffer
}

export async function extractTextFromPDF(file: File): Promise<PDFProcessingResult> {
  // DEPRECATED: This function is deprecated in favor of backend processing
  // The new workflow sends PDFs to the Python app for proper text extraction
  console.warn("extractTextFromPDF is deprecated. Use /api/analyze-pdf endpoint instead.")

  try {
    const arrayBuffer = await file.arrayBuffer()
    console.log("PDF ArrayBuffer size:", arrayBuffer.byteLength)

    // Return minimal metadata for backward compatibility
    const metadata = {
      title: file.name,
      author: "Unknown",
      subject: "Contract Document",
      creator: "PDF Upload",
      producer: "Smart Contract Analyzer",
      creationDate: new Date(),
      modificationDate: new Date(),
    }

    // Return placeholder text indicating proper processing is needed
    const text = `[PDF Processing Required]
This PDF needs to be processed through the backend API endpoint /api/analyze-pdf
for proper text extraction and analysis using the Python application.
File: ${file.name}
Size: ${arrayBuffer.byteLength} bytes`

    return {
      text,
      pages: 1,
      metadata,
      arrayBuffer,
    }
  } catch (error) {
    console.error("Error processing PDF:", error)
    throw new Error("Failed to process PDF file")
  }
}

async function extractTextUsingPDFJS(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  // DEPRECATED: This function generated fake contract text
  // Real PDF text extraction is now handled by the Python backend
  console.warn("extractTextUsingPDFJS is deprecated. Use backend PDF processing instead.")

  return `[DEPRECATED FUNCTION]
This function previously generated fake contract text.
Real PDF processing is now handled by the Python backend via /api/analyze-pdf.
File: ${fileName}
Size: ${arrayBuffer.byteLength} bytes`
}

export function createPDFBlob(arrayBuffer: ArrayBuffer): string {
  try {
    const blob = new Blob([arrayBuffer], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    console.log("PDF blob created successfully:", url)
    return url
  } catch (error) {
    console.error("Error creating PDF blob:", error)
    throw new Error("Failed to create PDF blob")
  }
}

export function validatePDFFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (file.type !== "application/pdf") {
    return { isValid: false, error: "Please upload a PDF file only." }
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: "File size must be less than 10MB." }
  }

  // Check if file is not empty
  if (file.size === 0) {
    return { isValid: false, error: "File appears to be empty." }
  }

  return { isValid: true }
}
