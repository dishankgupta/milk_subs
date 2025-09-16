"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Package2, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export type DeliveryType = 'all' | 'subscription' | 'additional'

interface DeliveryTypeToggleProps {
  value: DeliveryType
  onChange: (type: DeliveryType) => void
  counts?: {
    all: number
    subscription: number
    additional: number
  }
  className?: string
}

export function DeliveryTypeToggle({ 
  value, 
  onChange, 
  counts,
  className 
}: DeliveryTypeToggleProps) {
  const handleClick = (optionValue: DeliveryType) => {
    if (value !== optionValue) {
      onChange(optionValue)
    }
  }

  const options = [
    {
      value: 'all' as const,
      label: 'All Deliveries',
      icon: Layers,
      description: 'Show all delivery types',
      color: 'text-gray-600',
      activeColor: 'bg-gray-600 text-white'
    },
    {
      value: 'subscription' as const,
      label: 'Subscription',
      icon: Package,
      description: 'Regular subscription deliveries',
      color: 'text-blue-600',
      activeColor: 'bg-blue-600 text-white'
    },
    {
      value: 'additional' as const,
      label: 'Additional Items',
      icon: Package2,
      description: 'Extra products delivered',
      color: 'text-orange-600',
      activeColor: 'bg-orange-600 text-white'
    }
  ]

  const activeOption = options.find(opt => opt.value === value)

  return (
    <Card className={cn("w-fit", className)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {options.map((option) => {
            const Icon = option.icon
            const isActive = value === option.value
            const count = counts?.[option.value] || 0
            
            return (
              <Button
                key={option.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleClick(option.value)}
                className={cn(
                  "flex items-center gap-2 transition-all duration-200",
                  isActive 
                    ? option.activeColor 
                    : cn("hover:border-current", option.color)
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{option.label}</span>
                {counts && (
                  <Badge 
                    variant={isActive ? "secondary" : "outline"}
                    className={cn(
                      "ml-1",
                      isActive ? "bg-white/20 text-white border-white/30" : ""
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>
        
        {/* Description for mobile/accessibility */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {activeOption?.description || 'Show all delivery types'}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to categorize deliveries
export function categorizeDeliveries<T extends { daily_order_id?: string | null, planned_quantity?: number | null }>(
  deliveries: T[]
): {
  all: T[]
  subscription: T[]
  additional: T[]
  counts: { all: number, subscription: number, additional: number }
} {
  const subscription = deliveries.filter(delivery => 
    delivery.daily_order_id !== null && delivery.planned_quantity !== null
  )
  
  const additional = deliveries.filter(delivery => 
    delivery.daily_order_id === null || delivery.planned_quantity === null
  )
  
  return {
    all: deliveries,
    subscription,
    additional,
    counts: {
      all: deliveries.length,
      subscription: subscription.length,
      additional: additional.length
    }
  }
}