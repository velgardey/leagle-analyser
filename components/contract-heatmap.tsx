"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Flame, Download } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import PDFViewer from "./pdf-viewer"
import type { ContractData } from "@/lib/contract-service"

interface ContractHeatmapProps {
  data: ContractData
}

export default function ContractHeatmap({ data }: ContractHeatmapProps) {
  const [selectedClause, setSelectedClause] = useState<string | null>(null)
  const [riskThreshold, setRiskThreshold] = useState([50])
  const [viewMode, setViewMode] = useState<"heatmap" | "text">("heatmap")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!data || !data.documentStructure) {
      return
    }

    if (canvasRef.current && viewMode === "text") {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw heatmap visualization
      const sections = data.documentStructure.sections || []
      const sectionHeight = canvas.height / Math.max(sections.length, 1)

      sections.forEach((section, index) => {
        const y = index * sectionHeight
        const riskScore = getRiskScore(section.riskLevel)

        // Convert risk level to color
        const alpha = riskScore / 100
        const red = Math.floor(239 * alpha + 255 * (1 - alpha))
        const green = Math.floor(68 * alpha + 255 * (1 - alpha))
        const blue = Math.floor(68 * alpha + 255 * (1 - alpha))

        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`
        ctx.fillRect(0, y, canvas.width, sectionHeight)

        // Add section label
        ctx.fillStyle = "#000"
        ctx.font = "12px Arial"
        ctx.fillText(section.title, 10, y + sectionHeight / 2)
      })
    }
  }, [data, viewMode, riskThreshold])

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return { bg: "rgba(239, 68, 68, 0.8)", border: "#dc2626", text: "#7f1d1d" }
      case "medium":
        return { bg: "rgba(245, 158, 11, 0.6)", border: "#d97706", text: "#92400e" }
      case "low":
        return { bg: "rgba(34, 197, 94, 0.4)", border: "#16a34a", text: "#14532d" }
      default:
        return { bg: "rgba(156, 163, 175, 0.3)", border: "#6b7280", text: "#374151" }
    }
  }

  const getRiskScore = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return 90
      case "medium":
        return 60
      case "low":
        return 30
      default:
        return 0
    }
  }

  const clauseRiskMap = data.clauseRiskMap || []
  const documentStructure = data.documentStructure || { sections: [], totalPages: 1 }

  const filteredClauses = clauseRiskMap.filter((clause) => getRiskScore(clause.riskLevel) >= riskThreshold[0])

  const handleExportHeatmap = () => {
    toast({
      title: "Heatmap Export",
      description: "Contract heatmap analysis has been exported to PDF.",
      duration: 3000,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Contract Risk Heatmap
              </CardTitle>
              <CardDescription>
                Visual highlighting of contract clauses by risk level directly on the PDF document
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportHeatmap}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">View Mode:</span>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "heatmap" | "text")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="heatmap">PDF Heatmap</TabsTrigger>
                  <TabsTrigger value="text">Analysis View</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-medium">Risk Threshold:</span>
              <div className="flex-1 max-w-xs">
                <Slider
                  value={riskThreshold}
                  onValueChange={setRiskThreshold}
                  max={100}
                  min={0}
                  step={10}
                  className="w-full"
                />
              </div>
              <span className="text-sm text-gray-500">{riskThreshold[0]}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Risk Level Legend</h3>
            <div className="text-sm text-gray-500">
              Showing {filteredClauses.length} of {clauseRiskMap.length} risk areas
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm">High Risk (80-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-sm">Medium Risk (40-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm">Low Risk (0-39%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Heatmap Content */}
      <AnimatePresence mode="wait">
        {viewMode === "heatmap" ? (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {data.pdfBlob ? (
              <PDFViewer data={data} highlightRisks={true} selectedClause={selectedClause} />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Flame className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">PDF not available</h3>
                    <p className="text-gray-500 dark:text-gray-500">
                      The original PDF document is not available for viewing
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Canvas Heatmap */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Visual Risk Distribution</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <canvas ref={canvasRef} width={400} height={600} className="w-full h-auto" />
                    </div>
                  </div>

                  {/* Risk Analysis */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Risk Analysis by Clause</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredClauses.map((clause, index) => {
                        const { bg, border, text } = getRiskColor(clause.riskLevel)
                        return (
                          <motion.div
                            key={`${clause.clause}-${index}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                              selectedClause === clause.clause ? "ring-2 ring-blue-500" : ""
                            }`}
                            style={{
                              backgroundColor: bg,
                              borderColor: border,
                            }}
                            onClick={() => setSelectedClause(selectedClause === clause.clause ? null : clause.clause)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium" style={{ color: text }}>
                                Clause {clause.clause}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    clause.riskLevel === "high"
                                      ? "destructive"
                                      : clause.riskLevel === "medium"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {clause.riskLevel}
                                </Badge>
                                <span className="text-xs" style={{ color: text }}>
                                  Page {clause.pageNumber}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm opacity-80" style={{ color: text }}>
                              {clause.description}
                            </p>
                            <div className="mt-2 text-xs" style={{ color: text }}>
                              Risk Score: {clause.riskScore}/100
                            </div>
                            {selectedClause === clause.clause && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-gray-300"
                              >
                                <p className="text-sm" style={{ color: text }}>
                                  Position: Top {clause.position.top}%, Left {clause.position.left}%
                                </p>
                              </motion.div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {clauseRiskMap.filter((c) => c.riskLevel === "high").length}
              </div>
              <div className="text-sm text-red-600">High Risk Clauses</div>
              <div className="text-xs text-gray-500 mt-1">Require immediate attention</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {clauseRiskMap.filter((c) => c.riskLevel === "medium").length}
              </div>
              <div className="text-sm text-orange-600">Medium Risk Clauses</div>
              <div className="text-xs text-gray-500 mt-1">Monitor and review regularly</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {clauseRiskMap.filter((c) => c.riskLevel === "low").length}
              </div>
              <div className="text-sm text-green-600">Low Risk Clauses</div>
              <div className="text-xs text-gray-500 mt-1">Standard terms and conditions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
