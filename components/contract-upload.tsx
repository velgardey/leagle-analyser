"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  Sparkles,
  Network,
  TimerIcon,
  AlertTriangle,
  TrendingUp,
  Flame,
  Brain,
  Zap,
  Shield,
  AlertCircle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import { analyzeContract, type ContractData } from "@/lib/contract-service"

interface ContractUploadProps {
  onContractAnalyzed: (data: ContractData) => void
  onAnalysisStart?: () => void
  onAnalysisError?: (error: string) => void
}

export default function ContractUpload({ onContractAnalyzed, onAnalysisStart, onAnalysisError }: ContractUploadProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analysisStage, setAnalysisStage] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const analysisStages = [
    {
      title: "Processing PDF",
      description: "Extracting text and metadata from PDF document",
      icon: <FileText className="w-5 h-5" />,
      duration: 8000, // 8 seconds
    },
    {
      title: "Document Structure Analysis",
      description: "Analyzing document layout and structure",
      icon: <Brain className="w-5 h-5" />,
      duration: 6000, // 6 seconds
    },
    {
      title: "Gemini AI Deep Analysis",
      description: "Comprehensive AI analysis of contract content",
      icon: <Sparkles className="w-5 h-5" />,
      duration: 12000, // 12 seconds
    },
    {
      title: "Identifying Parties & Entities",
      description: "Detecting all parties, entities and relationships",
      icon: <Network className="w-5 h-5" />,
      duration: 7000, // 7 seconds
    },
    {
      title: "Risk Assessment & Scoring",
      description: "Evaluating legal, financial and business risks",
      icon: <AlertTriangle className="w-5 h-5" />,
      duration: 10000, // 10 seconds
    },
    {
      title: "Timeline & Obligations Extraction",
      description: "Identifying dates, deadlines and obligations",
      icon: <TimerIcon className="w-5 h-5" />,
      duration: 5000, // 5 seconds
    },
    {
      title: "Key Terms & Definitions",
      description: "Extracting and categorizing key contract terms",
      icon: <TrendingUp className="w-5 h-5" />,
      duration: 4000, // 4 seconds
    },
    {
      title: "Clause Position Mapping",
      description: "Mapping clause positions for PDF highlighting",
      icon: <Flame className="w-5 h-5" />,
      duration: 6000, // 6 seconds
    },
    {
      title: "Generating Insights",
      description: "Creating interactive visualizations and reports",
      icon: <Zap className="w-5 h-5" />,
      duration: 4000, // 4 seconds
    },
    {
      title: "Finalizing Analysis",
      description: "Completing analysis and preparing results",
      icon: <CheckCircle className="w-5 h-5" />,
      duration: 3000, // 3 seconds
    },
  ]

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      handleFile(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      handleFile(file)
    }
  }

  const handleFile = async (file: File) => {
    console.log("File selected:", file.name, file.type, file.size)

    setSelectedFile(file)
    setIsAnalyzing(true)
    setUploadProgress(0)
    setAnalysisStage(0)
    setError(null)

    // Notify parent component that analysis has started
    onAnalysisStart?.()

    try {
      // Simulate file upload progress (faster initial upload)
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(uploadInterval)
            return 100
          }
          return prev + 20
        })
      }, 150)

      // Wait for upload to complete
      await new Promise((resolve) => setTimeout(resolve, 1000))
      clearInterval(uploadInterval)
      setUploadProgress(100)

      // Start actual analysis in parallel with stage simulation
      let analysisPromise: Promise<any> | null = null
      let analysisResult: any = null
      let analysisCompleted = false

      // Start the actual analysis after a short delay
      setTimeout(async () => {
        try {
          console.log("Starting contract analysis...")
          analysisResult = await analyzeContract(file)
          analysisCompleted = true
          console.log("Analysis completed:", analysisResult)
        } catch (error) {
          console.error("Analysis failed during processing:", error)
          // Don't throw here, let the main flow handle it
        }
      }, 5000) // Start analysis 5 seconds into the process

      // Simulate analysis stages with realistic timing
      for (let i = 0; i < analysisStages.length; i++) {
        setAnalysisStage(i)
        const stageDuration = analysisStages[i].duration || 3000

        // If analysis completed early and we're in the last few stages, speed up
        if (analysisCompleted && i >= analysisStages.length - 3) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        } else {
          await new Promise((resolve) => setTimeout(resolve, stageDuration))
        }
      }

      // If analysis hasn't completed yet, wait for it
      if (!analysisCompleted) {
        console.log("Waiting for analysis to complete...")
        // Wait up to 10 more seconds for analysis
        for (let i = 0; i < 20; i++) {
          if (analysisCompleted) break
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      if (!analysisResult) {
        throw new Error("Analysis did not complete in expected time")
      }

      setIsAnalyzing(false)
      onContractAnalyzed(analysisResult)

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${file.name} with ${analysisResult.risks.length} risks identified.`,
        duration: 5000,
      })
    } catch (error: any) {
      console.error("Analysis failed:", error)
      setIsAnalyzing(false)
      const errorMessage = error.message || "An unexpected error occurred"
      setError(errorMessage)

      // Notify parent component of the error
      onAnalysisError?.(errorMessage)

      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Contract Document
          </CardTitle>
          <CardDescription>
            Upload your PDF contract document for comprehensive AI-powered analysis using Google Gemini AI
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedFile?.name || "Contract document"}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      PDF Document •{" "}
                      {selectedFile?.size ? (selectedFile.size / 1024).toFixed(1) + " KB" : "Processing..."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing document</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>

                {uploadProgress === 100 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <h3 className="font-medium">Gemini AI Analysis in Progress</h3>
                      <div className="ml-auto">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {analysisStages.map((stage, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center gap-3 p-4 rounded-lg transition-all duration-300 ${
                            index === analysisStage
                              ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 shadow-sm"
                              : index < analysisStage
                                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                : "bg-gray-50 dark:bg-gray-800/30"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {index < analysisStage ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : index === analysisStage ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                className="text-blue-500"
                              >
                                {stage.icon}
                              </motion.div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{stage.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{stage.description}</p>
                          </div>
                          {index === analysisStage && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-500">
                              <Zap className="w-4 h-4" />
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20 scale-105"
                      : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} accept=".pdf" />
                  <div className="space-y-4">
                    <motion.div
                      className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold">Drop your PDF contract here</h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">Supports PDF files up to 10MB</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button variant="outline" onClick={triggerFileInput} className="gap-2">
                        <FileText className="w-4 h-4" />
                        Choose PDF File
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Tabs defaultValue="features" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="features">AI Features</TabsTrigger>
          <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.div
                  className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-800"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-800">
                      <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-semibold">Gemini AI Analysis</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Advanced AI-powered contract analysis using Google's Gemini 1.5 Flash for comprehensive
                    understanding
                  </p>
                </motion.div>

                <motion.div
                  className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-800"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-800">
                      <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-semibold">PDF Processing</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Direct PDF text extraction and processing with clause position mapping for highlighting
                  </p>
                </motion.div>

                <motion.div
                  className="p-4 border rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-800"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-red-100 dark:bg-red-800">
                      <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <h4 className="font-semibold">Risk Assessment</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Comprehensive risk analysis with clause-level risk mapping and mitigation strategies
                  </p>
                </motion.div>

                <motion.div
                  className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-800"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-800">
                      <Network className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="font-semibold">Relationship Mapping</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Interactive visualization of contract parties and their complex relationships
                  </p>
                </motion.div>

                <motion.div
                  className="p-4 border rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 dark:border-orange-800"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-800">
                      <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h4 className="font-semibold">Interactive Heatmap</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Visual highlighting of high-risk clauses directly on the PDF document
                  </p>
                </motion.div>

                <motion.div
                  className="p-4 border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 dark:border-gray-700"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <TimerIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h4 className="font-semibold">Timeline Analysis</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatic extraction of dates, deadlines, and milestones with progress tracking
                  </p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="how-it-works" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "PDF Upload & Processing",
                    description:
                      "Upload your PDF contract. Our system extracts text, metadata, and prepares it for AI analysis.",
                    icon: <Upload className="w-6 h-6" />,
                  },
                  {
                    step: 2,
                    title: "Gemini AI Analysis",
                    description:
                      "Google's Gemini 1.5 Flash AI analyzes the contract comprehensively, identifying parties, terms, risks, and relationships.",
                    icon: <Brain className="w-6 h-6" />,
                  },
                  {
                    step: 3,
                    title: "Risk Assessment & Mapping",
                    description:
                      "AI evaluates risks and maps clause positions for visual highlighting on the original PDF.",
                    icon: <Shield className="w-6 h-6" />,
                  },
                  {
                    step: 4,
                    title: "Interactive Visualization",
                    description:
                      "Explore results through multiple views: PDF viewer with risk highlights, relationship diagrams, timelines, and more.",
                    icon: <Sparkles className="w-6 h-6" />,
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{item.title}</h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "AI-Powered Accuracy",
                    description: "Leverage Gemini AI's advanced language understanding for precise contract analysis",
                    icon: <Brain className="w-5 h-5 text-green-500" />,
                  },
                  {
                    title: "Visual Risk Mapping",
                    description: "See risks highlighted directly on your PDF with interactive clause-level analysis",
                    icon: <Flame className="w-5 h-5 text-green-500" />,
                  },
                  {
                    title: "Comprehensive Analysis",
                    description:
                      "Extract parties, terms, risks, timelines, and relationships in one comprehensive analysis",
                    icon: <TrendingUp className="w-5 h-5 text-green-500" />,
                  },
                  {
                    title: "Time Efficiency",
                    description: "Reduce contract review time from hours to minutes with automated AI analysis",
                    icon: <TimerIcon className="w-5 h-5 text-green-500" />,
                  },
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex-shrink-0 mt-0.5">{benefit.icon}</div>
                    <div>
                      <h4 className="font-semibold">{benefit.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
