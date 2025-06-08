"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Users, Calendar, Globe, DollarSign, Shield, TrendingUp, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"
import type { ContractData } from "@/lib/contract-service"

interface ContractSummaryProps {
  data: ContractData
}

export default function ContractSummary({ data }: ContractSummaryProps) {
  // Add null checks and default values
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No contract data available</h3>
          <p className="text-gray-500 dark:text-gray-500">Please upload and analyze a contract first</p>
        </div>
      </div>
    )
  }

  const timeline = data.timeline || []
  const risks = data.risks || []
  const keyTerms = data.keyTerms || []
  const parties = data.parties || []
  const products = data.products || []

  const completedEvents = timeline.filter((event) => event.completed).length
  const totalEvents = timeline.length
  const progressPercentage = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0

  const highRisks = risks.filter((risk) => risk.category === "High").length
  const mediumRisks = risks.filter((risk) => risk.category === "Medium").length
  const lowRisks = risks.filter((risk) => risk.category === "Low").length

  const criticalTerms = keyTerms.filter((term) => term.importance === "Critical").length
  const highTerms = keyTerms.filter((term) => term.importance === "High").length

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Executive Summary
            </CardTitle>
            <CardDescription>AI-generated overview of the contract analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                This contract analysis reveals a comprehensive agreement between{" "}
                <strong>{parties.length > 0 ? parties.length : "multiple"} parties</strong> with{" "}
                <strong>{timeline.length} key milestones</strong> and <strong>{risks.length} identified risks</strong>.
                The agreement covers <strong>{products.length} products</strong> with various obligations and
                requirements. Key areas of focus include risk management, timeline compliance, and term adherence.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{parties.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Contract Parties</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{Math.round(progressPercentage)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Timeline Progress</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">{highRisks}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">High Risk Factors</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">{criticalTerms}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Critical Terms</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Contract Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle>Contract Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Globe className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Territory</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {data.contractInfo?.territory || "Global coverage"}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {data.contractInfo?.exclusivity ? "Exclusive Rights" : "Non-exclusive"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Contract Term</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {data.contractInfo?.contractTerm?.initialTerm || "Long-term agreement"}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {data.contractInfo?.contractTerm?.renewalType || "Renewable"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Financial Terms</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {data.contractInfo?.totalValue && data.contractInfo.totalValue > 0
                      ? `${data.contractInfo.currency || 'USD'} ${data.contractInfo.totalValue.toLocaleString()}`
                      : "Structured payment terms"
                    }
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {data.contractInfo?.financialTerms?.paymentTerms || "Commercial Agreement"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="w-8 h-8 text-purple-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Risk Management</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {risks.length} risks identified and assessed
                  </p>
                  <Badge variant="outline" className="mt-1">
                    Comprehensive Coverage
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <TrendingUp className="w-8 h-8 text-indigo-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Key Terms</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {keyTerms.length} terms extracted and analyzed
                  </p>
                  <Badge variant="outline" className="mt-1">
                    Detailed Analysis
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-8 h-8 text-pink-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Stakeholders</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {parties.length} parties with defined roles
                  </p>
                  <Badge variant="outline" className="mt-1">
                    Multi-party Agreement
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Parties Details */}
      {parties.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle>Contract Parties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {parties.map((party, index) => (
                  <motion.div
                    key={party.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">
                        {party.name && party.name !== "Unknown Party" && !party.name.includes("Party")
                          ? party.name
                          : party.legalName || "Contract Party"}
                      </h4>
                      <Badge
                        variant={
                          party.type === "supplier" ? "default" : party.type === "buyer" ? "secondary" : "outline"
                        }
                      >
                        {party.entityType || party.type || "Corporation"}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Role:</span>
                        <span className="text-gray-600 dark:text-gray-400">{party.role || "Contract Party"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium">Location:</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {party.address && (party.address.street || party.address.city || party.address.country)
                            ? `${party.address.street ? party.address.street + ', ' : ''}${party.address.city ? party.address.city + ', ' : ''}${party.address.country || ''}`
                            : party.location || "Address not specified"}
                        </span>
                      </div>
                      {party.description && !party.description.includes("Party") && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium">Description:</span>
                          <span className="text-gray-600 dark:text-gray-400">{party.description}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Risk & Progress Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{highRisks}</div>
                    <div className="text-xs text-red-600">High Risk</div>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{mediumRisks}</div>
                    <div className="text-xs text-orange-600">Medium Risk</div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{lowRisks}</div>
                    <div className="text-xs text-green-600">Low Risk</div>
                  </div>
                </div>

                {risks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Top Risk Factors</h4>
                    {risks.slice(0, 3).map((risk, index) => (
                      <div key={risk.id || index} className="flex items-center gap-2 text-sm">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            risk.category === "High"
                              ? "bg-red-500"
                              : risk.category === "Medium"
                                ? "bg-orange-500"
                                : "bg-green-500"
                          }`}
                        />
                        <span className="truncate">{risk.title || "Unknown Risk"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card>
            <CardHeader>
              <CardTitle>Timeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{completedEvents}</div>
                    <div className="text-xs text-blue-600">Completed</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                    <div className="text-xl font-bold text-gray-600">{totalEvents - completedEvents}</div>
                    <div className="text-xs text-gray-600">Remaining</div>
                  </div>
                </div>

                {timeline.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Upcoming Milestones</h4>
                    {timeline
                      .filter((event) => !event.completed)
                      .slice(0, 3)
                      .map((event, index) => (
                        <div key={event.id || index} className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="truncate">{event.event || "Unknown Event"}</span>
                          <span className="text-xs text-gray-500">
                            {event.date ? new Date(event.date).toLocaleDateString() : "No date"}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Products Overview */}
      {products.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
          <Card>
            <CardHeader>
              <CardTitle>Products & Minimum Quantities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product, index) => (
                  <motion.div
                    key={product.id || index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.1 + index * 0.05 }}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border"
                  >
                    <div className="font-medium text-sm">
                      {product.name && !product.name.includes("Contract Deliverables") && !product.name.includes("Unknown")
                        ? product.name
                        : "Contract Deliverables"}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Quantity: {product.quantity && product.quantity > 1 ? product.quantity.toLocaleString() : 1} {product.unit || "units"}
                    </div>
                    {product.pricing && product.pricing.unitPrice && product.pricing.unitPrice > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Price: {product.pricing.currency || 'USD'} {product.pricing.unitPrice.toLocaleString()}
                      </div>
                    )}
                    {product.category && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {product.category}
                      </Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
