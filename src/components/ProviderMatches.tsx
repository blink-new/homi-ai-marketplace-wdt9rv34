import React, { useState, useEffect } from 'react'
import { createClient } from '@blinkdotnew/sdk'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { ArrowLeft, Star, MapPin, Clock, DollarSign, CheckCircle, Sparkles } from 'lucide-react'

const blink = createClient({
  projectId: 'homi-ai-marketplace-wdt9rv34',
  authRequired: true
})

interface Provider {
  id: string
  name: string
  bio: string
  skills: string[]
  hourly_rate: number
  rating: number
  completed_jobs: number
  profile_image: string
  location: string
  availability: string
  match_score: number
  estimated_time: number
  flat_price: number
}

export default function ProviderMatches({ request, onProviderSelect, onBack }) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  useEffect(() => {
    const generateProviders = async () => {
      setLoading(true)
      
      try {
        // Generate AI-powered provider profiles that match the user's budget
        const { object } = await blink.ai.generateObject({
          prompt: `Generate 4-5 realistic service provider profiles for this request:

Service: ${request.service}
Location: ${request.location}
Budget: ${request.budget}
Timeline: ${request.timeline}
Estimated Hours: ${request.estimatedHours}

IMPORTANT: Generate providers with hourly rates that make sense for the user's budget of ${request.budget}. 
If budget is $100 and estimated time is 2 hours, create providers with rates around $40-60/hour.
If budget is $50 and estimated time is 1 hour, create providers with rates around $45-55/hour.

Create diverse, realistic profiles with:
- Names that sound professional and diverse
- Relevant skills for the service type
- Hourly rates that align with the user's budget (not too high or low)
- Realistic ratings (4.2-4.9)
- Completed jobs (10-150)
- Professional bios
- Availability that works with the timeline
- Match scores based on how well they fit

Make each provider unique and compelling.`,
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
                    hourly_rate: { type: 'number' },
                    rating: { type: 'number' },
                    completed_jobs: { type: 'number' },
                    profile_image: { type: 'string' },
                    location: { type: 'string' },
                    availability: { type: 'string' },
                    match_score: { type: 'number' },
                    estimated_time: { type: 'number' },
                    flat_price: { type: 'number' }
                  }
                }
              }
            }
          }
        })

        // Add realistic profile images
        const providersWithImages = object.providers.map((provider, index) => ({
          ...provider,
          profile_image: `https://images.unsplash.com/photo-${1500000000000 + index}?w=150&h=150&fit=crop&crop=face`
        }))

        setProviders(providersWithImages)
      } catch (error) {
        console.error('Error generating providers:', error)
        // Fallback to mock data
        setProviders([
          {
            id: 'prov_1',
            name: 'Sarah Chen',
            bio: 'Professional photographer with 8+ years experience in portraits and events.',
            skills: ['Portrait Photography', 'Event Photography', 'Photo Editing'],
            hourly_rate: 75,
            rating: 4.8,
            completed_jobs: 127,
            profile_image: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face',
            location: 'Manhattan, NY',
            availability: 'Available this weekend',
            match_score: 95,
            estimated_time: request.estimatedHours || 2,
            flat_price: request.flatPrice || 150
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    generateProviders()
  }, [request])



  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider)
    onProviderSelect(provider)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finding perfect providers for you...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <span className="font-semibold text-gray-900">Provider Matches</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Request Summary */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {providers.length} Providers Found
              </h1>
              <p className="text-gray-600">
                {request.service} • {request.location} • ${request.budget} budget
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">${request.flatPrice}</div>
              <div className="text-sm text-gray-500">Flat rate</div>
            </div>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.map((provider) => (
            <Card key={provider.id} className="bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Profile Image */}
                  <div className="relative">
                    <img
                      src={provider.profile_image}
                      alt={provider.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="absolute -top-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                  </div>

                  {/* Provider Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <Badge 
                        variant="secondary" 
                        className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200"
                      >
                        {provider.match_score}% match
                      </Badge>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{provider.bio}</p>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {provider.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-white/80">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{provider.rating}</span>
                        <span className="text-sm text-gray-500">({provider.completed_jobs} jobs)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{provider.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">${provider.hourly_rate}/hr</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{provider.availability}</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-600">Estimated {provider.estimated_time} hours</div>
                          <div className="text-xs text-gray-500">Based on ${provider.hourly_rate}/hr rate</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-indigo-600">${provider.flat_price}</div>
                          <div className="text-xs text-gray-500">Flat rate</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleProviderSelect(provider)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Select {provider.name}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Why These Providers */}
        <div className="mt-8 bg-white/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Sparkles className="w-5 h-5 text-indigo-600 mr-2" />
            Why These Providers?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <div className="font-medium text-gray-900 mb-1">Budget Match</div>
              <div>All providers have hourly rates that fit your ${request.budget} budget</div>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-1">Skill Alignment</div>
              <div>Specialized in {request.service} with proven track records</div>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-1">Availability</div>
              <div>Available for your {request.timeline} timeline</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}