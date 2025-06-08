"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ZoomIn, ZoomOut, RotateCcw, Download, ChevronLeft, ChevronRight, FileText, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import type { ContractData } from "@/lib/contract-service"

interface PDFViewerProps {
  data: ContractData
  highlightRisks?: boolean
  selectedClause?: string | null
  useOriginalPdf?: boolean  // Option to view original PDF without highlights
}

export default function PDFViewer({ data, highlightRisks = true, selectedClause, useOriginalPdf = false }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [showOriginal, setShowOriginal] = useState(useOriginalPdf)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const totalPages = data.documentStructure?.totalPages || 1

  useEffect(() => {
    // Choose which PDF to display
    let pdfBlobToUse: string | undefined
    let displayMode: string

    if (showOriginal) {
      pdfBlobToUse = data.originalPdfBlob || data.pdfBlob
      displayMode = "(original)"
    } else {
      // If we don't have a highlighted version, show original
      if (data.hasHighlightedVersion && data.pdfBlob !== data.originalPdfBlob) {
        pdfBlobToUse = data.pdfBlob
        displayMode = "(highlighted)"
      } else {
        pdfBlobToUse = data.originalPdfBlob || data.pdfBlob
        displayMode = "(original - highlighting not available)"
        // Auto-switch to original mode if highlighting failed
        if (!showOriginal) {
          setShowOriginal(true)
        }
      }
    }

    if (pdfBlobToUse) {
      console.log("Loading PDF in viewer:", pdfBlobToUse, displayMode)
      setIsLoading(true)
      setError(null)

      // Add a small delay to ensure the blob is ready
      setTimeout(() => {
        if (iframeRef.current) {
          try {
            const pdfUrl = `${pdfBlobToUse}#page=${currentPage}&zoom=${zoom}&toolbar=0&navpanes=0&scrollbar=0`
            iframeRef.current.src = pdfUrl
            console.log("PDF URL set:", pdfUrl)
          } catch (err) {
            console.error("Error setting PDF URL:", err)
            setError("Failed to load PDF document")
            setIsLoading(false)
          }
        }
      }, 100)
    } else {
      setError("PDF document not available")
      setIsLoading(false)
    }
  }, [data.pdfBlob, data.originalPdfBlob, data.hasHighlightedVersion, currentPage, zoom, showOriginal])

  const handleIframeLoad = () => {
    console.log("PDF iframe loaded successfully")
    setIsLoading(false)
    setPdfLoaded(true)
    setError(null)
  }

  const handleIframeError = () => {
    console.error("PDF iframe failed to load")
    setError("Failed to display PDF document")
    setIsLoading(false)
    setPdfLoaded(false)
  }

  // Note: Risk highlighting is now done directly in the PDF, no overlay needed

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(50, Math.min(200, newZoom))
    setZoom(clampedZoom)
  }

  const handleDownload = () => {
    let pdfBlobToDownload: string | undefined
    let prefix: string

    if (showOriginal || !data.hasHighlightedVersion) {
      pdfBlobToDownload = data.originalPdfBlob || data.pdfBlob
      prefix = "original_"
    } else {
      pdfBlobToDownload = data.pdfBlob
      prefix = "highlighted_"
    }

    if (pdfBlobToDownload) {
      const link = document.createElement("a")
      link.href = pdfBlobToDownload
      const fileName = data.fileName || "contract.pdf"
      link.download = `${prefix}${fileName}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const togglePdfView = () => {
    if (data.hasHighlightedVersion) {
      setShowOriginal(!showOriginal)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Contract Document
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{data.fileName || "Contract.pdf"}</Badge>
            <Badge variant="secondary">
              {data.fileSize ? `${(data.fileSize / 1024).toFixed(2)} KB` : "Unknown size"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-4">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleZoomChange(zoom - 10)}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={() => handleZoomChange(zoom + 10)}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleZoomChange(100)}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* PDF View Toggle */}
            {data.originalPdfBlob && data.hasHighlightedVersion && (
              <Button
                variant={showOriginal ? "outline" : "default"}
                size="sm"
                onClick={togglePdfView}
              >
                <FileText className="w-4 h-4 mr-2" />
                {showOriginal ? "Show Highlighted" : "Show Original"}
              </Button>
            )}

            {/* Highlighting Status */}
            {!data.hasHighlightedVersion && (
              <Badge variant="secondary" className="text-xs">
                Original PDF (Highlighting unavailable)
              </Badge>
            )}

            {/* Download Button */}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download {(showOriginal || !data.hasHighlightedVersion) ? "Original" : "Highlighted"}
            </Button>
          </div>
        </div>

        {/* PDF Viewer Container */}
        <div className="relative h-[700px] bg-gray-100 dark:bg-gray-900">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {(data.pdfBlob || data.originalPdfBlob) && !error && (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Contract PDF"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ display: isLoading ? "none" : "block" }}
            />
          )}
        </div>

        {/* Highlighting Information */}
        {highlightRisks && data.hasHighlightedVersion && !showOriginal && (
          <div className="p-4 border-t bg-green-50 dark:bg-green-900/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              PDF Highlighting Active
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This PDF has been automatically highlighted with risk areas, party names, and key terms.
              Use the "Show Original" button to view the unmodified document.
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span>High Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-400 rounded"></div>
                <span>Medium Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span>Low Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-400 rounded"></div>
                <span>Parties/Terms</span>
              </div>
            </div>
          </div>
        )}

        {/* Highlighting Unavailable Information */}
        {highlightRisks && !data.hasHighlightedVersion && (
          <div className="p-4 border-t bg-yellow-50 dark:bg-yellow-900/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              PDF Highlighting Unavailable
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic PDF highlighting could not be generated for this document.
              You are viewing the original PDF. Risk information is still available in other tabs.
            </p>
          </div>
        )}

        {/* PDF Info */}
        <div className="p-4 border-t bg-blue-50 dark:bg-blue-900/20">
          <h4 className="font-medium mb-2">Document Information:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">File Name:</span> {data.fileName}
            </div>
            <div>
              <span className="font-medium">File Size:</span>{" "}
              {data.fileSize ? `${(data.fileSize / 1024).toFixed(2)} KB` : "Unknown"}
            </div>
            <div>
              <span className="font-medium">Analysis Date:</span>{" "}
              {data.analysisDate ? new Date(data.analysisDate).toLocaleDateString() : "Unknown"}
            </div>
            <div>
              <span className="font-medium">Total Pages:</span> {totalPages}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
