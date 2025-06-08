import { createPDFBlob, validatePDFFile } from "./pdf-processor"

export interface ContractData {
  contractInfo: {
    title: string
    contractType?: string
    effectiveDate?: string
    expirationDate?: string
    totalValue?: number
    currency?: string
    governingLaw?: string
    parties: Array<{
      id: string
      name: string
      legalName?: string
      location: string
      address?: {
        street?: string
        city?: string
        country?: string
        postalCode?: string
      }
      role: string
      type: string
      entityType?: string
      description: string
      contactInfo?: string
    }>
    contractTerm: {
      initialTerm: string
      renewalType: string
      renewalPeriod: string
      noticePeriod: string
      autoRenewal?: boolean
    }
    territory: string
    exclusivity: boolean
    financialTerms?: {
      paymentTerms?: string
      currency?: string
      totalValue?: number
      paymentSchedule?: string
      penalties?: {
        latePayment?: string
        breach?: string
      }
    }
  }
  relationships: Array<{
    from: string
    to: string
    type: string
    description: string
    strength: string
  }>
  timeline: Array<{
    id: number
    date: string
    event: string
    type: string
    description: string
    completed: boolean
    priority: string
    responsibleParty?: string
    consequences?: string
    noticeRequired?: boolean
    noticeDeadline?: string
  }>
  risks: Array<{
    id: number
    category: string
    title: string
    description: string
    impact: string
    likelihood: string
    riskScore: number
    mitigation: string
    clauses: string[]
    recommendations: string[]
  }>
  keyTerms: Array<{
    id: number
    term: string
    definition: string
    importance: string
    clauses: string[]
    category: string
  }>
  products: Array<{
    id: number
    name: string
    quantity: number
    unit: string
    category: string
    pricing?: {
      unitPrice?: number
      currency?: string
      totalPrice?: number
    }
    specifications?: string
    deliveryTerms?: string
  }>
  clauseRiskMap: Array<{
    clause: string
    riskLevel: string
    description: string
    riskScore: number
    pageNumber: number
    position: {
      top: number
      left: number
      width: number
      height: number
    }
  }>
  analytics: {
    overallRiskScore: number
    riskDistribution: {
      high: number
      medium: number
      low: number
    }
    completionRate: number
    criticalDeadlines: number
    totalClauses: number
    riskyClauses: number
  }
  documentStructure: {
    sections: Array<{
      title: string
      pageStart: number
      pageEnd: number
      clauses: string[]
      riskLevel: string
      summary: string
    }>
    totalPages: number
  }
  // Additional metadata
  pdfBlob?: string          // Highlighted PDF blob (preferred for viewing)
  originalPdfBlob?: string  // Original PDF blob (backup)
  hasHighlightedVersion?: boolean // Whether highlighting was successful
  fileName?: string
  fileSize?: number
  analysisDate?: string
  extractedText?: string
  // Backward compatibility
  parties?: Array<{
    id: string
    name: string
    legalName?: string
    location: string
    address?: {
      street?: string
      city?: string
      country?: string
      postalCode?: string
    }
    role: string
    type: string
    entityType?: string
    description: string
    contactInfo?: string
  }>
}

// Store for the current contract data
let currentContractData: ContractData | null = null

export async function analyzeContract(file: File): Promise<ContractData> {
  try {
    console.log("Starting contract analysis for:", file.name)

    // Validate file first
    const validation = validatePDFFile(file)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }

    // Create blob URL for PDF viewing
    console.log("Creating PDF blob...")
    const arrayBuffer = await file.arrayBuffer()
    const pdfBlob = createPDFBlob(arrayBuffer)
    console.log("PDF blob created:", pdfBlob)

    // Send PDF to backend for processing
    console.log("Sending PDF to backend for analysis...")
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/analyze-pdf', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to analyze PDF')
    }

    const result = await response.json()
    console.log("Backend analysis completed")

    // Generate highlighted PDF
    console.log("Generating highlighted PDF...")
    let highlightedPdfBlob = null // Don't fallback to original PDF
    let hasHighlightedVersion = false

    try {
      // Create FormData to send both contract data and PDF file
      const formData = new FormData()
      formData.append('contractData', JSON.stringify(result.data))
      formData.append('originalFileName', file.name)
      formData.append('pdfFile', file) // Send the original file

      const highlightResponse = await fetch('/api/highlight-pdf', {
        method: 'POST',
        body: formData // Use FormData instead of JSON
      })

      if (highlightResponse.ok) {
        const highlightedPdfBuffer = await highlightResponse.arrayBuffer()
        highlightedPdfBlob = createPDFBlob(highlightedPdfBuffer)
        hasHighlightedVersion = true
        console.log("Highlighted PDF generated successfully:", highlightedPdfBlob)
      } else {
        const errorData = await highlightResponse.json()
        console.warn("Failed to generate highlighted PDF:", errorData.error)
      }
    } catch (highlightError) {
      console.warn("Error generating highlighted PDF:", highlightError)
    }

    // Enhance the result with additional metadata
    const contractData: ContractData = {
      ...result.data,
      pdfBlob: highlightedPdfBlob || pdfBlob, // Use highlighted PDF if available, otherwise original
      originalPdfBlob: pdfBlob,               // Always keep original PDF
      hasHighlightedVersion,                  // Track if highlighting was successful
      fileName: file.name,
      fileSize: file.size,
      analysisDate: new Date().toISOString(),
      extractedText: result.summary,
      // Ensure backward compatibility
      parties: result.data.contractInfo.parties,
    }

    // Validate the analysis result
    validateAnalysisResult(contractData)

    // Store the data
    currentContractData = contractData
    console.log("Contract analysis completed successfully")

    return contractData
  } catch (error) {
    console.error("Error analyzing contract:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    throw new Error(`Failed to analyze contract: ${errorMessage}`)
  }
}

function validateAnalysisResult(data: ContractData): void {
  // Ensure required fields exist
  if (!data.contractInfo || !data.contractInfo.parties || data.contractInfo.parties.length === 0) {
    console.warn("No parties found, adding default parties")
    data.contractInfo = data.contractInfo || {
      title: "Contract",
      parties: [],
      contractTerm: { initialTerm: "1 year", renewalType: "manual", renewalPeriod: "1 year", noticePeriod: "30 days" },
      territory: "Global",
      exclusivity: false,
    }
    data.contractInfo.parties = [
      {
        id: "party_1",
        name: "Party A",
        location: "TBD",
        role: "Contractor",
        type: "supplier",
        description: "Primary party",
      },
      {
        id: "party_2",
        name: "Party B",
        location: "TBD",
        role: "Client",
        type: "buyer",
        description: "Secondary party",
      },
    ]
  }

  // NO FALLBACK DATA - Fail if risks are missing
  if (!data.risks || data.risks.length === 0) {
    console.error("No risks found - analysis failed")
    throw new Error("Contract analysis failed: No risk assessment available")
  }

  // NO FALLBACK DATA - Fail if timeline is missing
  if (!data.timeline || data.timeline.length === 0) {
    console.error("No timeline found - analysis failed")
    throw new Error("Contract analysis failed: No timeline data available")
  }

  // NO FALLBACK DATA - Fail if key terms are missing
  if (!data.keyTerms || data.keyTerms.length === 0) {
    console.error("No key terms found - analysis failed")
    throw new Error("Contract analysis failed: No key terms available")
  }

  // NO FALLBACK DATA - Fail if products are missing
  if (!data.products || data.products.length === 0) {
    console.error("No products found - analysis failed")
    throw new Error("Contract analysis failed: No product information available")
  }

  // NO FALLBACK DATA - Fail if clause risk map is missing
  if (!data.clauseRiskMap || data.clauseRiskMap.length === 0) {
    console.error("No clause risk map found - analysis failed")
    throw new Error("Contract analysis failed: No clause risk mapping available")
  }

  // NO FALLBACK DATA - Fail if analytics are missing
  if (!data.analytics) {
    console.error("No analytics found - analysis failed")
    throw new Error("Contract analysis failed: No analytics data available")
  }

  // NO FALLBACK DATA - Fail if document structure is missing
  if (!data.documentStructure) {
    console.error("No document structure found - analysis failed")
    throw new Error("Contract analysis failed: No document structure available")
  }

  // Update analytics based on actual data
  const highRisks = data.risks.filter((r) => r.category.toLowerCase() === "high").length
  const mediumRisks = data.risks.filter((r) => r.category.toLowerCase() === "medium").length
  const lowRisks = data.risks.filter((r) => r.category.toLowerCase() === "low").length

  data.analytics.riskDistribution = { high: highRisks, medium: mediumRisks, low: lowRisks }
  data.analytics.overallRiskScore =
    data.risks.reduce((sum, risk) => sum + risk.riskScore, 0) / Math.max(data.risks.length, 1)
  data.analytics.totalClauses = data.clauseRiskMap.length
  data.analytics.riskyClauses = data.clauseRiskMap.filter(
    (c) => c.riskLevel === "high" || c.riskLevel === "medium",
  ).length

  const completedEvents = data.timeline.filter((t) => t.completed).length
  data.analytics.completionRate = Math.round((completedEvents / Math.max(data.timeline.length, 1)) * 100)
  data.analytics.criticalDeadlines = data.timeline.filter((t) => t.priority && t.priority === "high" && !t.completed).length
}

export function getContractData(): ContractData | null {
  return currentContractData
}

export function clearContractData(): void {
  currentContractData = null
  console.log("Contract data cleared")
}

// Helper functions for data processing
export function calculateRiskMetrics(risks: ContractData["risks"]) {
  if (!risks || risks.length === 0) {
    return {
      total: 0,
      distribution: { high: 0, medium: 0, low: 0 },
      averageScore: 0,
    }
  }

  const total = risks.length
  const high = risks.filter((r) => r.category.toLowerCase() === "high").length
  const medium = risks.filter((r) => r.category.toLowerCase() === "medium").length
  const low = risks.filter((r) => r.category.toLowerCase() === "low").length

  const averageScore = risks.reduce((sum, risk) => sum + (risk.riskScore || 0), 0) / total

  return {
    total,
    distribution: { high, medium, low },
    averageScore: Math.round(averageScore),
  }
}

export function getTimelineMetrics(timeline: ContractData["timeline"]) {
  if (!timeline || timeline.length === 0) {
    return {
      total: 0,
      completed: 0,
      overdue: 0,
      upcoming: 0,
      completionRate: 0,
    }
  }

  const total = timeline.length
  const completed = timeline.filter((t) => t.completed).length
  const overdue = timeline.filter((t) => !t.completed && new Date(t.date) < new Date()).length
  const upcoming = timeline.filter((t) => !t.completed && new Date(t.date) >= new Date()).length

  return {
    total,
    completed,
    overdue,
    upcoming,
    completionRate: Math.round((completed / total) * 100),
  }
}

export function getKeyTermsByCategory(keyTerms: ContractData["keyTerms"]) {
  if (!keyTerms || keyTerms.length === 0) {
    return {}
  }

  return keyTerms.reduce(
    (acc, term) => {
      if (!acc[term.category]) {
        acc[term.category] = []
      }
      acc[term.category].push(term)
      return acc
    },
    {} as Record<string, ContractData["keyTerms"]>,
  )
}
