"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TimerIcon, Play, Pause, SkipForward, SkipBack, CheckCircle, AlertCircle, Clock, Calendar } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"

interface ContractTimelineProps {
  data: any
}

export default function ContractTimeline({ data }: ContractTimelineProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline")
  const { toast } = useToast()

  const timeline = data.timeline || []

  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= timeline.length - 1) {
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            setIsPlaying(false)
            toast({
              title: "Timeline Complete",
              description: "Reached the end of the contract timeline.",
              duration: 3000,
            })
          }, 0)
          return prev
        }
        return prev + 1
      })
    }, 2000 / playbackSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, timeline.length, playbackSpeed, toast])

  const getEventIcon = (type: string, completed: boolean) => {
    if (completed) {
      return <CheckCircle className="h-6 w-6 text-green-600" />
    }

    switch (type) {
      case "milestone":
        return <Calendar className="h-6 w-6 text-blue-600" />
      case "obligation":
        return <Clock className="h-6 w-6 text-orange-600" />
      case "deadline":
        return <AlertCircle className="h-6 w-6 text-red-600" />
      case "critical":
        return <AlertCircle className="h-6 w-6 text-purple-600" />
      default:
        return <Calendar className="h-6 w-6 text-gray-600" />
    }
  }

  const getEventColor = (type: string, completed: boolean) => {
    if (completed) return "bg-green-100 border-green-300 dark:bg-green-900/20 dark:border-green-800"

    switch (type) {
      case "milestone":
        return "bg-blue-100 border-blue-300 dark:bg-blue-900/20 dark:border-blue-800"
      case "obligation":
        return "bg-orange-100 border-orange-300 dark:bg-orange-900/20 dark:border-orange-800"
      case "deadline":
        return "bg-red-100 border-red-300 dark:bg-red-900/20 dark:border-red-800"
      case "critical":
        return "bg-purple-100 border-purple-300 dark:bg-purple-900/20 dark:border-purple-800"
      default:
        return "bg-gray-100 border-gray-300 dark:bg-gray-900/20 dark:border-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "Invalid Date"
    }
  }

  const getDaysUntil = (dateString: string) => {
    try {
      const eventDate = new Date(dateString)
      const now = new Date()
      const diffTime = eventDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
      if (diffDays === 0) return "Today"
      return `${diffDays} days away`
    } catch {
      return "Unknown"
    }
  }

  const completedEvents = timeline.filter((event: any) => event.completed).length
  const totalEvents = timeline.length
  const progressPercentage = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0

  // Group events by year and month for calendar view
  const groupedEvents = timeline.reduce((acc: any, event: any) => {
    try {
      const date = new Date(event.date)
      const year = date.getFullYear()
      const month = date.getMonth()

      if (!acc[year]) {
        acc[year] = {}
      }

      if (!acc[year][month]) {
        acc[year][month] = []
      }

      acc[year][month].push(event)
      return acc
    } catch {
      return acc
    }
  }, {})

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <TimerIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No timeline data available</h3>
          <p className="text-gray-500 dark:text-gray-500">Please upload and analyze a contract first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timeline Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TimerIcon className="w-5 h-5" />
                Contract Timeline & Milestones
              </CardTitle>
              <CardDescription>
                Interactive timeline showing contract milestones, deadlines, and obligations
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border rounded-md p-1">
                <Button
                  variant={viewMode === "timeline" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("timeline")}
                >
                  Timeline
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                >
                  Calendar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.min(timeline.length - 1, currentIndex + 1))}
                  disabled={currentIndex === timeline.length - 1}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="px-2 py-1 text-sm border rounded"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{completedEvents}</div>
                <div className="text-sm text-blue-600">Completed</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {timeline.filter((e: any) => !e.completed && new Date(e.date) <= new Date()).length}
                </div>
                <div className="text-sm text-orange-600">Overdue</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {timeline.filter((e: any) => !e.completed && new Date(e.date) > new Date()).length}
                </div>
                <div className="text-sm text-green-600">Upcoming</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{progressPercentage.toFixed(2)}%</div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{progressPercentage.toFixed(2)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      <AnimatePresence mode="wait">
        {viewMode === "timeline" ? (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="relative">
                  {/* Timeline Events */}
                  <div className="space-y-8">
                    {timeline.map((event: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{
                          opacity: index <= currentIndex ? 1 : 0.4,
                          x: 0,
                          scale: index === currentIndex ? 1.02 : 1,
                        }}
                        transition={{
                          delay: index * 0.1,
                          duration: 0.5,
                          scale: { duration: 0.3 },
                        }}
                        className={`relative flex items-start gap-6 p-4 rounded-lg border transition-all cursor-pointer ${getEventColor(
                          event.type,
                          event.completed,
                        )} ${index === currentIndex ? "shadow-lg ring-2 ring-blue-500" : "hover:shadow-md"}`}
                        onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                      >
                        {/* Timeline Dot */}
                        <div className="relative z-10 flex-shrink-0">
                          <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-4 border-current flex items-center justify-center shadow-lg">
                            {getEventIcon(event.type, event.completed)}
                          </div>
                          {index === currentIndex && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-4 border-blue-400"
                              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                            />
                          )}
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{event.event}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-medium">{formatDate(event.date)}</div>
                              <div className="text-xs text-gray-500">{getDaysUntil(event.date)}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                event.type === "critical"
                                  ? "destructive"
                                  : event.type === "deadline"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : "Unknown"}
                            </Badge>
                            {event.completed && (
                              <Badge variant="default" className="bg-green-600">
                                Completed
                              </Badge>
                            )}
                            {event.priority && (
                              <Badge variant="outline">
                                {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)} Priority
                              </Badge>
                            )}
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {selectedEvent?.id === event.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600"
                              >
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <h4 className="font-medium mb-2">Event Details</h4>
                                    <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                      <li>Type: {event.type}</li>
                                      <li>Status: {event.completed ? "Completed" : "Pending"}</li>
                                      <li>Date: {formatDate(event.date)}</li>
                                      <li>Timeline: {getDaysUntil(event.date)}</li>
                                      <li>Priority: {event.priority || "Not specified"}</li>
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Related Actions</h4>
                                    <div className="space-y-2">
                                      <Button variant="outline" size="sm" className="w-full">
                                        Set Reminder
                                      </Button>
                                      <Button variant="outline" size="sm" className="w-full">
                                        Mark as {event.completed ? "Incomplete" : "Complete"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="space-y-8">
                  {Object.keys(groupedEvents)
                    .sort()
                    .map((year) => (
                      <div key={year} className="space-y-4">
                        <h3 className="text-xl font-bold border-b pb-2">{year}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.keys(groupedEvents[year])
                            .sort((a, b) => Number(a) - Number(b))
                            .map((month) => (
                              <div key={`${year}-${month}`} className="border rounded-lg p-4">
                                <h4 className="font-semibold text-lg mb-3">{monthNames[Number(month)]}</h4>
                                <div className="space-y-2">
                                  {groupedEvents[year][month].map((event: any, idx: number) => (
                                    <motion.div
                                      key={idx}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: idx * 0.1 }}
                                      className={`p-2 rounded-md text-sm ${
                                        event.completed
                                          ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500"
                                          : event.type === "critical"
                                            ? "bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500"
                                            : event.type === "deadline"
                                              ? "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500"
                                              : "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                                      }`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium">{event.event}</div>
                                          <div className="text-xs text-gray-500">
                                            {new Date(event.date).getDate()} {monthNames[Number(month)]}
                                          </div>
                                        </div>
                                        <div>{getEventIcon(event.type, event.completed)}</div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Milestone</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-sm">Obligation</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm">Deadline</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm">Completed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
