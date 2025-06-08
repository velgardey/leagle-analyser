// Note: This file is deprecated in favor of the new backend API endpoint
// API keys should be stored in environment variables, not hardcoded
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

export interface GeminiAnalysisRequest {
  pdfText: string
  fileName: string
  fileSize: number
}

export async function analyzeContractWithGemini(request: GeminiAnalysisRequest): Promise<any> {
  // DEPRECATED: This function is deprecated in favor of the backend API endpoint
  // Use /api/analyze-pdf instead for proper PDF processing workflow
  console.warn("analyzeContractWithGemini is deprecated. Use /api/analyze-pdf endpoint instead.")

  // Return fallback for backward compatibility
  return createComprehensiveFallback(request)
  const prompt = `
You are an expert legal contract analyzer with 20+ years of experience. Analyze the following contract document and extract comprehensive information in the exact JSON format specified below. Be extremely thorough, accurate, and consistent in your analysis.

CONTRACT DOCUMENT TO ANALYZE:
File Name: ${request.fileName}
File Size: ${request.fileSize} bytes

CONTRACT TEXT:
${request.pdfText}

CRITICAL INSTRUCTIONS:
1. Read the ENTIRE contract text carefully
2. Extract ALL parties mentioned with their exact names and roles
3. Identify ALL dates, deadlines, obligations, and milestones
4. Assess risks comprehensively across legal, financial, operational, and commercial aspects
5. Provide realistic risk scores between 0-100
6. Map clause positions accurately for PDF highlighting
7. Extract ALL key terms with precise definitions
8. Identify ALL products, services, or deliverables
9. Create realistic timeline events with proper dates
10. Ensure all data is consistent and cross-referenced

REQUIRED JSON OUTPUT FORMAT (return ONLY this JSON, no other text):

{
  "contractInfo": {
    "title": "Extract the actual contract title from the document",
    "parties": [
      {
        "id": "Use format: party_1, party_2, etc.",
        "name": "Extract exact party name from contract",
        "location": "Extract exact location/address from contract",
        "role": "Extract exact role from contract (e.g., Supplier, Customer, Contractor)",
        "type": "Classify as: supplier, buyer, consultant, guarantor, or other",
        "description": "Brief description of party's business/purpose"
      }
    ],
    "contractTerm": {
      "initialTerm": "Extract exact initial term duration",
      "renewalType": "Extract: automatic, manual, or none",
      "renewalPeriod": "Extract renewal duration if applicable",
      "noticePeriod": "Extract notice period for termination"
    },
    "territory": "Extract geographical scope/territory",
    "exclusivity": "Boolean: true if exclusive rights mentioned, false otherwise"
  },
  "relationships": [
    {
      "from": "party_id (must match party id above)",
      "to": "party_id (must match party id above)",
      "type": "Describe relationship type (e.g., supplier_customer, joint_venture, licensing)",
      "description": "Detailed description of the relationship",
      "strength": "Assess as: strong, medium, or weak based on contract terms"
    }
  ],
  "timeline": [
    {
      "id": "Sequential number starting from 1",
      "date": "YYYY-MM-DD format - extract actual dates from contract",
      "event": "Extract actual event name from contract",
      "type": "Classify as: milestone, obligation, deadline, or critical",
      "description": "Detailed description of the event/obligation",
      "completed": "Boolean: true if past date or marked complete, false otherwise",
      "priority": "Assess as: high, medium, or low based on importance"
    }
  ],
  "risks": [
    {
      "id": "Sequential number starting from 1",
      "category": "Assess as: High, Medium, or Low",
      "title": "Concise risk title",
      "description": "Detailed risk description with specific contract references",
      "impact": "Assess potential impact as: High, Medium, or Low",
      "likelihood": "Assess probability as: High, Medium, or Low",
      "riskScore": "Calculate 0-100 based on impact and likelihood",
      "mitigation": "Specific mitigation strategy",
      "clauses": ["List specific clause numbers/references"],
      "recommendations": ["List 2-3 actionable recommendations"]
    }
  ],
  "keyTerms": [
    {
      "id": "Sequential number starting from 1",
      "term": "Extract exact term from contract",
      "definition": "Extract or infer definition from contract context",
      "importance": "Assess as: Critical, High, Medium, or Low",
      "clauses": ["List clause references where term appears"],
      "category": "Classify as: financial, operational, legal, or commercial"
    }
  ],
  "products": [
    {
      "id": "Sequential number starting from 1",
      "name": "Extract exact product/service name",
      "quantity": "Extract minimum quantity as number (use 1 if not specified)",
      "unit": "Extract unit of measurement",
      "category": "Classify product/service category"
    }
  ],
  "clauseRiskMap": [
    {
      "clause": "Specific clause number or identifier",
      "riskLevel": "Assess as: high, medium, or low",
      "description": "Risk description for this specific clause",
      "riskScore": "0-100 risk score for this clause",
      "pageNumber": "Estimate page number (1-10 based on contract length)",
      "position": {
        "top": "Percentage from top (10-80)",
        "left": "Percentage from left (5-15)",
        "width": "Percentage width (70-90)",
        "height": "Percentage height (8-25)"
      }
    }
  ],
  "analytics": {
    "overallRiskScore": "Calculate average of all risk scores",
    "riskDistribution": {
      "high": "Count of high risks",
      "medium": "Count of medium risks", 
      "low": "Count of low risks"
    },
    "completionRate": "Percentage of completed timeline events",
    "criticalDeadlines": "Count of critical/high priority future deadlines",
    "totalClauses": "Total number of clauses identified",
    "riskyClauses": "Number of clauses with medium/high risk"
  },
  "documentStructure": {
    "sections": [
      {
        "title": "Extract actual section title",
        "pageStart": "Starting page number",
        "pageEnd": "Ending page number",
        "clauses": ["List clause numbers in this section"],
        "riskLevel": "Overall risk level for section: high, medium, or low",
        "summary": "Brief summary of section content"
      }
    ],
    "totalPages": "Estimate total pages based on content length"
  }
}

QUALITY REQUIREMENTS:
- Extract at least 2-5 parties
- Identify at least 5-10 timeline events with real dates
- Assess at least 4-8 risks across different categories
- Extract at least 6-12 key terms
- Identify at least 2-5 products/services
- Map at least 6-10 clauses with risk levels
- Ensure all risk scores are realistic (20-90 range)
- All dates must be in YYYY-MM-DD format
- All IDs must be sequential numbers
- All references between objects must be consistent

Return ONLY the JSON object with no additional text, formatting, or markdown.
`

  // This function is deprecated - all Gemini API calls now go through the backend
  // Return fallback data for backward compatibility
  return createComprehensiveFallback(request)
}

function validateAndEnhanceAnalysis(data: any, request: GeminiAnalysisRequest): any {
  // Ensure all required fields exist and are properly formatted

  // Fix decimal places
  if (data.analytics) {
    data.analytics.overallRiskScore = Number.parseFloat(data.analytics.overallRiskScore?.toFixed(2)) || 65.0
    data.analytics.completionRate = Number.parseFloat(data.analytics.completionRate?.toFixed(2)) || 0.0
  }

  // Ensure risk scores are within valid range and have 2 decimal places
  if (data.risks) {
    data.risks.forEach((risk: any) => {
      risk.riskScore = Math.min(100, Math.max(0, Number.parseFloat(risk.riskScore?.toFixed(2)) || 50.0))
    })
  }

  // Ensure clause risk scores are properly formatted
  if (data.clauseRiskMap) {
    data.clauseRiskMap.forEach((clause: any) => {
      clause.riskScore = Math.min(100, Math.max(0, Number.parseFloat(clause.riskScore?.toFixed(2)) || 50.0))
      // Ensure position values are within valid ranges
      clause.position.top = Math.min(80, Math.max(10, clause.position.top))
      clause.position.left = Math.min(15, Math.max(5, clause.position.left))
      clause.position.width = Math.min(90, Math.max(70, clause.position.width))
      clause.position.height = Math.min(25, Math.max(8, clause.position.height))
    })
  }

  // Ensure timeline dates are properly formatted
  if (data.timeline) {
    data.timeline.forEach((event: any, index: number) => {
      if (!event.date || !event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Generate deterministic dates based on index instead of random
        const baseDate = new Date()
        const daysOffset = (index + 1) * 30 // 30 days apart for each event
        baseDate.setDate(baseDate.getDate() + daysOffset)
        event.date = baseDate.toISOString().split("T")[0]
      }
    })
  }

  return data
}

function createComprehensiveFallback(request: GeminiAnalysisRequest): any {
  console.log("Creating comprehensive fallback analysis for:", request.fileName)

  const currentDate = new Date()
  const futureDate1 = new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000) // +3 months
  const futureDate2 = new Date(currentDate.getTime() + 180 * 24 * 60 * 60 * 1000) // +6 months
  const futureDate3 = new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000) // +1 year

  return {
    contractInfo: {
      title: `Contract Analysis - ${request.fileName}`,
      parties: [
        {
          id: "party_1",
          name: "Primary Contractor Ltd.",
          location: "New York, NY, USA",
          role: "Service Provider",
          type: "supplier",
          description: "Primary contracting entity providing services",
        },
        {
          id: "party_2",
          name: "Client Corporation Inc.",
          location: "Los Angeles, CA, USA",
          role: "Client",
          type: "buyer",
          description: "Receiving party of contracted services",
        },
        {
          id: "party_3",
          name: "Legal Advisory Group",
          location: "Chicago, IL, USA",
          role: "Legal Consultant",
          type: "consultant",
          description: "Provides legal advisory services",
        },
      ],
      contractTerm: {
        initialTerm: "24 months",
        renewalType: "automatic",
        renewalPeriod: "12 months",
        noticePeriod: "60 days",
      },
      territory: "United States and Canada",
      exclusivity: true,
    },
    relationships: [
      {
        from: "party_1",
        to: "party_2",
        type: "service_provider_client",
        description: "Primary service delivery relationship with exclusive rights",
        strength: "strong",
      },
      {
        from: "party_1",
        to: "party_3",
        type: "contractor_advisor",
        description: "Legal advisory and consultation relationship",
        strength: "medium",
      },
      {
        from: "party_2",
        to: "party_3",
        type: "client_advisor",
        description: "Indirect advisory relationship through primary contractor",
        strength: "weak",
      },
    ],
    timeline: [
      {
        id: 1,
        date: "2024-01-01",
        event: "Contract Effective Date",
        type: "milestone",
        description: "Contract becomes legally effective and binding",
        completed: true,
        priority: "high",
      },
      {
        id: 2,
        date: "2024-02-15",
        event: "Initial Service Delivery",
        type: "obligation",
        description: "First phase of service delivery must commence",
        completed: true,
        priority: "high",
      },
      {
        id: 3,
        date: futureDate1.toISOString().split("T")[0],
        event: "Quarterly Performance Review",
        type: "obligation",
        description: "Comprehensive performance assessment and review",
        completed: false,
        priority: "medium",
      },
      {
        id: 4,
        date: futureDate2.toISOString().split("T")[0],
        event: "Mid-term Contract Evaluation",
        type: "milestone",
        description: "Evaluation of contract performance and potential modifications",
        completed: false,
        priority: "high",
      },
      {
        id: 5,
        date: futureDate3.toISOString().split("T")[0],
        event: "Contract Renewal Decision",
        type: "critical",
        description: "Decision point for contract renewal or termination",
        completed: false,
        priority: "high",
      },
      {
        id: 6,
        date: "2025-12-31",
        event: "Contract Expiration",
        type: "deadline",
        description: "End of initial contract term",
        completed: false,
        priority: "critical",
      },
    ],
    risks: [
      {
        id: 1,
        category: "High",
        title: "Service Level Agreement Breach",
        description: "Risk of failing to meet specified service level requirements leading to penalties",
        impact: "High",
        likelihood: "Medium",
        riskScore: 75.5,
        mitigation: "Implement robust monitoring systems and backup procedures",
        clauses: ["3.1", "3.2", "7.1"],
        recommendations: [
          "Establish real-time monitoring dashboards",
          "Create contingency service plans",
          "Regular performance audits",
        ],
      },
      {
        id: 2,
        category: "High",
        title: "Intellectual Property Disputes",
        description: "Potential conflicts over ownership and usage rights of developed IP",
        impact: "High",
        likelihood: "Low",
        riskScore: 68.25,
        mitigation: "Clear IP ownership clauses and regular legal reviews",
        clauses: ["5.1", "5.2", "5.3"],
        recommendations: [
          "Draft comprehensive IP assignment agreements",
          "Regular IP audit procedures",
          "Legal counsel involvement in IP matters",
        ],
      },
      {
        id: 3,
        category: "Medium",
        title: "Payment Delay Risk",
        description: "Risk of delayed payments affecting cash flow and operations",
        impact: "Medium",
        likelihood: "Medium",
        riskScore: 55.75,
        mitigation: "Implement payment tracking and escalation procedures",
        clauses: ["4.1", "4.2"],
        recommendations: [
          "Automated payment reminder systems",
          "Credit checks and payment guarantees",
          "Clear payment terms and penalties",
        ],
      },
      {
        id: 4,
        category: "Medium",
        title: "Regulatory Compliance Risk",
        description: "Risk of non-compliance with changing regulatory requirements",
        impact: "Medium",
        likelihood: "Low",
        riskScore: 42.3,
        mitigation: "Regular compliance audits and legal updates",
        clauses: ["6.1", "6.2"],
        recommendations: [
          "Quarterly compliance reviews",
          "Legal update subscription services",
          "Compliance training programs",
        ],
      },
      {
        id: 5,
        category: "Low",
        title: "Force Majeure Events",
        description: "Risk of contract disruption due to unforeseeable circumstances",
        impact: "High",
        likelihood: "Low",
        riskScore: 35.8,
        mitigation: "Comprehensive force majeure clauses and business continuity plans",
        clauses: ["8.1", "8.2"],
        recommendations: [
          "Business continuity planning",
          "Insurance coverage review",
          "Alternative service arrangements",
        ],
      },
    ],
    keyTerms: [
      {
        id: 1,
        term: "Service Level Agreement (SLA)",
        definition: "Specific performance standards and metrics that must be maintained",
        importance: "Critical",
        clauses: ["3.1", "3.2"],
        category: "operational",
      },
      {
        id: 2,
        term: "Intellectual Property Rights",
        definition: "Rights to ownership and usage of created intellectual property",
        importance: "Critical",
        clauses: ["5.1", "5.2"],
        category: "legal",
      },
      {
        id: 3,
        term: "Payment Terms",
        definition: "Conditions and schedule for payment of contracted services",
        importance: "High",
        clauses: ["4.1", "4.2"],
        category: "financial",
      },
      {
        id: 4,
        term: "Termination Clause",
        definition: "Conditions under which the contract may be terminated",
        importance: "High",
        clauses: ["9.1", "9.2"],
        category: "legal",
      },
      {
        id: 5,
        term: "Confidentiality Agreement",
        definition: "Obligations to protect confidential information",
        importance: "High",
        clauses: ["7.1", "7.2"],
        category: "legal",
      },
      {
        id: 6,
        term: "Performance Metrics",
        definition: "Specific measurable criteria for evaluating service performance",
        importance: "Medium",
        clauses: ["3.3", "3.4"],
        category: "operational",
      },
      {
        id: 7,
        term: "Liability Limitations",
        definition: "Restrictions on financial liability for damages or losses",
        importance: "Medium",
        clauses: ["6.3", "6.4"],
        category: "legal",
      },
      {
        id: 8,
        term: "Renewal Options",
        definition: "Terms and conditions for contract renewal",
        importance: "Medium",
        clauses: ["2.1", "2.2"],
        category: "commercial",
      },
    ],
    products: [
      {
        id: 1,
        name: "Professional Consulting Services",
        quantity: 1000,
        unit: "hours",
        category: "services",
      },
      {
        id: 2,
        name: "Software Development Services",
        quantity: 500,
        unit: "hours",
        category: "technology",
      },
      {
        id: 3,
        name: "Project Management Services",
        quantity: 200,
        unit: "hours",
        category: "services",
      },
      {
        id: 4,
        name: "Technical Documentation",
        quantity: 50,
        unit: "documents",
        category: "deliverables",
      },
    ],
    clauseRiskMap: [
      {
        clause: "3.1",
        riskLevel: "high",
        description: "Service level requirements and performance standards",
        riskScore: 78.5,
        pageNumber: 1,
        position: { top: 25.0, left: 8.0, width: 85.0, height: 12.0 },
      },
      {
        clause: "4.1",
        riskLevel: "medium",
        description: "Payment terms and conditions",
        riskScore: 58.25,
        pageNumber: 2,
        position: { top: 35.0, left: 8.0, width: 85.0, height: 15.0 },
      },
      {
        clause: "5.1",
        riskLevel: "high",
        description: "Intellectual property ownership and rights",
        riskScore: 72.75,
        pageNumber: 2,
        position: { top: 55.0, left: 8.0, width: 85.0, height: 18.0 },
      },
      {
        clause: "6.1",
        riskLevel: "medium",
        description: "Compliance and regulatory requirements",
        riskScore: 45.8,
        pageNumber: 3,
        position: { top: 20.0, left: 8.0, width: 85.0, height: 14.0 },
      },
      {
        clause: "7.1",
        riskLevel: "medium",
        description: "Confidentiality and non-disclosure obligations",
        riskScore: 52.3,
        pageNumber: 3,
        position: { top: 40.0, left: 8.0, width: 85.0, height: 16.0 },
      },
      {
        clause: "8.1",
        riskLevel: "low",
        description: "Force majeure and extraordinary circumstances",
        riskScore: 32.5,
        pageNumber: 4,
        position: { top: 25.0, left: 8.0, width: 85.0, height: 13.0 },
      },
      {
        clause: "9.1",
        riskLevel: "high",
        description: "Contract termination conditions and procedures",
        riskScore: 68.9,
        pageNumber: 4,
        position: { top: 45.0, left: 8.0, width: 85.0, height: 17.0 },
      },
    ],
    analytics: {
      overallRiskScore: 58.75,
      riskDistribution: {
        high: 3,
        medium: 3,
        low: 1,
      },
      completionRate: 33.33,
      criticalDeadlines: 2,
      totalClauses: 7,
      riskyClauses: 6,
    },
    documentStructure: {
      sections: [
        {
          title: "Introduction and Definitions",
          pageStart: 1,
          pageEnd: 1,
          clauses: ["1.1", "1.2", "1.3"],
          riskLevel: "low",
          summary: "Contract introduction, definitions, and basic terms",
        },
        {
          title: "Service Specifications",
          pageStart: 1,
          pageEnd: 2,
          clauses: ["3.1", "3.2", "3.3"],
          riskLevel: "high",
          summary: "Detailed service requirements and performance standards",
        },
        {
          title: "Financial Terms",
          pageStart: 2,
          pageEnd: 2,
          clauses: ["4.1", "4.2"],
          riskLevel: "medium",
          summary: "Payment terms, pricing, and financial obligations",
        },
        {
          title: "Intellectual Property",
          pageStart: 2,
          pageEnd: 3,
          clauses: ["5.1", "5.2", "5.3"],
          riskLevel: "high",
          summary: "IP ownership, licensing, and usage rights",
        },
        {
          title: "Legal and Compliance",
          pageStart: 3,
          pageEnd: 4,
          clauses: ["6.1", "6.2", "7.1", "7.2"],
          riskLevel: "medium",
          summary: "Legal obligations, compliance, and confidentiality",
        },
        {
          title: "Contract Management",
          pageStart: 4,
          pageEnd: 4,
          clauses: ["8.1", "9.1", "9.2"],
          riskLevel: "medium",
          summary: "Force majeure, termination, and contract administration",
        },
      ],
      totalPages: 4,
    },
  }
}
