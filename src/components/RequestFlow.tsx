import { useState, useRef, useEffect } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Sparkles, Send, Mic, MicOff, Bot, User, MapPin, DollarSign, Clock, ArrowRight, Zap } from 'lucide-react'
import { ProviderMatches } from './ProviderMatches'

interface RequestFlowProps {
  user: any
}

interface Message {
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  suggestions?: string[]
  data?: any
}

interface ScopingData {
  taskType?: string
  location?: string
  budget?: string
  timeline?: string
  details?: string
  additionalInfo?: { [key: string]: string }
}

interface ParsedRequest {
  taskType: string
  skills: string[]
  location: string
  duration: string
  suggestedPrice: number
  description: string
}

const quickStarters = [
  { text: "I need help with trash removal", icon: "🗑️" },
  { text: "Looking for a photographer", icon: "📸" },
  { text: "Need apartment cleaning", icon: "🧹" },
  { text: "WiFi setup help", icon: "📶" },
  { text: "Moving assistance", icon: "📦" },
  { text: "Graphic design work", icon: "🎨" }
]

export function RequestFlow({ user }: RequestFlowProps) {
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [scopingData, setScopingData] = useState<ScopingData>({})
  const [isComplete, setIsComplete] = useState(false)
  const [parsedRequest, setParsedRequest] = useState<ParsedRequest | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (showWelcome) {
      // Add welcome message after a short delay
      setTimeout(() => {
        const welcomeMessage: Message = {
          type: 'ai',
          content: "Hi! I'm your AI assistant. Tell me what you need help with, and I'll find you the perfect local provider. What can I help you with today?",
          timestamp: new Date(),
          suggestions: quickStarters.map(s => s.text)
        }
        setMessages([welcomeMessage])
      }, 500)
    }
  }, [showWelcome])

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInputText(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  const handleSubmit = async (text?: string) => {
    const messageText = text || inputText
    if (!messageText.trim()) return
    
    setShowWelcome(false)
    
    const userMessage: Message = {
      type: 'user',
      content: messageText,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)
    setInputText('')
    
    try {
      // Add thinking indicator
      const thinkingMessage: Message = {
        type: 'system',
        content: 'thinking',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, thinkingMessage])
      
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      const aiResponse = await processUserInput(messageText, scopingData)
      
      // Remove thinking indicator and add AI response
      setMessages(prev => prev.filter(m => m.content !== 'thinking'))
      
      const aiMessage: Message = {
        type: 'ai',
        content: aiResponse.message,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions,
        data: aiResponse.data
      }
      
      setMessages(prev => [...prev, aiMessage])
      setScopingData(aiResponse.updatedData)
      
      if (aiResponse.isComplete) {
        setIsComplete(true)
        // Generate final scoped request and find providers
        const finalRequest = await generateFinalRequest(aiResponse.updatedData)
        setParsedRequest(finalRequest)
        
        // Save to database
        const newRequest = await blink.db.requests.create({
          id: `req_${Date.now()}`,
          userId: user.id,
          inputText: aiResponse.updatedData.details || messageText,
          parsedTaskType: finalRequest.taskType,
          parsedSkills: JSON.stringify(finalRequest.skills),
          parsedLocation: finalRequest.location,
          parsedDuration: finalRequest.duration,
          suggestedPrice: finalRequest.suggestedPrice,
          finalPrice: finalRequest.suggestedPrice,
          status: 'processing'
        })
        
        setRequestId(newRequest.id)
      }
      
    } catch (error) {
      console.error('Error processing request:', error)
      setMessages(prev => prev.filter(m => m.content !== 'thinking'))
      const errorMessage: Message = {
        type: 'ai',
        content: "I'm sorry, I encountered an error. Could you please try again?",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const processUserInput = async (userInput: string, currentData: ScopingData) => {
    const updatedData = { ...currentData }
    
    // First message - extract initial task type and any provided details
    if (messages.length <= 1) {
      updatedData.taskType = extractTaskType(userInput)
      updatedData.details = userInput
      
      // Extract any details already provided
      const extractedLocation = extractLocation(userInput)
      const extractedBudget = extractBudget(userInput)
      const extractedTimeline = extractTimeline(userInput)
      
      if (extractedLocation) updatedData.location = extractedLocation
      if (extractedBudget) updatedData.budget = extractedBudget
      if (extractedTimeline) updatedData.timeline = extractedTimeline
      
      // Check what's missing
      const missingInfo = getMissingInfo(updatedData, userInput)
      
      if (missingInfo.length > 0) {
        const nextQuestion = getNextQuestion(missingInfo[0], updatedData.taskType)
        const suggestions = getQuestionSuggestions(missingInfo[0], updatedData.taskType)
        
        return {
          message: `Perfect! I understand you need ${updatedData.taskType?.toLowerCase()}. ${nextQuestion}`,
          updatedData,
          suggestions,
          isComplete: false
        }
      } else {
        // All info provided in first message
        return {
          message: `Excellent! I have everything I need. Let me find the best ${updatedData.taskType?.toLowerCase()} providers in your area...`,
          updatedData,
          suggestions: [],
          isComplete: true
        }
      }
    }
    
    // Process subsequent responses
    const missingBefore = getMissingInfo(currentData, currentData.details || '')
    const currentQuestion = missingBefore[0]
    
    if (currentQuestion === 'location') {
      updatedData.location = userInput
    } else if (currentQuestion === 'budget') {
      updatedData.budget = extractBudget(userInput) || userInput
    } else if (currentQuestion === 'timeline') {
      updatedData.timeline = userInput
    } else if (currentQuestion === 'specific') {
      updatedData.additionalInfo = { ...updatedData.additionalInfo, specific: userInput }
    }
    
    // Check what's still missing
    const missingInfo = getMissingInfo(updatedData, updatedData.details || '')
    
    if (missingInfo.length > 0) {
      const nextQuestion = getNextQuestion(missingInfo[0], updatedData.taskType)
      const suggestions = getQuestionSuggestions(missingInfo[0], updatedData.taskType)
      
      return {
        message: `Got it! ${nextQuestion}`,
        updatedData,
        suggestions,
        isComplete: false
      }
    } else {
      // All info collected - show summary and proceed
      const summary = generateSummary(updatedData)
      return {
        message: `Perfect! Here's what I understand:\n\n${summary}\n\nLet me find you the best providers...`,
        updatedData,
        suggestions: [],
        data: { summary: updatedData },
        isComplete: true
      }
    }
  }

  const getMissingInfo = (data: ScopingData, originalText: string) => {
    const missing = []
    
    if (!data.location) {
      missing.push('location')
    }
    
    if (!data.budget) {
      missing.push('budget')
    }
    
    if (!data.timeline) {
      missing.push('timeline')
    }
    
    // Check for task-specific questions
    if (data.taskType && !data.additionalInfo?.specific) {
      const needsSpecific = getTaskSpecificQuestion(data.taskType)
      if (needsSpecific) {
        missing.push('specific')
      }
    }
    
    return missing
  }

  const getNextQuestion = (questionType: string, taskType?: string) => {
    const questions = {
      location: "Where are you located?",
      budget: "What's your budget for this?",
      timeline: "When do you need this done?",
      specific: getTaskSpecificQuestion(taskType) || ""
    }
    
    return questions[questionType as keyof typeof questions] || ""
  }

  const getQuestionSuggestions = (questionType: string, taskType?: string) => {
    const suggestions = {
      location: ["Brooklyn, NY", "Downtown Seattle", "Austin, TX", "My home address"],
      budget: ["$50-100", "Around $75", "Under $200", "Flexible budget"],
      timeline: ["Today", "This weekend", "Next week", "Flexible timing"],
      specific: getTaskSpecificSuggestions(taskType)
    }
    
    return suggestions[questionType as keyof typeof suggestions] || []
  }

  const getTaskSpecificQuestion = (taskType?: string) => {
    const questions: { [key: string]: string } = {
      'Trash Removal': 'What type of items need removal?',
      'Photography': 'What type of photography session?',
      'Cleaning': 'What type of cleaning do you need?',
      'Tech Support': 'What specific tech help do you need?',
      'Moving Services': 'What size move is this?',
      'Graphic Design': 'What type of design work?'
    }
    return questions[taskType || ''] || null
  }

  const getTaskSpecificSuggestions = (taskType?: string) => {
    const suggestions: { [key: string]: string[] } = {
      'Trash Removal': ['Household trash', 'Old furniture', 'Yard waste', 'Construction debris'],
      'Photography': ['Portrait session', 'Event photography', 'Product photos', 'Headshots'],
      'Cleaning': ['Deep cleaning', 'Regular maintenance', 'Move-out cleaning', 'Post-party cleanup'],
      'Tech Support': ['WiFi setup', 'Computer repair', 'Smart home setup', 'Software help'],
      'Moving Services': ['Studio apartment', '2-bedroom house', 'Just a few items', 'Full house'],
      'Graphic Design': ['Logo design', 'Business cards', 'Website graphics', 'Social media posts']
    }
    return suggestions[taskType || ''] || []
  }

  const extractTaskType = (text: string) => {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('trash') || lowerText.includes('garbage')) return 'Trash Removal'
    if (lowerText.includes('photo') || lowerText.includes('photographer')) return 'Photography'
    if (lowerText.includes('clean') || lowerText.includes('cleaning')) return 'Cleaning'
    if (lowerText.includes('wifi') || lowerText.includes('internet') || lowerText.includes('tech')) return 'Tech Support'
    if (lowerText.includes('design') || lowerText.includes('logo') || lowerText.includes('graphic')) return 'Graphic Design'
    if (lowerText.includes('move') || lowerText.includes('moving')) return 'Moving Services'
    if (lowerText.includes('repair') || lowerText.includes('fix')) return 'Repair Services'
    return 'General Service'
  }

  const extractLocation = (text: string) => {
    // Simple location extraction - could be enhanced with NLP
    const locationPatterns = [
      /in ([A-Z][a-z]+ ?[A-Z]*[a-z]*,? ?[A-Z]{2})/,
      /at ([A-Z][a-z]+ ?[A-Z]*[a-z]*)/,
      /([A-Z][a-z]+ ?[A-Z]*[a-z]*,? ?[A-Z]{2})/
    ]
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }

  const extractBudget = (text: string) => {
    const budgetMatch = text.match(/\$(\d+)(?:-\$?(\d+))?/g)
    return budgetMatch ? budgetMatch[0] : null
  }

  const extractTimeline = (text: string) => {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('today') || lowerText.includes('asap')) return 'Today'
    if (lowerText.includes('tomorrow')) return 'Tomorrow'
    if (lowerText.includes('this week')) return 'This week'
    if (lowerText.includes('next week')) return 'Next week'
    if (lowerText.includes('weekend')) return 'This weekend'
    return null
  }

  const generateSummary = (data: ScopingData) => {
    const parts = []
    if (data.taskType) parts.push(`🔧 Service: ${data.taskType}`)
    if (data.location) parts.push(`📍 Location: ${data.location}`)
    if (data.budget) parts.push(`💰 Budget: ${data.budget}`)
    if (data.timeline) parts.push(`⏰ Timeline: ${data.timeline}`)
    if (data.additionalInfo?.specific) parts.push(`📝 Details: ${data.additionalInfo.specific}`)
    
    return parts.join('\n')
  }

  const generateFinalRequest = async (data: ScopingData): Promise<ParsedRequest> => {
    const { object } = await blink.ai.generateObject({
      prompt: `Based on this scoped service request, generate final structured data:
      
      Task Type: ${data.taskType}
      Location: ${data.location}
      Budget: ${data.budget}
      Timeline: ${data.timeline}
      Original Details: ${data.details}
      Additional Info: ${JSON.stringify(data.additionalInfo)}
      
      Generate appropriate skills, duration, and pricing.`,
      schema: {
        type: 'object',
        properties: {
          taskType: { type: 'string' },
          skills: { 
            type: 'array',
            items: { type: 'string' }
          },
          location: { type: 'string' },
          duration: { type: 'string' },
          suggestedPrice: { type: 'number' },
          description: { type: 'string' }
        },
        required: ['taskType', 'skills', 'location', 'duration', 'suggestedPrice', 'description']
      }
    })

    return {
      taskType: data.taskType || object.taskType,
      skills: object.skills,
      location: data.location || object.location,
      duration: object.duration,
      suggestedPrice: object.suggestedPrice,
      description: object.description
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion)
  }

  // If we have a complete request, show provider matches
  if (parsedRequest && requestId) {
    return <ProviderMatches request={parsedRequest} requestId={requestId} user={user} />
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Chat Container */}
      <Card className="min-h-[600px] flex flex-col">
        <CardContent className="flex-1 p-0">
          {/* Messages Area */}
          <div className="flex-1 p-6 space-y-6 max-h-[500px] overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index}>
                {message.type === 'system' && message.content === 'thinking' ? (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted p-4 rounded-2xl rounded-tl-md max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'ai' && (
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="space-y-3 max-w-[80%]">
                      <div
                        className={`p-4 rounded-2xl ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-tl-md'
                        }`}
                      >
                        <p className="whitespace-pre-line">{message.content}</p>
                      </div>
                      
                      {/* Show suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground px-2">Quick options:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, suggestionIndex) => (
                              <Button
                                key={suggestionIndex}
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 rounded-full"
                                onClick={() => handleSuggestionClick(suggestion)}
                                disabled={isProcessing}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Show data summary */}
                      {message.data?.summary && (
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Request Summary</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {message.data.summary.taskType && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Service:</span>
                                  <Badge variant="secondary" className="text-xs">{message.data.summary.taskType}</Badge>
                                </div>
                              )}
                              {message.data.summary.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs">{message.data.summary.location}</span>
                                </div>
                              )}
                              {message.data.summary.budget && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs">{message.data.summary.budget}</span>
                                </div>
                              )}
                              {message.data.summary.timeline && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs">{message.data.summary.timeline}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    {message.type === 'user' && (
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {/* Quick starters for first interaction */}
            {showWelcome && messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">What can I help you with?</h2>
                  <p className="text-muted-foreground">Choose a quick starter or describe what you need</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {quickStarters.map((starter, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 justify-start text-left"
                      onClick={() => handleSubmit(starter.text)}
                    >
                      <span className="text-lg mr-3">{starter.icon}</span>
                      <span className="text-sm">{starter.text}</span>
                      <ArrowRight className="w-4 h-4 ml-auto opacity-50" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {!isComplete && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message..."
                    className="pr-12 h-12 text-base"
                    onKeyPress={handleKeyPress}
                    disabled={isProcessing}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-10 w-10 p-0"
                    onClick={handleVoiceInput}
                    disabled={isProcessing || isListening}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <Button 
                  onClick={() => handleSubmit()}
                  disabled={!inputText.trim() || isProcessing}
                  size="lg"
                  className="h-12 px-6"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {isComplete && (
            <div className="border-t p-4">
              <div className="flex items-center justify-center gap-3 text-primary">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">Finding your perfect provider match...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-semibold">Smart Conversations</h4>
          <p className="text-sm text-muted-foreground">
            AI asks the right questions to understand exactly what you need
          </p>
        </div>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 text-accent" />
          </div>
          <h4 className="font-semibold">60-Second Matching</h4>
          <p className="text-sm text-muted-foreground">
            Get matched with qualified providers in under 60 seconds
          </p>
        </div>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-semibold">Transparent Pricing</h4>
          <p className="text-sm text-muted-foreground">
            AI-generated fair pricing with no hidden fees
          </p>
        </div>
      </div>
    </div>
  )
}