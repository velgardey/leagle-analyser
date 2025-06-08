"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TrendingUp, Star, DollarSign, Scale, FileText, Search, Copy, Users, Building, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import type { ContractData } from "@/lib/contract-service"

interface KeyTermsExtractionProps {
  data: ContractData
}

export default function KeyTermsExtraction({ data }: KeyTermsExtractionProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedImportance, setSelectedImportance] = useState("all")
  const [activeTab, setActiveTab] = useState("terms")
  const { toast } = useToast()

  const getImportanceColor = (importance: string) => {
    switch (importance.toLowerCase()) {
      case "critical":
        return "text-red-600 bg-red-100 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400"
      case "high":
        return "text-orange-600 bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400"
      case "medium":
        return "text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
      case "low":
        return "text-green-600 bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
      default:
        return "text-gray-600 bg-gray-100 border-gray-200 dark:bg-gray-900/30 dark:border-gray-800 dark:text-gray-400"
    }
  }

  const getImportanceIcon = (importance: string) => {
    switch (importance.toLowerCase()) {
      case "critical":
        return <Star className="h-4 w-4 fill-current" />
      case "high":
        return <Star className="h-4 w-4" />
      case "medium":
        return <TrendingUp className="h-4 w-4" />
      case "low":
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "financial":
        return <DollarSign className="h-4 w-4" />
      case "operational":
        return <Clock className="h-4 w-4" />
      case "legal":
        return <Scale className="h-4 w-4" />
      case "commercial":
        return <TrendingUp className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const filteredTerms = data.keyTerms.filter((term) => {
    const matchesSearch =
      term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesImportance =
      selectedImportance === "all" || term.importance.toLowerCase() === selectedImportance.toLowerCase()
    const matchesCategory = selectedCategory === "all" || term.category.toLowerCase() === selectedCategory.toLowerCase()
    return matchesSearch && matchesImportance && matchesCategory
  })

  const handleCopyTerm = (term: string) => {
    navigator.clipboard.writeText(term)
    toast({
      title: "Term Copied",
      description: `"${term}" copied to clipboard.`,
      duration: 3000,
    })
  }

  const categories = [...new Set(data.keyTerms.map((term) => term.category))]
  const importanceLevels = [...new Set(data.keyTerms.map((term) => term.importance))]

  // Extract obligations from AI-generated key terms and timeline data
  const extractObligationsFromData = () => {
    const manufacturerObligations: Array<{title: string, description: string, clause: string}> = []
    const customerObligations: Array<{title: string, description: string, clause: string}> = []

    // Extract from key terms
    data.keyTerms.forEach(term => {
      if (term.definition.toLowerCase().includes('manufacturer') || term.definition.toLowerCase().includes('supplier')) {
        manufacturerObligations.push({
          title: term.term,
          description: term.definition,
          clause: term.clauses.join(', ')
        })
      } else if (term.definition.toLowerCase().includes('customer') || term.definition.toLowerCase().includes('buyer')) {
        customerObligations.push({
          title: term.term,
          description: term.definition,
          clause: term.clauses.join(', ')
        })
      }
    })

    // Extract from timeline events
    data.timeline.forEach(event => {
      if (event.responsibleParty && event.responsibleParty.toLowerCase().includes('manufacturer')) {
        manufacturerObligations.push({
          title: event.event,
          description: event.description,
          clause: 'Timeline Event'
        })
      } else if (event.responsibleParty && event.responsibleParty.toLowerCase().includes('customer')) {
        customerObligations.push({
          title: event.event,
          description: event.description,
          clause: 'Timeline Event'
        })
      }
    })

    return { manufacturerObligations, customerObligations }
  }

  const { manufacturerObligations, customerObligations } = extractObligationsFromData()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Key Terms & Contract Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive extraction and analysis of critical contract terms, obligations, and products
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="terms">Terms & Definitions</TabsTrigger>
              <TabsTrigger value="obligations">Obligations</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>

            <TabsContent value="terms" className="mt-6">
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search terms and definitions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedImportance}
                      onChange={(e) => setSelectedImportance(e.target.value)}
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="all">All Importance</option>
                      {importanceLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    Showing {filteredTerms.length} of {data.keyTerms.length} terms
                  </span>
                  {(searchTerm || selectedCategory !== "all" || selectedImportance !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("")
                        setSelectedCategory("all")
                        setSelectedImportance("all")
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Terms List */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {filteredTerms.length > 0 ? (
                      filteredTerms.map((term, index) => (
                        <motion.div
                          key={term.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 border rounded-lg hover:shadow-md transition-all ${getImportanceColor(
                            term.importance,
                          )}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getImportanceIcon(term.importance)}
                              <h4 className="font-semibold text-lg">{term.term}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getCategoryIcon(term.category)}
                                <span className="ml-1">{term.category}</span>
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {term.importance}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyTerm(term.term)}
                                className="h-8 w-8 p-0"
                                title="Copy term"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm opacity-90 mb-3">{term.definition}</p>
                          {term.clauses && (
                            <div className="text-xs">
                              <span className="font-medium">Referenced in clauses: </span>
                              <span className="font-mono">{term.clauses.join(", ")}</span>
                            </div>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                          <Search className="h-12 w-12 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No terms found</h3>
                        <p className="text-gray-500 dark:text-gray-500">Try adjusting your search or filters</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="obligations" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-500">
                      <Building className="w-5 h-5" />
                      Manufacturer Obligations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {manufacturerObligations.map((obligation, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-green-800 dark:text-green-400">{obligation.title}</h5>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">{obligation.description}</p>
                            <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-mono">
                              Clause: {obligation.clause}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-500">
                      <Users className="w-5 h-5" />
                      Customer Obligations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customerObligations.map((obligation, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-blue-800 dark:text-blue-400">{obligation.title}</h5>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{obligation.description}</p>
                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-mono">
                              Clause: {obligation.clause}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium">{product.name}</h5>
                          <Badge variant="outline" className="text-xs mt-1">
                            {product.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Minimum Quantity:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {product.quantity.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Unit:</span>
                          <span className="text-gray-700 dark:text-gray-300">{product.unit}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Product Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{data.products.length}</div>
                        <div className="text-sm text-blue-600">Total Products</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {data.products.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-green-600">Total Units</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {[...new Set(data.products.map((p) => p.category))].length}
                        </div>
                        <div className="text-sm text-purple-600">Categories</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">4</div>
                        <div className="text-sm text-orange-600">New Products/Year</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
