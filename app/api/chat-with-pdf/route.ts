import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ChatRequest {
  message: string
  contractData: any
  conversationHistory: ChatMessage[]
}

export async function POST(request: NextRequest) {
  try {
    const { message, contractData, conversationHistory }: ChatRequest = await request.json()

    if (!message || !contractData) {
      return NextResponse.json(
        { error: "Message and contract data are required" },
        { status: 400 }
      )
    }

    // If no API key, return a mock response
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found, returning mock response")
      return NextResponse.json({
        response: generateMockResponse(message, contractData),
        suggestions: generateSuggestions(message)
      })
    }

    // Prepare context from contract data
    const contractContext = prepareContractContext(contractData)
    
    // Build conversation history
    const conversationContext = conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n")

    const prompt = `You are an expert legal AI assistant specializing in contract analysis. You are helping a user understand and analyze their contract document.

CONTRACT INFORMATION:
${contractContext}

CONVERSATION HISTORY:
${conversationContext}

CURRENT USER QUESTION: ${message}

INSTRUCTIONS:
1. Answer the user's question based on the contract data provided
2. Be specific and reference actual data from the contract when possible
3. If the question is about risks, mention specific risk scores and categories
4. If asked about parties, provide their names, roles, and relationships
5. For timeline questions, mention specific dates and deadlines
6. Keep responses concise but informative (2-3 paragraphs max)
7. If you cannot find specific information in the contract data, say so clearly
8. Always maintain a helpful and professional tone
9. Focus on the most relevant information for the user's question

Provide a helpful, accurate response based on the contract data:`

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!response.ok) {
      console.error("Gemini API error:", response.status, response.statusText)
      return NextResponse.json({
        response: generateMockResponse(message, contractData),
        suggestions: generateSuggestions(message)
      })
    }

    const result = await response.json()
    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, but I couldn't process your question at the moment."

    return NextResponse.json({
      response: aiResponse,
      suggestions: generateSuggestions(message)
    })

  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    )
  }
}

function prepareContractContext(contractData: any): string {
  const context = []
  
  // Basic contract info
  if (contractData.contractInfo) {
    context.push(`CONTRACT TITLE: ${contractData.contractInfo.title || "N/A"}`)
    
    if (contractData.contractInfo.parties) {
      context.push(`PARTIES: ${contractData.contractInfo.parties.map((p: any) => `${p.name} (${p.role})`).join(", ")}`)
    }
    
    if (contractData.contractInfo.contractTerm) {
      context.push(`TERM: ${contractData.contractInfo.contractTerm.initialTerm || "N/A"}`)
    }
  }

  // Risk summary
  if (contractData.risks && contractData.risks.length > 0) {
    const highRisks = contractData.risks.filter((r: any) => r.category === "High").length
    const mediumRisks = contractData.risks.filter((r: any) => r.category === "Medium").length
    const lowRisks = contractData.risks.filter((r: any) => r.category === "Low").length
    context.push(`RISKS: ${highRisks} High, ${mediumRisks} Medium, ${lowRisks} Low`)
    
    // Add top 3 risks
    const topRisks = contractData.risks
      .sort((a: any, b: any) => b.riskScore - a.riskScore)
      .slice(0, 3)
      .map((r: any) => `${r.title} (Score: ${r.riskScore})`)
    context.push(`TOP RISKS: ${topRisks.join(", ")}`)
  }

  // Timeline summary
  if (contractData.timeline && contractData.timeline.length > 0) {
    const upcomingEvents = contractData.timeline
      .filter((t: any) => !t.completed && new Date(t.date) > new Date())
      .slice(0, 3)
      .map((t: any) => `${t.event} (${t.date})`)
    if (upcomingEvents.length > 0) {
      context.push(`UPCOMING EVENTS: ${upcomingEvents.join(", ")}`)
    }
  }

  // Key terms
  if (contractData.keyTerms && contractData.keyTerms.length > 0) {
    const criticalTerms = contractData.keyTerms
      .filter((t: any) => t.importance === "Critical")
      .map((t: any) => t.term)
    if (criticalTerms.length > 0) {
      context.push(`CRITICAL TERMS: ${criticalTerms.join(", ")}`)
    }
  }

  return context.join("\n")
}

function generateMockResponse(message: string, contractData: any): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes("risk")) {
    const riskCount = contractData.risks?.length || 0
    const highRisks = contractData.risks?.filter((r: any) => r.category === "High").length || 0
    return `Based on the contract analysis, I found ${riskCount} total risks, with ${highRisks} classified as high risk. The main risk areas include service level agreements, intellectual property disputes, and payment delays. Would you like me to elaborate on any specific risk category?`
  }
  
  if (lowerMessage.includes("partie") || lowerMessage.includes("who")) {
    const parties = contractData.contractInfo?.parties || []
    if (parties.length > 0) {
      const partyList = parties.map((p: any) => `${p.name} (${p.role})`).join(", ")
      return `The contract involves the following parties: ${partyList}. Each party has specific roles and responsibilities outlined in the agreement.`
    }
    return "I can see the contract involves multiple parties, but I'd need to analyze the specific party details to provide more information."
  }
  
  if (lowerMessage.includes("payment") || lowerMessage.includes("financial")) {
    return "The contract includes specific payment terms and financial obligations. Based on the analysis, there are defined payment schedules, potential penalties for late payments, and financial risk assessments. Would you like me to detail the specific payment terms?"
  }
  
  if (lowerMessage.includes("expire") || lowerMessage.includes("end") || lowerMessage.includes("term")) {
    const term = contractData.contractInfo?.contractTerm?.initialTerm || "not specified"
    return `The contract has an initial term of ${term}. There are also provisions for renewal and termination conditions. The timeline analysis shows specific dates and deadlines that are important to track.`
  }
  
  if (lowerMessage.includes("termination") || lowerMessage.includes("cancel")) {
    return "The contract includes termination clauses that specify the conditions under which the agreement can be ended. This typically includes notice periods, breach conditions, and procedures for contract termination. The risk analysis identifies potential termination-related risks."
  }
  
  return `I understand you're asking about "${message}". Based on the contract analysis, I can help you with information about risks, parties, terms, timelines, and other contract details. Could you be more specific about what aspect you'd like to explore?`
}

function generateSuggestions(message: string): string[] {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes("risk")) {
    return [
      "What are the highest risk areas?",
      "How can these risks be mitigated?",
      "Show me risk scores by category"
    ]
  }
  
  if (lowerMessage.includes("partie")) {
    return [
      "What are each party's responsibilities?",
      "How are the parties related?",
      "Who has the most obligations?"
    ]
  }
  
  if (lowerMessage.includes("payment")) {
    return [
      "What are the payment deadlines?",
      "Are there late payment penalties?",
      "What's the total contract value?"
    ]
  }
  
  return [
    "What are the key deadlines?",
    "Summarize the main terms",
    "What should I be most concerned about?",
    "Are there any compliance requirements?"
  ]
}
