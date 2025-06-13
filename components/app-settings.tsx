"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Palette, 
  Bell, 
  Shield, 
  Database,
  Trash2,
  Download,
  Upload,
  Monitor,
  Moon,
  Sun,
  Laptop,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import { clearCache, getCacheStats, getPerformanceMetrics } from "@/lib/contract-service"

interface AppSettingsProps {
  isOpen: boolean
  onClose: () => void
}

interface UserPreferences {
  theme: "light" | "dark" | "system"
  notifications: boolean
  soundEnabled: boolean
  autoSave: boolean
  cacheEnabled: boolean
  animationsEnabled: boolean
  compactMode: boolean
  analysisTimeout: number
  maxFileSize: number
  language: string
}

const defaultPreferences: UserPreferences = {
  theme: "system",
  notifications: true,
  soundEnabled: true,
  autoSave: true,
  cacheEnabled: true,
  animationsEnabled: true,
  compactMode: false,
  analysisTimeout: 300, // 5 minutes
  maxFileSize: 10, // 10MB
  language: "en"
}

export default function AppSettings({ isOpen, onClose }: AppSettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [cacheStats, setCacheStats] = useState<{ size: number; keys: string[] }>({ size: 0, keys: [] })
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('leagle-preferences')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPreferences({ ...defaultPreferences, ...parsed })
      } catch (error) {
        console.warn("Failed to parse saved preferences:", error)
      }
    }

    // Load cache stats
    setCacheStats(getCacheStats())
    setPerformanceData(getPerformanceMetrics())
  }, [isOpen])

  const savePreferences = (newPreferences: UserPreferences) => {
    setPreferences(newPreferences)
    localStorage.setItem('leagle-preferences', JSON.stringify(newPreferences))
    
    // Apply theme change immediately
    if (newPreferences.theme !== preferences.theme) {
      setTheme(newPreferences.theme)
    }

    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
      duration: 2000,
    })
  }

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value }
    savePreferences(newPreferences)
  }

  const handleClearCache = () => {
    clearCache()
    setCacheStats(getCacheStats())
    toast({
      title: "Cache Cleared",
      description: "All cached analysis data has been removed.",
      duration: 3000,
    })
  }

  const handleExportSettings = () => {
    const exportData = {
      preferences,
      exportDate: new Date().toISOString(),
      version: "1.0"
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leagle-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Settings Exported",
      description: "Your settings have been downloaded.",
      duration: 3000,
    })
  }

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        if (imported.preferences) {
          savePreferences({ ...defaultPreferences, ...imported.preferences })
          toast({
            title: "Settings Imported",
            description: "Your settings have been restored.",
            duration: 3000,
          })
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid settings file format.",
          variant: "destructive",
          duration: 3000,
        })
      }
    }
    reader.readAsText(file)
  }

  const resetToDefaults = () => {
    savePreferences(defaultPreferences)
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
      duration: 3000,
    })
  }

  if (!isOpen) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Application Settings
                </CardTitle>
                <CardDescription>
                  Customize your Leagle experience and manage application preferences
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={onClose}>
                ×
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-y-auto">
              <Tabs defaultValue="appearance" className="w-full">
                <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
                  <TabsTrigger value="appearance" className="gap-2">
                    <Palette className="h-4 w-4" />
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger value="behavior" className="gap-2">
                    <Bell className="h-4 w-4" />
                    Behavior
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="gap-2">
                    <Monitor className="h-4 w-4" />
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="data" className="gap-2">
                    <Database className="h-4 w-4" />
                    Data
                  </TabsTrigger>
                </TabsList>

                <div className="p-6">
                  <TabsContent value="appearance" className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Theme</Label>
                          <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                        </div>
                        <Select
                          value={preferences.theme}
                          onValueChange={(value: "light" | "dark" | "system") => updatePreference("theme", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">
                              <div className="flex items-center gap-2">
                                <Sun className="h-4 w-4" />
                                Light
                              </div>
                            </SelectItem>
                            <SelectItem value="dark">
                              <div className="flex items-center gap-2">
                                <Moon className="h-4 w-4" />
                                Dark
                              </div>
                            </SelectItem>
                            <SelectItem value="system">
                              <div className="flex items-center gap-2">
                                <Laptop className="h-4 w-4" />
                                System
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Animations</Label>
                          <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                        </div>
                        <Switch
                          checked={preferences.animationsEnabled}
                          onCheckedChange={(checked) => updatePreference("animationsEnabled", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Compact Mode</Label>
                          <p className="text-sm text-muted-foreground">Use a more compact interface layout</p>
                        </div>
                        <Switch
                          checked={preferences.compactMode}
                          onCheckedChange={(checked) => updatePreference("compactMode", checked)}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="behavior" className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Notifications</Label>
                          <p className="text-sm text-muted-foreground">Show system notifications and alerts</p>
                        </div>
                        <Switch
                          checked={preferences.notifications}
                          onCheckedChange={(checked) => updatePreference("notifications", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Sound Effects</Label>
                          <p className="text-sm text-muted-foreground">Play sounds for notifications and actions</p>
                        </div>
                        <Switch
                          checked={preferences.soundEnabled}
                          onCheckedChange={(checked) => updatePreference("soundEnabled", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Auto-save</Label>
                          <p className="text-sm text-muted-foreground">Automatically save analysis results</p>
                        </div>
                        <Switch
                          checked={preferences.autoSave}
                          onCheckedChange={(checked) => updatePreference("autoSave", checked)}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-base font-medium">Analysis Timeout</Label>
                        <p className="text-sm text-muted-foreground">Maximum time to wait for analysis completion</p>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[preferences.analysisTimeout]}
                            onValueChange={([value]) => updatePreference("analysisTimeout", value)}
                            max={600}
                            min={60}
                            step={30}
                            className="flex-1"
                          />
                          <Badge variant="outline">{preferences.analysisTimeout}s</Badge>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="performance" className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Enable Caching</Label>
                          <p className="text-sm text-muted-foreground">Cache analysis results for faster re-processing</p>
                        </div>
                        <Switch
                          checked={preferences.cacheEnabled}
                          onCheckedChange={(checked) => updatePreference("cacheEnabled", checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-medium">Maximum File Size</Label>
                        <p className="text-sm text-muted-foreground">Maximum allowed PDF file size for analysis</p>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[preferences.maxFileSize]}
                            onValueChange={([value]) => updatePreference("maxFileSize", value)}
                            max={50}
                            min={1}
                            step={1}
                            className="flex-1"
                          />
                          <Badge variant="outline">{preferences.maxFileSize}MB</Badge>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label className="text-base font-medium">Performance Statistics</Label>
                        {performanceData.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 border rounded-lg">
                              <div className="text-sm font-medium">Average Analysis Time</div>
                              <div className="text-2xl font-bold">
                                {Math.round(performanceData.reduce((sum, p) => sum + p.analysisTime, 0) / performanceData.length / 1000)}s
                              </div>
                            </div>
                            <div className="p-3 border rounded-lg">
                              <div className="text-sm font-medium">Files Processed</div>
                              <div className="text-2xl font-bold">{performanceData.length}</div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No performance data available yet</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="data" className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Cache Management</Label>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">Analysis Cache</div>
                            <div className="text-sm text-muted-foreground">
                              {cacheStats.size} cached results
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleClearCache}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Cache
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label className="text-base font-medium">Settings Backup</Label>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleExportSettings}>
                            <Download className="h-4 w-4 mr-2" />
                            Export Settings
                          </Button>
                          <div>
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleImportSettings}
                              className="hidden"
                              id="import-settings"
                            />
                            <Button variant="outline" asChild>
                              <label htmlFor="import-settings" className="cursor-pointer">
                                <Upload className="h-4 w-4 mr-2" />
                                Import Settings
                              </label>
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label className="text-base font-medium">Reset Settings</Label>
                        <Button variant="destructive" onClick={resetToDefaults}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Reset to Defaults
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
