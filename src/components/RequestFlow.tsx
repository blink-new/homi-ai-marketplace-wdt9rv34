import { useState } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Sparkles, Clock, MapPin, DollarSign, Send, Mic, MicOff } from 'lucide-react'
import { ProviderMatches } from './ProviderMatches'

interface RequestFlowProps {
  user: any
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
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedRequest, setParsedRequest] = useState<ParsedRequest | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)

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

  const processRequest = async () => {
    if (!inputText.trim()) return

    setIsProcessing(true)
    try {
      // Use AI to parse and scope the request
      const { object } = await blink.ai.generateObject({
        prompt: `Parse this service request and extract structured information: "${inputText}"
        
        Extract:
        - Task type (e.g., "Photography", "WiFi Setup", "House Cleaning")
        - Required skills (array of skills needed)
        - Location (if mentioned, otherwise "Not specified")
        - Estimated duration (e.g., "2 hours", "Half day")
        - Suggested price in USD (reasonable market rate)
        - Clean description of the task`,
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

      // Save request to database
      const newRequest = await blink.db.requests.create({
        id: `req_${Date.now()}`,
        userId: user.id,
        inputText,
        parsedTaskType: object.taskType,
        parsedSkills: JSON.stringify(object.skills),
        parsedLocation: object.location,
        parsedDuration: object.duration,
        suggestedPrice: object.suggestedPrice,
        finalPrice: object.suggestedPrice,
        status: 'processing'
      })

      setParsedRequest(object)
      setRequestId(newRequest.id)
    } catch (error) {
      console.error('Error processing request:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      processRequest()
    }
  }

  if (parsedRequest && requestId) {
    return <ProviderMatches request={parsedRequest} requestId={requestId} user={user} />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">What do you need help with?</h2>
        <p className="text-lg text-muted-foreground">
          Describe your request in plain language. Our AI will understand and find the perfect provider.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>60-second match guarantee</span>
        </div>
      </div>

      {/* Input Section */}
      <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Textarea
              placeholder="Try: 'I need a photographer for my wedding next month' or 'Help me set up my home WiFi network'"
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
                onClick={processRequest}
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
                    Find Providers
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Requests */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-center">Popular Requests</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              title: "Photography",
              example: "I need a photographer for my wedding next month in downtown",
              icon: "📸"
            },
            {
              title: "Tech Support", 
              example: "Help me set up my home WiFi network and smart devices",
              icon: "💻"
            },
            {
              title: "Home Services",
              example: "Need someone to deep clean my 3-bedroom apartment this weekend",
              icon: "🏠"
            },
            {
              title: "Creative Services",
              example: "Looking for a graphic designer to create my business logo",
              icon: "🎨"
            }
          ].map((item, index) => (
            <Card 
              key={index}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setInputText(item.example)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="space-y-1">
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.example}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 pt-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-semibold">AI-Powered</h4>
          <p className="text-sm text-muted-foreground">
            Our AI understands your needs and matches you with the right skills
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
    </div>
  )
}