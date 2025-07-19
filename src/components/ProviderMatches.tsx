import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Separator } from './ui/separator'
import { Star, MapPin, Clock, DollarSign, Calendar, ArrowLeft, Check } from 'lucide-react'
import { BookingFlow } from './BookingFlow'

interface ProviderMatchesProps {
  request: any
  requestId: string
  user: any
}

interface Provider {
  id: string
  name: string
  bio: string
  skills: string[]
  rating: number
  completedJobs: number
  hourlyRate: number
  profileImage?: string
  location: string
  matchScore: number
}

export function ProviderMatches({ request, requestId, user }: ProviderMatchesProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [showBooking, setShowBooking] = useState(false)

  useEffect(() => {
    findMatchingProviders()
  }, [request, requestId]) // eslint-disable-line react-hooks/exhaustive-deps

  const findMatchingProviders = async () => {
    try {
      // For MVP, we'll create some mock providers and use AI to generate realistic matches
      const mockProviders = await generateMockProviders()
      
      // Use AI to score and rank providers based on the request
      const { object } = await blink.ai.generateObject({
        prompt: `Given this service request: "${request.description}" requiring skills: ${JSON.stringify(request.skills)}, 
        rank and score these providers (0-100) based on skill match, location, and suitability. Return top 5 matches.
        
        Providers: ${JSON.stringify(mockProviders)}`,
        schema: {
          type: 'object',
          properties: {
            matches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  providerId: { type: 'string' },
                  matchScore: { type: 'number' },
                  reasoning: { type: 'string' }
                }
              }
            }
          },
          required: ['matches']
        }
      })

      // Combine providers with match scores
      const rankedProviders = object.matches
        .map(match => {
          const provider = mockProviders.find(p => p.id === match.providerId)
          return provider ? { ...provider, matchScore: match.matchScore } : null
        })
        .filter(Boolean)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5)

      setProviders(rankedProviders)
    } catch (error) {
      console.error('Error finding providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateMockProviders = async () => {
    // Generate realistic providers based on the request type
    const { object } = await blink.ai.generateObject({
      prompt: `Generate 8-10 realistic service providers for "${request.taskType}" services. 
      Include diverse names, relevant skills, realistic ratings, and locations.`,
      schema: {
        type: 'object',
        properties: {
          providers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                bio: { type: 'string' },
                skills: { type: 'array', items: { type: 'string' } },
                rating: { type: 'number' },
                completedJobs: { type: 'number' },
                hourlyRate: { type: 'number' },
                location: { type: 'string' }
              }
            }
          }
        },
        required: ['providers']
      }
    })

    return object.providers.map(provider => ({
      ...provider,
      id: `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }))
  }

  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider)
    setShowBooking(true)
  }

  if (showBooking && selectedProvider) {
    return (
      <BookingFlow
        request={request}
        requestId={requestId}
        provider={selectedProvider}
        user={user}
        onBack={() => setShowBooking(false)}
      />
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="text-2xl font-bold">Finding perfect matches...</h2>
          <p className="text-muted-foreground">Our AI is analyzing providers for your request</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Request Summary */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Request Processed
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Service Type</p>
              <Badge variant="secondary" className="text-sm">
                {request.taskType}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4" />
                {request.duration}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Location</p>
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="w-4 h-4" />
                {request.location}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Estimated Price</p>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <DollarSign className="w-4 h-4" />
                ${request.suggestedPrice}
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Required Skills</p>
            <div className="flex flex-wrap gap-2">
              {request.skills.map((skill: string, index: number) => (
                <Badge key={index} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Matches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {providers.length} Perfect Matches Found
          </h2>
          <Badge variant="secondary" className="text-sm">
            <Clock className="w-3 h-3 mr-1" />
            Found in {Math.floor(Math.random() * 45 + 15)}s
          </Badge>
        </div>

        <div className="grid gap-6">
          {providers.map((provider, index) => (
            <Card 
              key={provider.id}
              className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/30"
              onClick={() => handleSelectProvider(provider)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Provider Avatar */}
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={provider.profileImage} />
                    <AvatarFallback className="text-lg font-semibold">
                      {provider.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  {/* Provider Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold">{provider.name}</h3>
                          <Badge 
                            variant={provider.matchScore >= 90 ? "default" : provider.matchScore >= 80 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {provider.matchScore}% match
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{provider.rating}</span>
                            <span>({provider.completedJobs} jobs)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {provider.location}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-2xl font-bold text-primary">
                          ${provider.hourlyRate}/hr
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ~${Math.round(provider.hourlyRate * parseFloat(request.duration.split(' ')[0] || '2'))} total
                        </div>
                      </div>
                    </div>

                    <p className="text-muted-foreground">{provider.bio}</p>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {provider.skills.map((skill, skillIndex) => (
                          <Badge 
                            key={skillIndex} 
                            variant={request.skills.includes(skill) ? "default" : "outline"}
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Available today</span>
                        <span>•</span>
                        <span>Responds in ~15 min</span>
                      </div>
                      <Button className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Book Now
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}