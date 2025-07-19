import { useState } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Sparkles, Clock, MapPin, DollarSign, Send, Mic, MicOff, MessageCircle, Bot, User } from 'lucide-react'
import { ProviderMatches } from './ProviderMatches'

interface RequestFlowProps {
  user: any
}

interface Message {
  type: 'user' | 'ai'
  content: string
  timestamp: Date
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

export function RequestFlow({ user }: RequestFlowProps) {
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [scopingData, setScopingData] = useState<ScopingData>({})
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [parsedRequest, setParsedRequest] = useState<ParsedRequest | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const exampleRequests = [
    "I need help taking out my trash",
    "Looking for a photographer", 
    "Need someone to clean my apartment",
    "Help me set up my WiFi"
  ]

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

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInputText(prev => prev + ' ' + transcript)
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const handleSubmit = async () => {
    if (!inputText.trim()) return
    
    const userMessage: Message = {
      type: 'user',
      content: inputText,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)
    setShowChat(true)
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiResponse = await processUserInput(inputText, scopingData)
      
      const aiMessage: Message = {
        type: 'ai',
        content: aiResponse.message,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])
      setScopingData(aiResponse.updatedData)
      setCurrentQuestion(aiResponse.nextQuestion)
      
      if (aiResponse.isComplete) {
        setIsComplete(true)
        // Generate final scoped request and find providers
        const finalRequest = await generateFinalRequest(aiResponse.updatedData)
        setParsedRequest(finalRequest)
        
        // Save to database
        const newRequest = await blink.db.requests.create({
          id: `req_${Date.now()}`,
          userId: user.id,
          inputText: aiResponse.updatedData.details || inputText,
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
    } finally {
      setIsProcessing(false)
      setInputText('')
    }
  }

  const processUserInput = async (userInput: string, currentData: ScopingData) => {
    const lowerInput = userInput.toLowerCase()
    const updatedData = { ...currentData }
    
    // First message - extract initial task type
    if (messages.length === 0) {
      updatedData.taskType = extractTaskType(userInput)
      updatedData.details = userInput
      
      // Check if we need more details
      const missingInfo = getMissingInfo(updatedData, userInput)
      
      if (missingInfo.length > 0) {
        const nextQuestion = getNextQuestion(missingInfo[0])
        return {
          message: `Got it! I understand you need help with ${updatedData.taskType.toLowerCase()}. ${nextQuestion}`,
          updatedData,
          nextQuestion: missingInfo[0],
          isComplete: false
        }
      } else {
        // All info provided in first message
        return {
          message: `Perfect! I have all the details I need. Let me find the best providers for your ${updatedData.taskType.toLowerCase()} request. This should take just a moment...`,
          updatedData,
          nextQuestion: null,
          isComplete: true
        }
      }
    }
    
    // Process based on current question
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
      const nextQuestion = getNextQuestion(missingInfo[0])
      return {
        message: `Great! ${nextQuestion}`,
        updatedData,
        nextQuestion: missingInfo[0],
        isComplete: false
      }
    } else {
      // All info collected
      return {
        message: `Excellent! I now have all the information needed to find you the perfect provider. Let me search for qualified ${updatedData.taskType?.toLowerCase()} professionals in your area...`,
        updatedData,
        nextQuestion: null,
        isComplete: true
      }
    }
  }

  const getMissingInfo = (data: ScopingData, originalText: string) => {
    const missing = []
    
    if (!data.location || data.location === 'Not specified') {
      if (!originalText.toLowerCase().includes('location') && 
          !originalText.toLowerCase().includes('address') &&
          !originalText.toLowerCase().includes('home') &&
          !originalText.toLowerCase().includes('apartment')) {
        missing.push('location')
      }
    }
    
    if (!data.budget) {
      if (!originalText.match(/\$\d+/)) {
        missing.push('budget')
      }
    }
    
    if (!data.timeline) {
      if (!originalText.toLowerCase().includes('today') &&
          !originalText.toLowerCase().includes('tomorrow') &&
          !originalText.toLowerCase().includes('week') &&
          !originalText.toLowerCase().includes('month') &&
          !originalText.toLowerCase().includes('urgent') &&
          !originalText.toLowerCase().includes('asap')) {
        missing.push('timeline')
      }
    }
    
    // Check for task-specific questions
    if (data.taskType && !data.additionalInfo?.specific) {
      const needsSpecific = getTaskSpecificQuestion(data.taskType)
      if (needsSpecific && !hasTaskSpecificInfo(originalText, data.taskType)) {
        missing.push('specific')
      }
    }
    
    return missing
  }

  const getNextQuestion = (questionType: string) => {
    const questions = {
      location: "To find the best providers near you, where are you located? (e.g., 'Downtown Seattle' or 'Brooklyn, NY')",
      budget: "What's your budget for this service? You can say something like '$50-100' or 'around $75'.",
      timeline: "When would you like this done? (e.g., 'today', 'this weekend', 'next week', 'flexible')",
      specific: ""
    }
    
    if (questionType === 'specific' && scopingData.taskType) {
      return getTaskSpecificQuestion(scopingData.taskType) || ""
    }
    
    return questions[questionType as keyof typeof questions] || ""
  }

  const extractTaskType = (text: string) => {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('trash') || lowerText.includes('garbage')) return 'Trash Removal'
    if (lowerText.includes('photo') || lowerText.includes('photographer')) return 'Photography'
    if (lowerText.includes('clean') || lowerText.includes('cleaning')) return 'Cleaning'
    if (lowerText.includes('wifi') || lowerText.includes('internet') || lowerText.includes('network')) return 'Tech Support'
    if (lowerText.includes('design') || lowerText.includes('logo')) return 'Graphic Design'
    if (lowerText.includes('move') || lowerText.includes('moving')) return 'Moving Services'
    if (lowerText.includes('repair') || lowerText.includes('fix')) return 'Repair Services'
    return 'General Service'
  }

  const extractBudget = (text: string) => {
    const budgetMatch = text.match(/\$(\d+)(?:-\$?(\d+))?/g)
    return budgetMatch ? budgetMatch[0] : null
  }

  const getTaskSpecificQuestion = (taskType: string) => {
    const questions: { [key: string]: string } = {
      'Trash Removal': 'What type of items need to be removed? (e.g., "household trash", "furniture", "yard waste")',
      'Photography': 'What type of photography do you need? (e.g., "portrait session", "event photography", "product photos")',
      'Cleaning': 'What type of cleaning service? (e.g., "deep clean", "regular maintenance", "move-out cleaning")',
      'Tech Support': 'What specific tech issue needs help? (e.g., "WiFi setup", "computer repair", "smart home installation")',
      'Moving Services': 'What size move is this? (e.g., "studio apartment", "3-bedroom house", "just a few items")'
    }
    return questions[taskType] || null
  }

  const hasTaskSpecificInfo = (text: string, taskType: string) => {
    const lowerText = text.toLowerCase()
    
    if (taskType === 'Trash Removal') {
      return lowerText.includes('furniture') || lowerText.includes('household') || lowerText.includes('yard')
    }
    if (taskType === 'Photography') {
      return lowerText.includes('wedding') || lowerText.includes('portrait') || lowerText.includes('event')
    }
    if (taskType === 'Cleaning') {
      return lowerText.includes('deep') || lowerText.includes('regular') || lowerText.includes('move-out')
    }
    
    return false
  }

  const generateFinalRequest = async (data: ScopingData): Promise<ParsedRequest> => {
    // Use AI to generate final structured request
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

  // If we have a complete request, show provider matches
  if (parsedRequest && requestId) {
    return <ProviderMatches request={parsedRequest} requestId={requestId} user={user} />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">What do you need help with?</h2>
        <p className="text-lg text-muted-foreground">
          Tell me what you need - I'll ask a few questions to find you the perfect provider
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>60-second match guarantee</span>
        </div>
      </div>

      {!showChat ? (
        <>
          {/* Initial Input Section */}
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Textarea
                  placeholder="e.g., I need help taking out my trash..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[120px] text-lg border-0 focus-visible:ring-0 resize-none"
                  disabled={isProcessing}
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVoiceInput}
                      disabled={isProcessing || isListening}
                      className="flex items-center gap-2"
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 text-red-500" />
                          Listening...
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          Voice Input
                        </>
                      )}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {inputText.length}/500 characters
                    </span>
                  </div>
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={!inputText.trim() || isProcessing}
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Start Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Example Requests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Try these examples:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {exampleRequests.map((example, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setInputText(example)}
                >
                  <CardContent className="p-4">
                    <p className="text-sm">"{example}"</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Chat Interface */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              AI Scoping Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'ai' && (
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isComplete && !isProcessing && currentQuestion && (
              <div className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1"
                  onKeyPress={handleKeyPress}
                />
                <Button 
                  onClick={handleSubmit}
                  disabled={!inputText.trim()}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            {isComplete && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 text-green-600 font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Finding your perfect provider match...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Features */}
      {!showChat && (
        <div className="grid md:grid-cols-3 gap-6 pt-8">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold">AI-Powered Scoping</h4>
            <p className="text-sm text-muted-foreground">
              Our AI asks smart questions to understand exactly what you need
            </p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-accent" />
            </div>
            <h4 className="font-semibold">Fast Matching</h4>
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
      )}
    </div>
  )
}