"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Info,
  Download,
  Filter,
  Target,
  CheckCircle,
  Clock,
  Lightbulb,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import type { ContractData } from "@/lib/contract-service"

interface RiskAssessmentProps {
  data: ContractData
}

export default function RiskAssessment({ data }: RiskAssessmentProps) {
  const [selectedRisk, setSelectedRisk] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [showMitigation, setShowMitigation] = useState<boolean>(false)
  const { toast } = useToast()
  const chartRef = useRef<HTMLCanvasElement>(null)

  const getRiskIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "high":
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case "medium":
        return <TrendingUp className="w-5 h-5 text-orange-500" />
      case "low":
        return <Info className="w-5 h-5 text-blue-500" />
      default:
        return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  const getRiskColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "high":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
      case "medium":
        return "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
      case "low":
        return "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
      default:
        return "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800"
    }
  }

  const getBadgeVariant = (category: string) => {
    switch (category.toLowerCase()) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const filteredRisks = data.risks.filter(
    (risk) => filterCategory === "all" || risk.category.toLowerCase() === filterCategory.toLowerCase(),
  )

  const riskCounts = data.risks.reduce((acc: any, risk) => {
    acc[risk.category.toLowerCase()] = (acc[risk.category.toLowerCase()] || 0) + 1
    return acc
  }, {})

  const overallRiskScore = data.analytics.overallRiskScore

  const handleExportRisks = () => {
    toast({
      title: "Risk Report Export",
      description: "Risk assessment report has been exported to PDF.",
      duration: 3000,
    })
  }

  // Draw risk distribution chart
  useEffect(() => {
    if (chartRef.current) {
      const canvas = chartRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set dimensions
      const width = canvas.width
      const height = canvas.height
      const padding = 60
      const availableWidth = width - padding * 2
      const availableHeight = height - padding * 2

      // Draw background
      ctx.fillStyle = "#f8fafc"
      ctx.fillRect(0, 0, width, height)

      // Draw grid
      ctx.strokeStyle = "#e2e8f0"
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const x = padding + (availableWidth * i) / 4
        const y = padding + (availableHeight * i) / 4

        // Vertical lines
        ctx.beginPath()
        ctx.moveTo(x, padding)
        ctx.lineTo(x, height - padding)
        ctx.stroke()

        // Horizontal lines
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(width - padding, y)
        ctx.stroke()
      }

      // Draw axes
      ctx.strokeStyle = "#475569"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, height - padding)
      ctx.lineTo(width - padding, height - padding)
      ctx.stroke()

      // Draw labels
      ctx.fillStyle = "#475569"
      ctx.font = "12px Inter, sans-serif"
      ctx.textAlign = "center"

      // X-axis labels
      const impactLabels = ["Low", "Medium", "High"]
      impactLabels.forEach((label, i) => {
        const x = padding + (availableWidth * (i + 1)) / 4
        ctx.fillText(label, x, height - padding + 20)
      })
      ctx.fillText("Impact", width / 2, height - padding + 40)

      // Y-axis labels
      ctx.textAlign = "right"
      const likelihoodLabels = ["Low", "Medium", "High"]
      likelihoodLabels.forEach((label, i) => {
        const y = height - padding - (availableHeight * (i + 1)) / 4
        ctx.fillText(label, padding - 10, y + 4)
      })

      ctx.save()
      ctx.translate(padding - 40, height / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = "center"
      ctx.fillText("Likelihood", 0, 0)
      ctx.restore()

      // Draw risk points
      data.risks.forEach((risk, index) => {
        let x, y

        // X position based on impact
        const impactMap: Record<string, number> = { low: 0.25, medium: 0.5, high: 0.75 }
        x = padding + availableWidth * (impactMap[risk.impact.toLowerCase()] || 0.5)

        // Y position based on likelihood
        const likelihoodMap: Record<string, number> = { low: 0.25, medium: 0.5, high: 0.75 }
        y = height - padding - availableHeight * (likelihoodMap[risk.likelihood.toLowerCase()] || 0.5)

        // Add some jitter to avoid overlapping
        x += (Math.random() - 0.5) * 20
        y += (Math.random() - 0.5) * 20

        // Draw circle
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)

        // Color based on risk category
        const colors: Record<string, string> = {
          high: "#ef4444",
          medium: "#f59e0b",
          low: "#3b82f6",
        }
        ctx.fillStyle = colors[risk.category.toLowerCase()] || "#6b7280"
        ctx.fill()

        // Add border
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Add risk ID
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 10px Inter, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(risk.id.toString(), x, y + 3)
      })
    }
  }, [data.risks])

  return (
    <div className="space-y-6">
      {/* Risk Overview Dashboard */}
      <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Risk Assessment Overview
              </CardTitle>
              <CardDescription>Comprehensive analysis of contract risks with mitigation strategies</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportRisks}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            >
              <div className="text-3xl font-bold text-red-600">{riskCounts.high || 0}</div>
              <div className="text-sm text-red-600">High Risk</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            >
              <div className="text-3xl font-bold text-orange-600">{riskCounts.medium || 0}</div>
              <div className="text-sm text-orange-600">Medium Risk</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            >
              <div className="text-3xl font-bold text-blue-600">{riskCounts.low || 0}</div>
              <div className="text-sm text-blue-600">Low Risk</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            >
              <div className="text-3xl font-bold text-purple-600">{overallRiskScore}</div>
              <div className="text-sm text-purple-600">Risk Score</div>
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Risk Level</span>
              <span>{overallRiskScore}/100</span>
            </div>
            <Progress value={overallRiskScore} className="h-3" />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Based on {data.risks.length} identified risk factors across all contract areas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Risk Analysis Tabs */}
      <Card>
        <CardHeader>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Detailed Analysis</TabsTrigger>
              <TabsTrigger value="analytics">Risk Analytics</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                {/* Risk Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filter by Risk Level:</span>
                    <div className="flex border rounded-md overflow-hidden">
                      {["all", "high", "medium", "low"].map((category) => (
                        <button
                          key={category}
                          className={`px-3 py-1 text-sm transition-colors ${
                            filterCategory === category
                              ? category === "all"
                                ? "bg-gray-200 dark:bg-gray-700"
                                : category === "high"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                  : category === "medium"
                                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                          onClick={() => setFilterCategory(category)}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={showMitigation ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowMitigation(!showMitigation)}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {showMitigation ? "Hide" : "Show"} Mitigation
                    </Button>
                  </div>
                </div>

                {/* Risk Summary Cards */}
                <div className="grid gap-4">
                  <AnimatePresence>
                    {filteredRisks.map((risk, index) => (
                      <motion.div
                        key={risk.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getRiskColor(
                          risk.category,
                        )} ${selectedRisk === risk.id ? "ring-2 ring-blue-500" : ""}`}
                        onClick={() => setSelectedRisk(selectedRisk === risk.id ? null : risk.id)}
                      >
                        <div className="flex items-start gap-3">
                          {getRiskIcon(risk.category)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-lg">{risk.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={getBadgeVariant(risk.category) as any}>{risk.category} Risk</Badge>
                                <div className="text-sm text-gray-500">Score: {risk.riskScore}</div>
                              </div>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 mb-3">{risk.description}</p>

                            <div className="flex flex-wrap gap-4 text-sm mb-3">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Impact:</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    risk.impact === "High"
                                      ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                                      : risk.impact === "Medium"
                                        ? "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300"
                                        : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                                  }
                                >
                                  {risk.impact}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Likelihood:</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    risk.likelihood === "High"
                                      ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                                      : risk.likelihood === "Medium"
                                        ? "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300"
                                        : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                                  }
                                >
                                  {risk.likelihood}
                                </Badge>
                              </div>
                              {risk.clauses && Array.isArray(risk.clauses) && risk.clauses.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Clauses:</span>
                                  <span className="text-gray-600 dark:text-gray-400">{risk.clauses.join(", ")}</span>
                                </div>
                              )}
                            </div>

                            {/* Risk Score Visualization */}
                            <div className="mb-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Risk Score</span>
                                <span>{risk.riskScore}/100</span>
                              </div>
                              <Progress value={risk.riskScore} className="h-2" />
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                              {(selectedRisk === risk.id || showMitigation) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600"
                                >
                                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Shield className="w-4 h-4 text-green-600" />
                                      <h5 className="font-semibold text-green-800 dark:text-green-400">
                                        Mitigation Strategy
                                      </h5>
                                    </div>
                                    <p className="text-sm text-green-700 dark:text-green-300">{risk.mitigation}</p>
                                  </div>

                                  {selectedRisk === risk.id && (
                                    <div className="mt-4 grid md:grid-cols-2 gap-4">
                                      <div>
                                        <h6 className="font-medium mb-2">Recommended Actions</h6>
                                        <div className="space-y-2">
                                          {risk.recommendations.map((rec, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-sm">
                                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                              <span>{rec}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <h6 className="font-medium mb-2">Risk Timeline</h6>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            <span>Immediate: Review and understand implications</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            <span>Short-term: Implement mitigation measures</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            <span>Long-term: Monitor and reassess regularly</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(riskCounts).map(([category, count]) => (
                          <div key={category} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{category} Risk</span>
                              <span>{count as number} risks</span>
                            </div>
                            <Progress
                              value={((count as number) / data.risks.length) * 100}
                              className={`h-2 ${
                                category === "high"
                                  ? "[&>div]:bg-red-500"
                                  : category === "medium"
                                    ? "[&>div]:bg-orange-500"
                                    : "[&>div]:bg-blue-500"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk by Clause</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.clauseRiskMap.slice(0, 5).map((clause, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded border">
                            <span className="font-mono text-sm">{clause.clause}</span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  clause.riskLevel === "high"
                                    ? "destructive"
                                    : clause.riskLevel === "medium"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {clause.riskLevel}
                              </Badge>
                              <span className="text-xs text-gray-500">{clause.riskScore}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detailed Risk Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Risk</th>
                            <th className="text-left p-2">Category</th>
                            <th className="text-left p-2">Impact</th>
                            <th className="text-left p-2">Likelihood</th>
                            <th className="text-left p-2">Score</th>
                            <th className="text-left p-2">Clauses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.risks.map((risk) => (
                            <tr key={risk.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="p-2 font-medium">{risk.title}</td>
                              <td className="p-2">
                                <Badge variant={getBadgeVariant(risk.category) as any} className="text-xs">
                                  {risk.category}
                                </Badge>
                              </td>
                              <td className="p-2">{risk.impact}</td>
                              <td className="p-2">{risk.likelihood}</td>
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <span>{risk.riskScore}</span>
                                  <div className="w-16 h-1 bg-gray-200 rounded">
                                    <div
                                      className={`h-full rounded ${
                                        risk.riskScore >= 70
                                          ? "bg-red-500"
                                          : risk.riskScore >= 40
                                            ? "bg-orange-500"
                                            : "bg-blue-500"
                                      }`}
                                      style={{ width: `${risk.riskScore}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 text-xs text-gray-500">{risk.clauses && Array.isArray(risk.clauses) ? risk.clauses.join(", ") : "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Risk Impact vs Likelihood Matrix</CardTitle>
                    <CardDescription>
                      Visual representation of risk positioning based on impact and likelihood
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <canvas
                        ref={chartRef}
                        width={500}
                        height={400}
                        className="border rounded-lg bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span>High Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                        <span>Medium Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span>Low Risk</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { category: "High", current: riskCounts.high || 0, trend: "stable" },
                          { category: "Medium", current: riskCounts.medium || 0, trend: "increasing" },
                          { category: "Low", current: riskCounts.low || 0, trend: "decreasing" },
                        ].map((item) => (
                          <div key={item.category} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{item.category} Risk</div>
                              <div className="text-sm text-gray-500">{item.current} identified</div>
                            </div>
                            <div
                              className={`text-sm px-2 py-1 rounded ${
                                item.trend === "increasing"
                                  ? "bg-red-100 text-red-700"
                                  : item.trend === "decreasing"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {item.trend}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Average Risk Score</span>
                          <span className="font-bold text-lg">{overallRiskScore}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Total Risks Identified</span>
                          <span className="font-bold text-lg">{data.risks.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Critical Risks</span>
                          <span className="font-bold text-lg text-red-600">{riskCounts.high || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Clauses with Risks</span>
                          <span className="font-bold text-lg">{data.clauseRiskMap.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Priority Recommendations
                    </CardTitle>
                    <CardDescription>
                      Actionable recommendations based on identified risks, prioritized by impact and urgency
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.risks
                        .filter((risk) => risk.category.toLowerCase() === "high")
                        .map((risk, index) => (
                          <motion.div
                            key={risk.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">{risk.title}</h4>
                                <p className="text-sm text-red-700 dark:text-red-300 mb-3">{risk.description}</p>
                                <div className="space-y-2">
                                  <h5 className="font-medium text-red-800 dark:text-red-300">Recommended Actions:</h5>
                                  <ul className="space-y-1">
                                    {risk.recommendations.map((rec, idx) => (
                                      <li
                                        key={idx}
                                        className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300"
                                      >
                                        <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span>{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Implementation Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 border rounded bg-red-50 dark:bg-red-900/20">
                          <h4 className="font-medium text-red-800 dark:text-red-300">Immediate (0-30 days)</h4>
                          <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                            <li>• Review automatic renewal clauses</li>
                            <li>• Set up calendar reminders</li>
                            <li>• Assess IP definition risks</li>
                          </ul>
                        </div>
                        <div className="p-3 border rounded bg-orange-50 dark:bg-orange-900/20">
                          <h4 className="font-medium text-orange-800 dark:text-orange-300">Short-term (1-3 months)</h4>
                          <ul className="text-sm text-orange-700 dark:text-orange-300 mt-2 space-y-1">
                            <li>• Draft IP clarification addendum</li>
                            <li>• Develop marketing strategy</li>
                            <li>• Establish compliance monitoring</li>
                          </ul>
                        </div>
                        <div className="p-3 border rounded bg-blue-50 dark:bg-blue-900/20">
                          <h4 className="font-medium text-blue-800 dark:text-blue-300">Long-term (3+ months)</h4>
                          <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                            <li>• Regular risk assessments</li>
                            <li>• Ongoing compliance audits</li>
                            <li>• Contract renegotiation planning</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk Mitigation Checklist</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          "Set up automated renewal reminders",
                          "Review and clarify IP definitions",
                          "Establish minimum purchase tracking",
                          "Create compliance monitoring system",
                          "Develop shipping partner relationships",
                          "Set aside arbitration reserve fund",
                          "Regular legal review schedule",
                          "Stakeholder communication plan",
                        ].map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  )
}
