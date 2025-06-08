"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Upload, FileText, Network, TimerIcon, AlertTriangle, TrendingUp, Flame, Download } from "lucide-react"
import ContractUpload from "@/components/contract-upload"
import PartyRelationshipDiagram from "@/components/party-relationship-diagram"
import ContractTimeline from "@/components/contract-timeline"
import RiskAssessment from "@/components/risk-assessment"
import KeyTermsExtraction from "@/components/key-terms-extraction"
import ContractSummary from "@/components/contract-summary"
import ContractHeatmap from "@/components/contract-heatmap"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import type { ContractData } from "@/lib/contract-service"

export default function SmartContractAnalyzer() {
  const [contractData, setContractData] = useState<ContractData | null>(null)
  const [activeTab, setActiveTab] = useState("upload")
  const { toast } = useToast()

  const handleContractAnalyzed = (data: ContractData) => {
    setContractData(data)
    setActiveTab("summary")
    toast({
      title: "Contract Analysis Complete",
      description: `Successfully analyzed ${data.fileName} with ${data.risks.length} risks identified.`,
      duration: 5000,
    })
  }

  const handleExport = () => {
    if (!contractData) return

    toast({
      title: "Export Initiated",
      description: "Your analysis report is being generated and will download shortly.",
      duration: 3000,
    })

    // Simulate export delay
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Your analysis report has been downloaded.",
        duration: 3000,
      })
    }, 2000)
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
              <ModeToggle />
            </div>
          </motion.div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto mb-6 lg:mb-8">
              <TabsList className="grid w-full grid-cols-7 min-w-[700px] lg:min-w-0">
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
                <ContractUpload onContractAnalyzed={handleContractAnalyzed} />
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
      </div>
  )
}
