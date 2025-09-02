"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, MapPin, Clock, User } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Route, Customer } from "@/lib/types"
import type { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form"
import type { DeliveryWithAdditionalItemsFormData } from "@/lib/validations"

interface DeliveryDetailsCardProps {
  routes: Route[]
  selectedCustomer: Customer | null
  register: UseFormRegister<DeliveryWithAdditionalItemsFormData>
  errors: FieldErrors<DeliveryWithAdditionalItemsFormData>
  watch: UseFormWatch<DeliveryWithAdditionalItemsFormData>
  setValue: UseFormSetValue<DeliveryWithAdditionalItemsFormData>
  deliveredAt: Date
  setDeliveredAt: (date: Date) => void
}

export function DeliveryDetailsCard({
  routes,
  selectedCustomer,
  register,
  errors,
  watch,
  setValue,
  deliveredAt,
  setDeliveredAt
}: DeliveryDetailsCardProps) {
  const selectedRouteId = watch("route_id")
  const selectedDeliveryTime = watch("delivery_time")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Delivery Details
        </CardTitle>
        <CardDescription>
          Configure delivery information and timing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Route Selection */}
          <div className="space-y-2">
            <Label htmlFor="route">Route <span className="text-red-500">*</span></Label>
            <Select
              value={selectedRouteId}
              onValueChange={(value) => setValue("route_id", value)}
              disabled={!!selectedCustomer} // Auto-selected from customer
            >
              <SelectTrigger>
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    <div className="flex flex-col">
                      <span>{route.name}</span>
                      {route.description && (
                        <span className="text-xs text-muted-foreground">
                          {route.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <div className="text-xs text-blue-600">
                ℹ️ Route auto-selected from customer profile
              </div>
            )}
            {errors.route_id && (
              <p className="text-sm text-red-500">{errors.route_id.message}</p>
            )}
          </div>

          {/* Delivery Time */}
          <div className="space-y-2">
            <Label htmlFor="delivery_time">Delivery Time <span className="text-red-500">*</span></Label>
            <Select
              value={selectedDeliveryTime}
              onValueChange={(value) => setValue("delivery_time", value as "Morning" | "Evening")}
              disabled={!!selectedCustomer} // Auto-selected from customer
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Morning">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Morning (6:00 AM - 12:00 PM)
                  </div>
                </SelectItem>
                <SelectItem value="Evening">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Evening (5:00 PM - 9:00 PM)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <div className="text-xs text-blue-600">
                ℹ️ Time auto-selected from customer profile
              </div>
            )}
            {errors.delivery_time && (
              <p className="text-sm text-red-500">{errors.delivery_time.message}</p>
            )}
          </div>

          {/* Delivery Person */}
          <div className="space-y-2">
            <Label htmlFor="delivery_person">Delivery Person</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="delivery_person"
                {...register("delivery_person")}
                placeholder="Enter delivery person name"
                className={`pl-10 ${errors.delivery_person ? "border-red-500" : ""}`}
              />
            </div>
            {errors.delivery_person && (
              <p className="text-sm text-red-500">{errors.delivery_person.message}</p>
            )}
          </div>

          {/* Delivery Date & Time */}
          <div className="space-y-2">
            <Label>Delivery Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deliveredAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveredAt ? (
                    format(deliveredAt, "PPP 'at' p")
                  ) : (
                    <span>Pick delivery date & time</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveredAt}
                  onSelect={(date) => {
                    if (date) {
                      // Preserve time if setting new date
                      const currentTime = deliveredAt || new Date()
                      date.setHours(currentTime.getHours(), currentTime.getMinutes())
                      setDeliveredAt(date)
                      setValue("delivered_at", date)
                    }
                  }}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <input
                    type="time"
                    className="w-full px-3 py-1 border rounded"
                    value={deliveredAt ? format(deliveredAt, "HH:mm") : ""}
                    onChange={(e) => {
                      if (deliveredAt && e.target.value) {
                        const [hours, minutes] = e.target.value.split(':').map(Number)
                        const newDate = new Date(deliveredAt)
                        newDate.setHours(hours, minutes)
                        setDeliveredAt(newDate)
                        setValue("delivered_at", newDate)
                      }
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Delivery Notes */}
        <div className="space-y-2">
          <Label htmlFor="delivery_notes">Delivery Notes</Label>
          <Textarea
            id="delivery_notes"
            {...register("delivery_notes")}
            placeholder="Any special delivery instructions, issues, or customer feedback..."
            className={`min-h-[100px] ${errors.delivery_notes ? "border-red-500" : ""}`}
            rows={4}
          />
          {errors.delivery_notes && (
            <p className="text-sm text-red-500">{errors.delivery_notes.message}</p>
          )}
        </div>

        {/* Customer Address Display */}
        {selectedCustomer && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <Label className="text-blue-800">Delivery Address</Label>
                <div className="text-sm">
                  <div className="font-medium">{selectedCustomer.billing_name}</div>
                  <div className="text-muted-foreground">{selectedCustomer.address}</div>
                  <div className="flex items-center gap-4 mt-2">
                    <span>📞 {selectedCustomer.phone_primary}</span>
                    {selectedCustomer.phone_secondary && (
                      <span>📞 {selectedCustomer.phone_secondary}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}