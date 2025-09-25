# milk_subs Database Migration Files

This directory contains comprehensive migration files that can recreate the entire milk_subs database structure from scratch. These migrations were generated from the current production database state.

## Migration Files Overview

| File | Purpose | Description |
|------|---------|-------------|
| `001_initial_schema.sql` | Core Schema | Creates all tables, columns, constraints, and foreign keys |
| `002_functions_and_procedures.sql` | Business Logic | Creates 25+ custom functions for dairy management |
| `003_triggers_and_policies.sql` | Data Integrity | Creates triggers, RLS policies, and permissions |
| `004_indexes_and_constraints.sql` | Performance | Creates indexes and additional constraints for optimization |
| `005_seed_data.sql` | Essential Data | Inserts routes, products, and validates data integrity |

## Database Statistics

- **Tables**: 20+ core business tables
- **Functions**: 25+ custom business logic functions
- **Triggers**: 12+ triggers for data consistency
- **Indexes**: 50+ performance indexes
- **Extensions**: uuid-ossp, pgcrypto
- **RLS Policies**: Enabled on all main tables

## Key Features Implemented

### Core Business Tables
- **customers**: Customer profiles with billing info, routes, opening balance
- **products**: Product catalog with GST rates (Milk, Paneer, Ghee varieties)
- **routes**: Route 1 & Route 2 with personnel management
- **base_subscriptions**: Daily/Pattern subscription types with 2-day cycles
- **modifications**: Temporary subscription changes (skip/increase/decrease)
- **daily_orders**: Generated orders with pricing & delivery details
- **deliveries**: Self-contained delivery tracking with additional items
- **payments**: Payment history with allocation tracking
- **sales**: Manual sales tracking (Cash/Credit/QR) with GST compliance

### Financial Management Tables
- **invoice_metadata**: Invoice generation with status & payment tracking
- **invoice_line_items**: Detailed line items with delivery references
- **invoice_payments**: Payment allocation for invoice-to-payment mapping
- **sales_payments**: Direct payment allocation to sales (bypassing invoices)
- **unapplied_payments**: Payments not yet allocated to invoices
- **opening_balance_payments**: Historical opening balance payment tracking
- **product_pricing_history**: Price change audit trail

### Database Functions (25+ functions)
- `calculate_customer_outstanding()`: Outstanding calculations with opening balance
- `update_invoice_status()`: Automatic invoice status management
- `process_invoice_payment_atomic()`: Atomic payment processing
- `allocate_payment_atomic()`: Race condition prevention for payments
- `delete_invoice_safe()`: Safe invoice deletion with sales reversion
- `generate_bulk_invoices_atomic()`: Bulk invoice generation
- `rollback_partial_allocation()`: Complete error recovery mechanism
- And 18 more functions for comprehensive dairy business management

## Usage Instructions

### Option 1: Fresh Supabase Project Setup

1. **Create a new Supabase project**
2. **Apply migrations in order**:
   ```bash
   # Using Supabase CLI
   supabase db reset

   # Or apply manually in order:
   # 1. 001_initial_schema.sql
   # 2. 002_functions_and_procedures.sql
   # 3. 003_triggers_and_policies.sql
   # 4. 004_indexes_and_constraints.sql
   # 5. 005_seed_data.sql
   ```

### Option 2: Manual Application

1. **Connect to your database**
2. **Apply each migration file in order**:
   ```sql
   -- Apply migrations one by one
   \i 001_initial_schema.sql
   \i 002_functions_and_procedures.sql
   \i 003_triggers_and_policies.sql
   \i 004_indexes_and_constraints.sql
   \i 005_seed_data.sql
   ```

### Option 3: Supabase CLI

```bash
# Make sure you're in the project root
cd /path/to/milk_subs

# Reset and apply all migrations
supabase db reset

# Or push specific changes
supabase db push
```

## Verification Steps

After applying all migrations, verify the setup:

1. **Check table count**:
   ```sql
   SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public';
   -- Should return 20+ tables
   ```

2. **Check function count**:
   ```sql
   SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = 'public';
   -- Should return 25+ functions
   ```

3. **Check essential data**:
   ```sql
   SELECT COUNT(*) FROM routes; -- Should be 2
   SELECT COUNT(*) FROM products; -- Should be 9+
   ```

4. **Test a key function**:
   ```sql
   SELECT calculate_customer_outstanding('some-customer-uuid');
   ```

## Important Notes

### Database Extensions
- **uuid-ossp**: Required for UUID generation
- **pgcrypto**: Required for additional crypto functions

### RLS (Row Level Security)
- Enabled on all main tables
- Basic policies allow all operations for authenticated users
- Can be customized for more granular permissions

### Performance Considerations
- All critical indexes are included
- Partial indexes for common filtered queries
- Composite indexes for complex queries
- Monitor `pg_stat_user_indexes` for usage

### GST Compliance
- Milk products: 0% GST (essential commodities)
- Ghee products: 5% GST
- Update rates as per current tax regulations

## Customization

### Adding New Products
```sql
INSERT INTO products (name, code, current_price, gst_rate, unit, is_subscription_product)
VALUES ('New Product', 'NP', 100.00, 0.00, 'liter', false);
```

### Adding New Routes
```sql
INSERT INTO routes (name, description, personnel_name)
VALUES ('Route 3', 'Additional delivery route', 'Personnel Name');
```

### Updating GST Rates
```sql
UPDATE products SET gst_rate = 5.00 WHERE code IN ('CG', 'BG');
```

## Troubleshooting

### Common Issues

1. **Extension not found**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```

2. **Permission denied**:
   - Ensure you have SUPERUSER privileges
   - Or run migrations as database owner

3. **Function dependencies**:
   - Apply migrations in exact order
   - Don't skip any migration files

4. **Index creation failures**:
   - Check for existing indexes with same names
   - Review and drop conflicting indexes if needed

### Rollback Instructions

If you need to rollback:

1. **Drop all custom functions**:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

2. **Recreate from migrations**:
   - Apply migration files again in order

## Production Deployment

### Pre-deployment Checklist
- [ ] Backup existing data
- [ ] Test migrations on staging environment
- [ ] Verify all functions work correctly
- [ ] Update GST rates as per regulations
- [ ] Remove sample data functions
- [ ] Enable proper RLS policies
- [ ] Monitor performance after deployment

### Post-deployment Verification
- [ ] All tables created successfully
- [ ] All functions operational
- [ ] Triggers working correctly
- [ ] Indexes created and being used
- [ ] RLS policies active
- [ ] Essential data loaded

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify migration order and completeness
3. Review database logs for specific errors
4. Test individual functions to isolate issues

## Migration File Details

### 001_initial_schema.sql
- Creates all table structures
- Defines primary keys, foreign keys, constraints
- Sets up proper data types and defaults
- Includes comprehensive comments

### 002_functions_and_procedures.sql
- Outstanding calculation functions
- Atomic payment allocation functions
- Invoice status management functions
- Bulk operation functions
- Payment reconciliation functions
- All business logic functions

### 003_triggers_and_policies.sql
- Cascade operation triggers
- Payment allocation sync triggers
- Audit logging triggers
- RLS policies for all tables
- Security permissions

### 004_indexes_and_constraints.sql
- Performance indexes for all tables
- Composite indexes for complex queries
- Partial indexes for filtered data
- Functional indexes for searches
- Covering indexes for index-only scans

### 005_seed_data.sql
- Essential routes (Route 1, Route 2)
- Core dairy products with GST rates
- Product pricing history
- Data validation checks
- Sample data functions (optional)

This comprehensive migration set ensures your milk_subs database can be recreated exactly as it exists in production, with all business logic, performance optimizations, and data integrity measures intact.