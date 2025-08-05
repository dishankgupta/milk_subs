import { Subscription } from "@/lib/types"

// Calculate which day in the 2-day pattern cycle for a given date
export function calculatePatternDay(startDate: Date, targetDate: Date): 1 | 2 {
  const diffTime = targetDate.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return ((diffDays % 2) + 1) as 1 | 2
}

// Get quantity for a pattern subscription on a specific date
export function getPatternQuantity(subscription: Subscription, targetDate: Date): number {
  if (subscription.subscription_type !== "Pattern" || !subscription.pattern_start_date) {
    return 0
  }

  const startDate = new Date(subscription.pattern_start_date)
  const patternDay = calculatePatternDay(startDate, targetDate)
  
  if (patternDay === 1) {
    return subscription.pattern_day1_quantity || 0
  } else {
    return subscription.pattern_day2_quantity || 0
  }
}