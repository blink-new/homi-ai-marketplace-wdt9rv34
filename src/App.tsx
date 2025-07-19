import React, { useState, useEffect } from 'react'
import { createClient } from '@blinkdotnew/sdk'
import RequestFlow from './components/RequestFlow'
import ProviderMatches from './components/ProviderMatches'
import { BookingFlow } from './components/BookingFlow'
import { ProviderDashboard } from './components/ProviderDashboard'
import { UserDashboard } from './components/UserDashboard'
import { Button } from './components/ui/button'
import { Sparkles, Users, Calendar, DollarSign } from 'lucide-react'

const blink = createClient({
  projectId: 'homi-ai-marketplace-wdt9rv34',
  authRequired: true
})

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('home')
  const [currentRequest, setCurrentRequest] = useState(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Homi...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Homi</h1>
          <p className="text-gray-600 mb-8">Please sign in to continue</p>
          <Button onClick={() => blink.auth.login()}>Sign In</Button>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case 'request':
        return (
          <RequestFlow
            user={user}
            onRequestComplete={(request) => {
              setCurrentRequest(request)
              setCurrentView('matches')
            }}
            onBack={() => setCurrentView('home')}
          />
        )
      case 'matches':
        return (
          <ProviderMatches
            request={currentRequest}
            onProviderSelect={(provider) => {
              setCurrentView('booking')
            }}
            onBack={() => setCurrentView('request')}
          />
        )
      case 'booking':
        return (
          <BookingFlow
            request={currentRequest}
            onBookingComplete={() => setCurrentView('user-dashboard')}
            onBack={() => setCurrentView('matches')}
          />
        )
      case 'provider-dashboard':
        return (
          <ProviderDashboard
            user={user}
            onBack={() => setCurrentView('home')}
          />
        )
      case 'user-dashboard':
        return (
          <UserDashboard
            user={user}
            onBack={() => setCurrentView('home')}
          />
        )
      default:
        return <HomePage />
    }
  }

  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Homi
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentView('user-dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                My Requests
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCurrentView('provider-dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                Provider Hub
              </Button>
              <Button
                variant="outline"
                onClick={() => blink.auth.logout()}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Meet Homi,
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                your personal service assistant
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Request any local service in plain language and get instantly matched 
              to the perfect provider with AI-powered scoping and flat pricing.
            </p>

            {/* Main CTA */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 max-w-2xl mx-auto border border-gray-200/50 shadow-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">What do you need help with?</h2>
              </div>
              
              <Button
                onClick={() => setCurrentView('request')}
                className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Start a Request
              </Button>
            </div>

            {/* Quick Examples */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                { icon: "📸", title: "Photography", example: "Need headshots for LinkedIn" },
                { icon: "🧹", title: "Cleaning", example: "Deep clean my apartment" },
                { icon: "🔧", title: "Handyman", example: "Fix my leaky faucet" },
                { icon: "💻", title: "Tech Support", example: "Set up my home WiFi" }
              ].map((service, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentView('request')}
                  className="bg-white/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:bg-white/60 transition-all duration-200 cursor-pointer group"
                >
                  <div className="text-3xl mb-3">{service.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-sm text-gray-600 group-hover:text-gray-700">{service.example}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white/50 backdrop-blur-sm py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How Homi Works</h2>
            <p className="text-lg text-gray-600">Simple, fast, and intelligent service matching</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Describe Your Need",
                description: "Tell us what you need in plain language. Our AI understands context and requirements."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Get Matched Instantly",
                description: "AI finds the perfect providers based on skills, availability, and your budget."
              },
              {
                icon: <Calendar className="w-8 h-8" />,
                title: "Book & Pay",
                description: "Confirm your provider, schedule the service, and pay securely in one click."
              }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {renderView()}
    </div>
  )
}

export default App