"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ModeToggle } from "@/components/mode-toggle"
import { Upload, FileText, Network, TimerIcon, AlertTriangle, TrendingUp, Flame, Download, Settings } from "lucide-react"
import ContractUpload from "@/components/contract-upload"
import PartyRelationshipDiagram from "@/components/party-relationship-diagram"
import ContractTimeline from "@/components/contract-timeline"
import RiskAssessment from "@/components/risk-assessment"
import KeyTermsExtraction from "@/components/key-terms-extraction"
import ContractSummary from "@/components/contract-summary"
import ContractHeatmap from "@/components/contract-heatmap"
import AppSettings from "@/components/app-settings"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import type { ContractData } from "@/lib/contract-service"

export default function SmartContractAnalyzer() {
  const [contractData, setContractData] = useState<ContractData | null>(null)
  const [activeTab, setActiveTab] = useState("upload")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const { toast } = useToast()

  const handleContractAnalyzed = (data: ContractData) => {
    try {
      setContractData(data)
      setActiveTab("summary")
      setError(null)
      setIsLoading(false)

      // Validate data quality
      const riskCount = data.risks?.length || 0
      const partyCount = data.contractInfo?.parties?.length || 0
      const timelineCount = data.timeline?.length || 0

      toast({
        title: "Contract Analysis Complete",
        description: `Successfully analyzed ${data.fileName} with ${riskCount} risks, ${partyCount} parties, and ${timelineCount} timeline events identified.`,
        duration: 5000,
      })
    } catch (error) {
      console.error("Error handling contract analysis result:", error)
      setError("Failed to process analysis results")
      toast({
        title: "Processing Error",
        description: "Analysis completed but there was an error processing the results.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const handleAnalysisStart = () => {
    setIsLoading(true)
    setError(null)
  }

  const handleAnalysisError = (errorMessage: string) => {
    setIsLoading(false)
    setError(errorMessage)
    toast({
      title: "Analysis Failed",
      description: errorMessage,
      variant: "destructive",
      duration: 5000,
    })
  }

  const retryAnalysis = () => {
    setError(null)
    setActiveTab("upload")
  }

  const handleExport = async () => {
    if (!contractData) return

    toast({
      title: "Export Initiated",
      description: "Your analysis report is being generated and will download shortly.",
      duration: 3000,
    })

    try {
      // Generate comprehensive report
      const reportData = {
        contractInfo: contractData.contractInfo,
        risks: contractData.risks,
        timeline: contractData.timeline,
        keyTerms: contractData.keyTerms,
        analytics: contractData.analytics,
        exportDate: new Date().toISOString(),
        fileName: contractData.fileName
      }

      // Create downloadable JSON report
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `contract-analysis-${contractData.fileName?.replace('.pdf', '') || 'report'}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Complete",
        description: "Your analysis report has been downloaded as JSON.",
        duration: 3000,
      })
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export Failed",
        description: "Unable to generate report. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
          {/* Header */}
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 lg:mb-8 gap-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                  Leagle : Smart Contract Analyser
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI-powered legal contract analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {contractData && (
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export Report</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <ModeToggle />
            </div>
          </motion.div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto mb-6 lg:mb-8">
              <TabsList className="grid w-full grid-cols-7 min-w-[700px] lg:min-w-0 gap-1 lg:gap-0">
                <TabsTrigger value="upload" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
                  <Upload className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Upload</span>
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  disabled={!contractData}
                  className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                >
                  <FileText className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Summary</span>
                </TabsTrigger>
                <TabsTrigger
                  value="relationships"
                  disabled={!contractData}
                  className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                >
                  <Network className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Relationships</span>
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  disabled={!contractData}
                  className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                >
                  <TimerIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
                <TabsTrigger
                  value="risks"
                  disabled={!contractData}
                  className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                >
                  <AlertTriangle className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Risks</span>
                </TabsTrigger>
                <TabsTrigger
                  value="terms"
                  disabled={!contractData}
                  className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                >
                  <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Key Terms</span>
                </TabsTrigger>
                <TabsTrigger
                  value="heatmap"
                  disabled={!contractData}
                  className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                >
                  <Flame className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Heatmap</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="upload">
                <ContractUpload
                  onContractAnalyzed={handleContractAnalyzed}
                  onAnalysisStart={handleAnalysisStart}
                  onAnalysisError={handleAnalysisError}
                />
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div className="flex-1">
                            <h3 className="font-medium text-red-800 dark:text-red-200">Analysis Failed</h3>
                            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={retryAnalysis}>
                            Try Again
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="summary">{contractData && <ContractSummary data={contractData} />}</TabsContent>

              <TabsContent value="relationships">
                {contractData && <PartyRelationshipDiagram data={contractData} />}
              </TabsContent>

              <TabsContent value="timeline">{contractData && <ContractTimeline data={contractData} />}</TabsContent>

              <TabsContent value="risks">{contractData && <RiskAssessment data={contractData} />}</TabsContent>

              <TabsContent value="terms">{contractData && <KeyTermsExtraction data={contractData} />}</TabsContent>

              <TabsContent value="heatmap">{contractData && <ContractHeatmap data={contractData} />}</TabsContent>
            </motion.div>
          </Tabs>
        </div>
        <Toaster />
        <AppSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
  )
}
