import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Separator } from './ui/separator'
import { Plus, Star, DollarSign, Calendar, Clock, MapPin, Edit, Save, X } from 'lucide-react'

interface ProviderDashboardProps {
  user: any
}

interface ProviderProfile {
  id: string
  name: string
  bio: string
  skills: string[]
  hourlyRate: number
  location: string
  rating: number
  completedJobs: number
}

export function ProviderDashboard({ user }: ProviderDashboardProps) {
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    skills: '',
    hourlyRate: '',
    location: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProviderProfile()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProviderProfile = async () => {
    try {
      const providers = await blink.db.providers.list({
        where: { userId: user.id },
        limit: 1
      })

      if (providers.length > 0) {
        const provider = providers[0]
        const profileData = {
          ...provider,
          skills: JSON.parse(provider.skills || '[]')
        }
        setProfile(profileData)
        setEditForm({
          name: provider.name,
          bio: provider.bio || '',
          skills: JSON.parse(provider.skills || '[]').join(', '),
          hourlyRate: provider.hourlyRate?.toString() || '',
          location: provider.location || ''
        })
      }
    } catch (error) {
      console.error('Error loading provider profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const skillsArray = editForm.skills.split(',').map(s => s.trim()).filter(s => s)
      
      const profileData = {
        userId: user.id,
        name: editForm.name,
        bio: editForm.bio,
        skills: JSON.stringify(skillsArray),
        hourlyRate: parseFloat(editForm.hourlyRate),
        location: editForm.location,
        rating: profile?.rating || 5.0,
        completedJobs: profile?.completedJobs || 0
      }

      if (profile) {
        await blink.db.providers.update(profile.id, profileData)
      } else {
        await blink.db.providers.create({
          id: `provider_${Date.now()}`,
          ...profileData
        })
      }

      await loadProviderProfile()
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading provider dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile && !isEditing) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Become a Provider</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start earning by offering your services. Create your provider profile and get matched with customers.
              </p>
            </div>
            <Button onClick={() => setIsEditing(true)} size="lg">
              Create Provider Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Provider Dashboard</h1>
        {profile && !isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Provider Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bio</label>
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell customers about your experience and expertise..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Skills (comma-separated)</label>
                    <Input
                      value={editForm.skills}
                      onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                      placeholder="Photography, Video Editing, Graphic Design"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hourly Rate ($)</label>
                    <Input
                      type="number"
                      value={editForm.hourlyRate}
                      onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Profile
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : profile ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">{profile.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{profile.rating} rating</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{profile.completedJobs} jobs completed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.location}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{profile.bio}</p>
                  <div>
                    <p className="text-sm font-medium mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="text-lg font-semibold">${profile.hourlyRate}/hour</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Job Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No job requests yet</p>
                <p className="text-sm">Complete your profile to start receiving requests</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">$0</div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="font-medium">$0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Jobs Completed</span>
                  <span className="font-medium">{profile?.completedJobs || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <span className="font-medium">{profile?.rating || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Update Availability
              </Button>
              <Button className="w-full" variant="outline">
                <Star className="w-4 h-4 mr-2" />
                View Reviews
              </Button>
              <Button className="w-full" variant="outline">
                <DollarSign className="w-4 h-4 mr-2" />
                Pricing Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips for Success</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Complete your profile</p>
                <p className="text-muted-foreground">Add skills, bio, and competitive rates</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Respond quickly</p>
                <p className="text-muted-foreground">Fast responses lead to more bookings</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Deliver quality work</p>
                <p className="text-muted-foreground">Great reviews bring repeat customers</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}