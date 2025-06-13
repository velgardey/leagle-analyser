"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Network, Users, Building, User, Download } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"

interface PartyRelationshipDiagramProps {
  data: any
}

export default function PartyRelationshipDiagram({ data }: PartyRelationshipDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedParty, setSelectedParty] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!svgRef.current || !data || !data.contractInfo?.parties) return

    const svg = svgRef.current
    const width = 900
    const height = 600

    // Clear previous content
    svg.innerHTML = ""

    const parties = data.contractInfo.parties
    const relationships = data.relationships || []

    // Create SVG elements
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    svg.appendChild(g)

    // Calculate positions for parties in a circle layout with better spacing
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.35 // Increased radius for better spacing

    const positions: Record<string, { x: number; y: number }> = {}

    parties.forEach((party: any, index: number) => {
      const angle = (index * 2 * Math.PI) / parties.length - Math.PI / 2
      positions[party.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })

    // Add definitions for gradients and markers
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")

    // Create gradient definitions
    const gradients = [
      { id: "supplier-gradient", color1: "#10b981", color2: "#059669" },
      { id: "buyer-gradient", color1: "#3b82f6", color2: "#2563eb" },
      { id: "consultant-gradient", color1: "#8b5cf6", color2: "#7c3aed" },
      { id: "other-gradient", color1: "#f59e0b", color2: "#d97706" },
    ]

    gradients.forEach((gradient) => {
      const linearGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient")
      linearGradient.setAttribute("id", gradient.id)
      linearGradient.setAttribute("x1", "0%")
      linearGradient.setAttribute("y1", "0%")
      linearGradient.setAttribute("x2", "100%")
      linearGradient.setAttribute("y2", "100%")

      const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop")
      stop1.setAttribute("offset", "0%")
      stop1.setAttribute("stop-color", gradient.color1)

      const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop")
      stop2.setAttribute("offset", "100%")
      stop2.setAttribute("stop-color", gradient.color2)

      linearGradient.appendChild(stop1)
      linearGradient.appendChild(stop2)
      defs.appendChild(linearGradient)
    })

    // Create arrow markers
    const markerColors = [
      { id: "arrowhead-strong", color: "#3b82f6" },
      { id: "arrowhead-medium", color: "#8b5cf6" },
      { id: "arrowhead-weak", color: "#9ca3af" },
    ]

    markerColors.forEach((marker) => {
      const arrowMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker")
      arrowMarker.setAttribute("id", marker.id)
      arrowMarker.setAttribute("markerWidth", "10")
      arrowMarker.setAttribute("markerHeight", "7")
      arrowMarker.setAttribute("refX", "9")
      arrowMarker.setAttribute("refY", "3.5")
      arrowMarker.setAttribute("orient", "auto")

      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
      polygon.setAttribute("points", "0 0, 10 3.5, 0 7")
      polygon.setAttribute("fill", marker.color)

      arrowMarker.appendChild(polygon)
      defs.appendChild(arrowMarker)
    })

    svg.insertBefore(defs, g)

    // Draw connections with animations
    relationships.forEach((rel: any, index: number) => {
      const fromPos = positions[rel.from]
      const toPos = positions[rel.to]

      if (!fromPos || !toPos) return

      const getMarkerAndColor = (strength: string) => {
        switch (strength) {
          case "strong":
            return { marker: "arrowhead-strong", color: "#3b82f6", width: "3" }
          case "medium":
            return { marker: "arrowhead-medium", color: "#8b5cf6", width: "2.5" }
          case "weak":
            return { marker: "arrowhead-weak", color: "#9ca3af", width: "2" }
          default:
            return { marker: "arrowhead-medium", color: "#6b7280", width: "2" }
        }
      }

      const { marker, color, width } = getMarkerAndColor(rel.strength)

      // Create curved path
      const dx = toPos.x - fromPos.x
      const dy = toPos.y - fromPos.y
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.2

      const path = `M${fromPos.x},${fromPos.y} A${dr},${dr} 0 0,1 ${toPos.x},${toPos.y}`

      const line = document.createElementNS("http://www.w3.org/2000/svg", "path")
      line.setAttribute("d", path)
      line.setAttribute("stroke", color)
      line.setAttribute("stroke-width", width)
      line.setAttribute("fill", "none")
      line.setAttribute("marker-end", `url(#${marker})`)
      line.setAttribute(
        "opacity",
        selectedParty ? (rel.from === selectedParty || rel.to === selectedParty ? "1" : "0.3") : "1",
      )
      line.setAttribute("stroke-dasharray", "5,5")

      // Add animation
      const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate")
      animate.setAttribute("attributeName", "stroke-dashoffset")
      animate.setAttribute("from", "1000")
      animate.setAttribute("to", "0")
      animate.setAttribute("dur", "3s")
      animate.setAttribute("begin", `${index * 0.5}s`)
      animate.setAttribute("fill", "freeze")

      line.appendChild(animate)
      g.appendChild(line)

      // Relationship label with background
      const midX = (fromPos.x + toPos.x) / 2
      const midY = (fromPos.y + toPos.y) / 2 - 20

      const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      const estimatedWidth = rel.type.length * 7 + 16
      textBg.setAttribute("x", (midX - estimatedWidth / 2).toString())
      textBg.setAttribute("y", (midY - 12).toString())
      textBg.setAttribute("width", estimatedWidth.toString())
      textBg.setAttribute("height", "20")
      textBg.setAttribute("rx", "6")
      textBg.setAttribute("fill", "white")
      textBg.setAttribute("opacity", "0.95")
      textBg.setAttribute("stroke", color)
      textBg.setAttribute("stroke-width", "1")

      g.appendChild(textBg)

      const textPath = document.createElementNS("http://www.w3.org/2000/svg", "text")
      textPath.setAttribute("x", midX.toString())
      textPath.setAttribute("y", midY.toString())
      textPath.setAttribute("text-anchor", "middle")
      textPath.setAttribute("fill", "#374151")
      textPath.setAttribute("font-size", "12")
      textPath.setAttribute("font-weight", "bold")
      textPath.setAttribute(
        "opacity",
        selectedParty ? (rel.from === selectedParty || rel.to === selectedParty ? "1" : "0.3") : "1",
      )
      textPath.textContent = rel.type.replace("_", " ")

      g.appendChild(textPath)
    })

    // Draw party nodes with enhanced styling
    parties.forEach((party: any, index: number) => {
      const pos = positions[party.id]
      if (!pos) return

      const getFill = (type: string) => {
        switch (type) {
          case "supplier":
            return "url(#supplier-gradient)"
          case "buyer":
            return "url(#buyer-gradient)"
          case "consultant":
            return "url(#consultant-gradient)"
          default:
            return "url(#other-gradient)"
        }
      }

      // Shadow
      const shadow = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      shadow.setAttribute("cx", (pos.x + 4).toString())
      shadow.setAttribute("cy", (pos.y + 4).toString())
      shadow.setAttribute("r", "90") // Increased radius
      shadow.setAttribute("fill", "rgba(0,0,0,0.2)")
      shadow.setAttribute("opacity", selectedParty ? (party.id === selectedParty ? "1" : "0.3") : "1")
      g.appendChild(shadow)

      // Main circle
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      circle.setAttribute("cx", pos.x.toString())
      circle.setAttribute("cy", pos.y.toString())
      circle.setAttribute("r", "90") // Increased radius for better text fit
      circle.setAttribute("fill", getFill(party.type))
      circle.setAttribute("stroke", "#ffffff")
      circle.setAttribute("stroke-width", "4") // Slightly thicker border
      circle.style.cursor = "pointer"
      circle.setAttribute("opacity", selectedParty ? (party.id === selectedParty ? "1" : "0.3") : "1")

      // Add click and hover events
      circle.addEventListener("click", () => {
        setSelectedParty(selectedParty === party.id ? null : party.id)
        toast({
          title: "Party Selected",
          description: `Viewing details for ${party.name}`,
          duration: 2000,
        })
      })

      circle.addEventListener("mouseenter", () => {
        circle.setAttribute("stroke-width", "6")
        circle.setAttribute("stroke", "#f3f4f6")
      })

      circle.addEventListener("mouseleave", () => {
        circle.setAttribute("stroke-width", "4")
        circle.setAttribute("stroke", "#ffffff")
      })

      g.appendChild(circle)

      // Party icon (larger for better visibility)
      const iconSize = 36
      const iconX = pos.x - iconSize / 2
      const iconY = pos.y - 45

      const icon = document.createElementNS("http://www.w3.org/2000/svg", "g")

      if (party.type === "supplier") {
        const building = document.createElementNS("http://www.w3.org/2000/svg", "path")
        building.setAttribute(
          "d",
          "M3 21h18v-2H3v2zm3-7h12v2H6v-2zm0-4h12v2H6v-2zm0-4h12v2H6V6zm15-2h-3V1h-2v3H8V1H6v3H3v2h18V4z",
        )
        building.setAttribute("transform", `translate(${iconX}, ${iconY}) scale(1)`)
        building.setAttribute("fill", "white")
        icon.appendChild(building)
      } else if (party.type === "buyer") {
        const user = document.createElementNS("http://www.w3.org/2000/svg", "path")
        user.setAttribute(
          "d",
          "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
        )
        user.setAttribute("transform", `translate(${iconX}, ${iconY}) scale(1)`)
        user.setAttribute("fill", "white")
        icon.appendChild(user)
      } else {
        const users = document.createElementNS("http://www.w3.org/2000/svg", "path")
        users.setAttribute(
          "d",
          "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
        )
        users.setAttribute("transform", `translate(${iconX}, ${iconY}) scale(1)`)
        users.setAttribute("fill", "white")
        icon.appendChild(users)
      }

      icon.setAttribute("opacity", selectedParty ? (party.id === selectedParty ? "1" : "0.3") : "1")
      g.appendChild(icon)

      // Party name (with better text wrapping)
      const nameText = party.name.length > 16 ? party.name.substring(0, 14) + "..." : party.name

      // Split long names into multiple lines if needed
      const nameLines = []
      if (nameText.length > 12) {
        const words = nameText.split(' ')
        let currentLine = ''
        for (const word of words) {
          if ((currentLine + word).length > 12 && currentLine.length > 0) {
            nameLines.push(currentLine.trim())
            currentLine = word + ' '
          } else {
            currentLine += word + ' '
          }
        }
        if (currentLine.trim()) {
          nameLines.push(currentLine.trim())
        }
      } else {
        nameLines.push(nameText)
      }

      // Render name lines
      nameLines.forEach((line, index) => {
        const name = document.createElementNS("http://www.w3.org/2000/svg", "text")
        name.setAttribute("x", pos.x.toString())
        name.setAttribute("y", (pos.y - 10 + (index * 16)).toString())
        name.setAttribute("text-anchor", "middle")
        name.setAttribute("fill", "white")
        name.setAttribute("font-size", "13")
        name.setAttribute("font-weight", "bold")
        name.textContent = line
        name.setAttribute("opacity", selectedParty ? (party.id === selectedParty ? "1" : "0.3") : "1")
        g.appendChild(name)
      })

      // Party role
      const role = document.createElementNS("http://www.w3.org/2000/svg", "text")
      role.setAttribute("x", pos.x.toString())
      role.setAttribute("y", (pos.y + 20 + (nameLines.length - 1) * 16).toString())
      role.setAttribute("text-anchor", "middle")
      role.setAttribute("fill", "white")
      role.setAttribute("font-size", "11")
      role.setAttribute("font-weight", "normal")
      const displayRole = party.role.length > 18 ? party.role.substring(0, 15) + "..." : party.role
      role.textContent = displayRole
      role.setAttribute("opacity", selectedParty ? (party.id === selectedParty ? "1" : "0.3") : "1")
      g.appendChild(role)

      // Location (positioned below the larger circle)
      const location = document.createElementNS("http://www.w3.org/2000/svg", "text")
      location.setAttribute("x", pos.x.toString())
      location.setAttribute("y", (pos.y + 110).toString()) // Adjusted for larger circle
      location.setAttribute("text-anchor", "middle")
      location.setAttribute("fill", "#6b7280")
      location.setAttribute("font-size", "11")
      const displayLocation = party.location.length > 20 ? party.location.substring(0, 17) + "..." : party.location
      location.textContent = displayLocation
      location.setAttribute("opacity", selectedParty ? (party.id === selectedParty ? "1" : "0.3") : "1")
      g.appendChild(location)
    })
  }, [data, selectedParty])

  const handleExport = () => {
    toast({
      title: "Diagram Export",
      description: "Relationship diagram has been exported as SVG.",
      duration: 3000,
    })
  }

  if (!data || !data.contractInfo?.parties) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <Network className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No relationship data available</h3>
          <p className="text-gray-500 dark:text-gray-500">Please upload and analyze a contract first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Party Relationships & Dependencies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Party Relationships & Dependencies
              </CardTitle>
              <CardDescription>Interactive visualization of contract parties and their relationships</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Diagram
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={`w-full overflow-x-auto ${isFullscreen ? "fixed inset-0 z-50 bg-white p-8" : ""}`}>
              <svg
                ref={svgRef}
                width="900"
                height="600"
                viewBox="0 0 900 600"
                className={`border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 ${
                  isFullscreen ? "w-full h-full" : ""
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Party Details */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.contractInfo.parties.map((party: any) => (
          <motion.div
            key={party.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 border rounded-lg transition-all cursor-pointer ${
              selectedParty === party.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "hover:border-gray-300"
            }`}
            onClick={() => setSelectedParty(selectedParty === party.id ? null : party.id)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`p-2 rounded-full ${
                  party.type === "supplier"
                    ? "bg-green-100 text-green-600"
                    : party.type === "buyer"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-purple-100 text-purple-600"
                }`}
              >
                {party.type === "supplier" ? (
                  <Building className="w-4 h-4" />
                ) : party.type === "buyer" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-lg">{party.name}</h4>
                <Badge variant={party.type === "supplier" ? "default" : "secondary"}>{party.type}</Badge>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Role:</span>
                <span>{party.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Location:</span>
                <span>{party.location}</span>
              </div>
              {party.description && (
                <div className="flex items-start gap-2">
                  <span className="font-medium">Description:</span>
                  <span className="text-gray-600 dark:text-gray-400">{party.description}</span>
                </div>
              )}
            </div>

            <AnimatePresence>
              {selectedParty === party.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                >
                  <h5 className="font-medium mb-2">Related Relationships:</h5>
                  <div className="space-y-1">
                    {data.relationships
                      .filter((rel: any) => rel.from === party.id || rel.to === party.id)
                      .map((rel: any, index: number) => (
                        <div key={index} className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          {rel.from === party.id
                            ? `→ ${data.contractInfo.parties.find((p: any) => p.id === rel.to)?.name}: ${rel.description}`
                            : `← ${data.contractInfo.parties.find((p: any) => p.id === rel.from)?.name}: ${rel.description}`}
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
