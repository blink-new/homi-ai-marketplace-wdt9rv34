import { useState } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Separator } from './ui/separator'
import { Calendar } from './ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { ArrowLeft, Calendar as CalendarIcon, Clock, DollarSign, Star, MapPin, Check, CreditCard } from 'lucide-react'

interface BookingFlowProps {
  request: any
  requestId: string
  provider: any
  user: any
  onBack: () => void
}

export function BookingFlow({ request, requestId, provider, user, onBack }: BookingFlowProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ]

  const totalPrice = Math.round(provider.hourlyRate * parseFloat(request.duration.split(' ')[0] || '2'))

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) return

    setIsBooking(true)
    try {
      // Create booking record
      const scheduledDateTime = new Date(selectedDate)
      const [time, period] = selectedTime.split(' ')
      const [hours, minutes] = time.split(':')
      let hour = parseInt(hours)
      if (period === 'PM' && hour !== 12) hour += 12
      if (period === 'AM' && hour === 12) hour = 0
      
      scheduledDateTime.setHours(hour, parseInt(minutes || '0'))

      const booking = await blink.db.bookings.create({
        id: `booking_${Date.now()}`,
        requestId,
        providerId: provider.id,
        userId: user.id,
        scheduledTime: scheduledDateTime.toISOString(),
        finalPrice: totalPrice,
        status: 'confirmed',
        paymentStatus: 'completed'
      })

      // Update request status
      await blink.db.requests.update(requestId, {
        status: 'booked',
        finalPrice: totalPrice
      })

      setBookingComplete(true)
    } catch (error) {
      console.error('Error creating booking:', error)
    } finally {
      setIsBooking(false)
    }
  }

  if (bookingComplete) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-green-800">Booking Confirmed!</h2>
              <p className="text-green-700">
                Your service has been booked with {provider.name}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Date & Time:</span>
                <span>{selectedDate?.toLocaleDateString()} at {selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Service:</span>
                <span>{request.taskType}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total:</span>
                <span className="font-bold">${totalPrice}</span>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()}>
                Book Another Service
              </Button>
              <Button variant="outline" onClick={onBack}>
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Matches
        </Button>
        <h1 className="text-2xl font-bold">Book Your Service</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Provider Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={provider.profileImage} />
                  <AvatarFallback>
                    {provider.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{provider.name}</h3>
                    <Badge variant="secondary">{provider.matchScore}% match</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{provider.rating} ({provider.completedJobs} jobs)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {provider.location}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">${provider.hourlyRate}/hr</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date < new Date(Date.now() - 86400000)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Select Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    onClick={() => setSelectedTime(time)}
                    className="h-12"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any specific requirements or details for the provider..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Service</span>
                  <span className="text-sm font-medium">{request.taskType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{request.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rate</span>
                  <span className="text-sm font-medium">${provider.hourlyRate}/hr</span>
                </div>
                {selectedDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm font-medium">{selectedDate.toLocaleDateString()}</span>
                  </div>
                )}
                {selectedTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Time</span>
                    <span className="text-sm font-medium">{selectedTime}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${totalPrice}</span>
              </div>

              <Button
                className="w-full h-12"
                onClick={handleBooking}
                disabled={!selectedDate || !selectedTime || isBooking}
              >
                {isBooking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Confirm & Pay ${totalPrice}
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                Secure payment processing. You'll be charged when the service is completed.
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{request.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Required Skills</p>
                <div className="flex flex-wrap gap-1">
                  {request.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Location</p>
                <p className="text-sm text-muted-foreground">{request.location}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}