"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles,
  FileText,
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  Trash2,
  Copy,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import type { ContractData } from "@/lib/contract-service"

interface Message {
  id: string
  type: "user" | "bot"
  content: string
  timestamp: Date
  isLoading?: boolean
  suggestions?: string[]
}

interface PDFChatbotProps {
  data: ContractData
  className?: string
}

export default function PDFChatbot({ data, className = "" }: PDFChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const suggestedQuestions = [
    "What are the main risks in this contract?",
    "Who are the parties involved?",
    "What are the key payment terms?",
    "When does this contract expire?",
    "What are the termination conditions?",
    "Are there any compliance requirements?",
    "What intellectual property rights are mentioned?",
    "What are the renewal terms?"
  ]

  useEffect(() => {
    // Add welcome message when component mounts
    const welcomeMessage: Message = {
      id: "welcome",
      type: "bot",
      content: `Hello! I'm your AI assistant for analyzing "${data.fileName}". I can help you understand the contract details, risks, terms, and answer any questions you have about this document. What would you like to know?`,
      timestamp: new Date(),
      suggestions: suggestedQuestions.slice(0, 4)
    }
    setMessages([welcomeMessage])
  }, [data.fileName])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      // Add loading message
      const loadingMessage: Message = {
        id: `loading-${Date.now()}`,
        type: "bot",
        content: "",
        timestamp: new Date(),
        isLoading: true
      }
      setMessages(prev => [...prev, loadingMessage])

      // Call the chatbot API
      const response = await fetch('/api/chat-with-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          contractData: data,
          conversationHistory: messages.filter(m => !m.isLoading).map(m => ({
            role: m.type === "user" ? "user" : "assistant",
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot')
      }

      const result = await response.json()

      // Remove loading message and add bot response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading)
        const botMessage: Message = {
          id: Date.now().toString(),
          type: "bot",
          content: result.response,
          timestamp: new Date(),
          suggestions: result.suggestions || []
        }
        return [...filtered, botMessage]
      })

    } catch (error) {
      console.error("Chat error:", error)
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading)
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: "bot",
          content: "I apologize, but I'm having trouble processing your request right now. Please try again or ask a different question.",
          timestamp: new Date()
        }
        return [...filtered, errorMessage]
      })

      toast({
        title: "Chat Error",
        description: "Unable to process your message. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    } else if (e.key === "Escape") {
      setIsExpanded(false)
    }
  }

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      type: "bot",
      content: `Chat cleared! I'm ready to help you analyze "${data.fileName}" again. What would you like to know?`,
      timestamp: new Date(),
      suggestions: suggestedQuestions.slice(0, 4)
    }])
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
      duration: 2000,
    })
  }

  if (!isExpanded) {
    return (
      <motion.div
        className={`fixed bottom-6 right-6 z-50 ${className}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Button
          onClick={() => setIsExpanded(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`fixed bottom-6 right-6 z-50 ${className}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="w-96 h-[600px] shadow-2xl border-2">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              PDF Assistant
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                ×
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FileText className="h-3 w-3" />
            <span className="truncate">{data.fileName}</span>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex flex-col h-[calc(600px-120px)]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.type === "bot" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.type === "user" ? "order-first" : ""}`}>
                      <div
                        className={`p-3 rounded-lg ${
                          message.type === "user"
                            ? "bg-blue-500 text-white ml-auto"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.type === "bot" && !message.isLoading && (
                              <div className="flex items-center gap-1 mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyMessage(message.content)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-500">Suggested questions:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendMessage(suggestion)}
                                className="text-xs h-6 px-2"
                                disabled={isLoading}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {message.type === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
          
          <Separator />
          
          <div className="p-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about the contract..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
