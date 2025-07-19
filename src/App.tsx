import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import { RequestFlow } from './components/RequestFlow'
import { ProviderDashboard } from './components/ProviderDashboard'
import { UserDashboard } from './components/UserDashboard'
import { Button } from './components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Sparkles, Users, Calendar } from 'lucide-react'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('request')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading Homi...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Homi
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                  AI-powered local services marketplace where you request anything in plain language 
                  and get instantly matched to the right provider.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 rounded-xl"
                  onClick={() => blink.auth.login()}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Started
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-6 rounded-xl"
                  onClick={() => blink.auth.login()}
                >
                  Join as Provider
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">AI-Powered Matching</h3>
                  <p className="text-muted-foreground">
                    Describe what you need in plain language. Our AI understands and finds the perfect provider.
                  </p>
                </div>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg">60-Second Matches</h3>
                  <p className="text-muted-foreground">
                    Get matched with 3-5 qualified providers in under 60 seconds. No browsing, no categories.
                  </p>
                </div>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Instant Booking</h3>
                  <p className="text-muted-foreground">
                    Book, pay, and schedule in one flow. Transparent pricing with no hidden fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Homi
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user.email}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => blink.auth.logout()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="request" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Request Service
            </TabsTrigger>
            <TabsTrigger value="provider" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Provider Dashboard
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              My Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-6">
            <RequestFlow user={user} />
          </TabsContent>

          <TabsContent value="provider" className="space-y-6">
            <ProviderDashboard user={user} />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <UserDashboard user={user} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App