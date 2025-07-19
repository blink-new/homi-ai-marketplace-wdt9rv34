import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@blinkdotnew/sdk'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ArrowLeft, Send, Sparkles, MapPin, DollarSign, Clock, CheckCircle, Edit3 } from 'lucide-react'

const blink = createClient({
  projectId: 'homi-ai-marketplace-wdt9rv34',
  authRequired: true
})

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  suggestions?: string[]
}

interface RequestSummary {
  service: string
  description: string
  location: string
  budget: number
  timeline: string
  estimatedHours: number
  flatPrice: number
}

const quickStarters = [
  { icon: "📸", text: "Looking for a photographer", category: "photography" },
  { icon: "🧹", text: "Need apartment cleaning", category: "cleaning" },
  { icon: "🔧", text: "Handyman services needed", category: "handyman" },
  { icon: "💻", text: "Tech support required", category: "tech" },
  { icon: "🚛", text: "Help with moving", category: "moving" },
  { icon: "🎨", text: "Graphic design work", category: "design" }
]

export default function RequestFlow({ user, onRequestComplete, onBack }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm here to help you find the perfect service provider. What do you need help with today?",
      timestamp: new Date(),
      suggestions: []
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [requestSummary, setRequestSummary] = useState<RequestSummary | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking])

  const addMessage = (content: string, type: 'user' | 'ai', suggestions: string[] = []) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      suggestions
    }
    setMessages(prev => [...prev, newMessage])
  }

  const generateAIResponse = async (userMessage: string) => {
    setIsThinking(true)
    
    try {
      // Simulate AI processing with realistic delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const conversationContext = messages.map(m => `${m.type}: ${m.content}`).join('\n')
      
      const { text } = await blink.ai.generateText({
        prompt: `You are Homi's AI assistant helping users scope local service requests. 

Current conversation:
${conversationContext}
User: ${userMessage}

Your role:
1. Ask ONE focused question to gather missing information
2. Be conversational and helpful
3. Focus on: service type, location, budget, timeline
4. When you have enough info, provide a summary and ask for confirmation

If the user has provided enough details (service, location, budget, timeline), respond with "READY_FOR_SUMMARY" followed by a JSON object with:
{
  "service": "service type",
  "description": "detailed description", 
  "location": "location",
  "budget": number,
  "timeline": "when needed",
  "estimatedHours": number,
  "flatPrice": number
}

Otherwise, ask for the most important missing information with 2-3 helpful suggestions.`,
        maxTokens: 200
      })

      if (text.includes('READY_FOR_SUMMARY')) {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const summary = JSON.parse(jsonMatch[0])
            setRequestSummary(summary)
            setShowConfirmation(true)
            addMessage(
              `Perfect! I've gathered all the details for your ${summary.service} request. Here's what I understand:

**Service:** ${summary.service}
**Description:** ${summary.description}
**Location:** ${summary.location}
**Budget:** $${summary.budget}
**Timeline:** ${summary.timeline}
**Estimated Time:** ${summary.estimatedHours} hours
**Flat Price:** $${summary.flatPrice}

Does this look correct? I can find providers who match your budget and requirements.`,
              'ai'
            )
            return
          } catch (e) {
            console.error('Failed to parse summary:', e)
          }
        }
      }

      // Generate contextual suggestions
      let suggestions: string[] = []
      const lowerText = text.toLowerCase()
      
      if (lowerText.includes('location') || lowerText.includes('where')) {
        suggestions = ['Manhattan, NY', 'Brooklyn, NY', 'Queens, NY']
      } else if (lowerText.includes('budget') || lowerText.includes('cost')) {
        suggestions = ['$50-100', '$100-200', '$200-500']
      } else if (lowerText.includes('when') || lowerText.includes('timeline')) {
        suggestions = ['This weekend', 'Next week', 'ASAP']
      } else if (lowerText.includes('photography')) {
        suggestions = ['Portrait session', 'Event photography', 'Product photos']
      } else if (lowerText.includes('cleaning')) {
        suggestions = ['Deep cleaning', 'Regular maintenance', 'Move-out cleaning']
      }

      addMessage(text, 'ai', suggestions)
    } catch (error) {
      console.error('AI Error:', error)
      addMessage("I'm having trouble processing that. Could you try rephrasing your request?", 'ai')
    } finally {
      setIsThinking(false)
    }
  }

  const handleSend = async (message?: string) => {
    const messageToSend = message || inputValue.trim()
    if (!messageToSend) return

    addMessage(messageToSend, 'user')
    setInputValue('')
    
    await generateAIResponse(messageToSend)
  }

  const handleQuickStart = (starter: any) => {
    handleSend(starter.text)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion)
  }

  const handleConfirmRequest = async () => {
    if (!requestSummary) return

    try {
      // Save request to database
      const requestId = `req_${Date.now()}`
      await blink.db.requests.create({
        id: requestId,
        user_id: user.id,
        input_text: messages.filter(m => m.type === 'user').map(m => m.content).join(' '),
        parsed_task_type: requestSummary.service,
        skills_needed: requestSummary.service,
        location: requestSummary.location,
        timeline: requestSummary.timeline,
        budget: requestSummary.budget,
        estimated_hours: requestSummary.estimatedHours,
        flat_price: requestSummary.flatPrice,
        confirmed: true,
        status: 'pending',
        created_at: new Date().toISOString()
      })

      onRequestComplete({
        id: requestId,
        ...requestSummary,
        user_id: user.id,
        status: 'pending'
      })
    } catch (error) {
      console.error('Error saving request:', error)
    }
  }

  const handleEditRequest = () => {
    setShowConfirmation(false)
    setRequestSummary(null)
    addMessage("What would you like to change about your request?", 'ai', [
      'Change location',
      'Adjust budget', 
      'Different timeline'
    ])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900">Request Service</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-200/50 shadow-xl overflow-hidden">
          
          {/* Messages */}
          <div className="h-[600px] overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.type === 'ai' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Homi AI</span>
                    </div>
                  )}
                  
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs bg-white/80 hover:bg-white border-gray-300 text-gray-700"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick Starters (only show initially) */}
            {messages.length === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">Or try one of these:</p>
                <div className="grid grid-cols-2 gap-3">
                  {quickStarters.map((starter, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleQuickStart(starter)}
                      className="h-auto p-4 bg-white/80 hover:bg-white border-gray-300 text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{starter.icon}</span>
                        <span className="text-sm text-gray-700">{starter.text}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Homi AI</span>
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Section */}
            {showConfirmation && requestSummary && (
              <div className="border-t border-gray-200 pt-6">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Request Summary</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-700">Service</span>
                        </div>
                        <p className="text-gray-900 ml-6">{requestSummary.service}</p>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-700">Location</span>
                        </div>
                        <p className="text-gray-900 ml-6">{requestSummary.location}</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-700">Budget</span>
                        </div>
                        <p className="text-gray-900 ml-6">${requestSummary.budget}</p>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-700">Timeline</span>
                        </div>
                        <p className="text-gray-900 ml-6">{requestSummary.timeline}</p>
                      </div>
                    </div>

                    <div className="bg-white/60 rounded-xl p-4 mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">AI-Generated Pricing</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Estimated {requestSummary.estimatedHours} hours</span>
                        <span className="text-2xl font-bold text-green-600">${requestSummary.flatPrice}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Flat rate based on provider hourly rates in your budget</p>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        onClick={handleConfirmRequest}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Find Providers
                      </Button>
                      <Button
                        onClick={handleEditRequest}
                        variant="outline"
                        className="bg-white/80 hover:bg-white"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {!showConfirmation && (
            <div className="border-t border-gray-200/50 p-6">
              <div className="flex space-x-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Describe what you need help with..."
                  className="flex-1 px-4 py-3 bg-white/80 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isThinking}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isThinking}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}