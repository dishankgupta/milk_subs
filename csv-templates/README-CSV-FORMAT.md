# CSV Data Upload Templates

## Customer Data Format (`customers-template.csv`)

### Required Fields:
- **billing_name**: Primary business identifier (text, unique)
- **contact_person**: Delivery contact person name (text)
- **address**: Full delivery address (text)
- **phone_primary**: Primary contact number (10-digit number)
- **route_name**: "Route 1" or "Route 2" (exact text)
- **delivery_time**: "Morning" or "Evening" (exact text)
- **payment_method**: "Monthly" or "Prepaid" (exact text)
- **billing_cycle_day**: Day of month for billing (1-31)
- **outstanding_amount**: Outstanding payment amount (decimal, use 0 if none)
- **status**: "Active" or "Inactive" (exact text)

### Optional Fields:
- **phone_secondary**: Additional contact number (can be empty)
- **phone_tertiary**: Third contact number (can be empty)

### Important Notes:
- Phone numbers should be 10 digits without country code
- Billing names must be unique across all customers
- Route names must match exactly: "Route 1" or "Route 2"
- Use decimal format for amounts: 150.50 (not 150,50)

---

## Subscription Data Format (`subscriptions-template.csv`)

### Required Fields:
- **customer_billing_name**: Must match exactly with customer billing_name
- **product_code**: "CM" for Cow Milk or "BM" for Buffalo Milk
- **subscription_type**: "Daily" or "Pattern" (exact text)
- **is_active**: "true" or "false" (lowercase)

### For Daily Subscriptions:
- **daily_quantity**: Quantity per day (decimal: 1, 1.5, 2, etc.)
- Leave pattern fields empty

### For Pattern Subscriptions:
- **pattern_day1_quantity**: Quantity for Day 1 of pattern (decimal)
- **pattern_day2_quantity**: Quantity for Day 2 of pattern (decimal)
- **pattern_start_date**: Start date in YYYY-MM-DD format (e.g., "2025-08-06")
- Leave daily_quantity empty

### Important Notes:
- Each customer can have multiple subscriptions (different products)
- Cannot have duplicate subscriptions (same customer + same product)
- Pattern subscriptions cycle every 2 days: Day 1 → Day 2 → Day 1 → Day 2...
- Use decimal format for quantities: 1.5 (not 1,5)
- Dates must be in YYYY-MM-DD format

---

## Data Validation Rules:

1. **Customer billing_name** must be unique
2. **Phone numbers** should be 10 digits
3. **Route names** must be exactly "Route 1" or "Route 2"
4. **Product codes** must be exactly "CM" or "BM"
5. **Subscription customer names** must match existing customer billing_name
6. **Pattern start dates** should be recent (within last 30 days for accurate cycle calculation)
7. No duplicate subscriptions (same customer + product combination)

## Next Steps:

1. Fill out the CSV files with your actual data
2. Save them as `customers-data.csv` and `subscriptions-data.csv`
3. Provide the files back for upload to the system
4. The system will validate and import the data with proper error handling