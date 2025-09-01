# Outstanding System Production Migration Plan

**Date:** August 20, 2025  
**Version:** 1.0  
**Status:** Ready for Production Deployment

## Migration Overview

This document outlines the production migration strategy for deploying the new invoice-based outstanding system to replace the legacy outstanding_amount field system.

## Pre-Migration Checklist

### ✅ Development Validation Complete
- [x] Database schema migrations applied and tested
- [x] Database functions (`calculate_customer_outstanding`, `update_invoice_status`) working correctly
- [x] Database views (`customer_outstanding_summary`) optimized and functional
- [x] Application code updated to use new outstanding calculation system
- [x] End-to-end workflows validated (invoice creation, payment allocation, status updates)
- [x] Performance testing completed (sub-millisecond query performance)
- [x] Data integrity validation passed

### 📋 Production Readiness Requirements
- [ ] Production database backup completed
- [ ] Maintenance window scheduled (recommended: 2 hours during low traffic)
- [ ] Team notifications sent to stakeholders
- [ ] Rollback procedures documented and tested
- [ ] Post-migration validation scripts prepared

## Migration Strategy

### Phase 1: Database Schema Migration (30 minutes)

#### Step 1.1: Backup Current Production Data
```sql
-- Create full database backup
pg_dump production_db > outstanding_migration_backup_$(date +%Y%m%d_%H%M%S).sql

-- Create specific table backups
CREATE TABLE customers_backup AS SELECT * FROM customers;
CREATE TABLE invoice_metadata_backup AS SELECT * FROM invoice_metadata;
CREATE TABLE payments_backup AS SELECT * FROM payments;
```

#### Step 1.2: Apply Schema Migrations
```sql
-- Migration 1: Create new tables
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoice_metadata(id) ON DELETE CASCADE,
    line_type VARCHAR(20) NOT NULL CHECK (line_type IN ('subscription', 'manual_sale', 'adjustment')),
    reference_id UUID,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoice_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoice_metadata(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(10,2) NOT NULL CHECK (amount_allocated > 0),
    allocation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invoice_id, payment_id)
);

CREATE TABLE unapplied_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount_unapplied DECIMAL(10,2) NOT NULL CHECK (amount_unapplied > 0),
    reason VARCHAR(100) DEFAULT 'Awaiting invoice allocation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Step 1.3: Enhance Existing Tables
```sql
-- Migration 2: Add columns to invoice_metadata
ALTER TABLE invoice_metadata ADD COLUMN invoice_status VARCHAR(20) DEFAULT 'draft' 
    CHECK (invoice_status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'));
ALTER TABLE invoice_metadata ADD COLUMN due_date DATE;
ALTER TABLE invoice_metadata ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoice_metadata ADD COLUMN amount_outstanding DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoice_metadata ADD COLUMN last_payment_date TIMESTAMP WITH TIME ZONE;

-- Migration 3: Add columns to payments
ALTER TABLE payments ADD COLUMN primary_invoice_id UUID REFERENCES invoice_metadata(id);
ALTER TABLE payments ADD COLUMN allocation_status VARCHAR(20) DEFAULT 'unapplied'
    CHECK (allocation_status IN ('unapplied', 'partially_applied', 'fully_applied'));
ALTER TABLE payments ADD COLUMN amount_applied DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN amount_unapplied DECIMAL(10,2);
```

#### Step 1.4: Create Database Functions
```sql
-- Migration 4: Create outstanding calculation function
CREATE OR REPLACE FUNCTION calculate_customer_outstanding(customer_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    outstanding_amount DECIMAL(10,2) := 0;
    opening_balance_amount DECIMAL(10,2) := 0;
    invoice_outstanding DECIMAL(10,2) := 0;
BEGIN
    SELECT COALESCE(opening_balance, 0) 
    INTO opening_balance_amount
    FROM customers 
    WHERE id = customer_uuid;
    
    SELECT COALESCE(SUM(amount_outstanding), 0)
    INTO invoice_outstanding
    FROM invoice_metadata 
    WHERE customer_id = customer_uuid 
    AND invoice_status NOT IN ('paid', 'cancelled');
    
    outstanding_amount := opening_balance_amount + invoice_outstanding;
    
    RETURN outstanding_amount;
END;
$$ LANGUAGE plpgsql;

-- Migration 5: Create invoice status update function
CREATE OR REPLACE FUNCTION update_invoice_status(invoice_uuid UUID)
RETURNS VOID AS $$
DECLARE
    invoice_total DECIMAL(10,2);
    paid_amount DECIMAL(10,2);
    outstanding_amount DECIMAL(10,2);
    new_status VARCHAR(20);
BEGIN
    SELECT i.total_amount INTO invoice_total 
    FROM invoice_metadata i
    WHERE i.id = invoice_uuid;
    
    SELECT COALESCE(SUM(ip.amount_allocated), 0) 
    INTO paid_amount
    FROM invoice_payments ip
    WHERE ip.invoice_id = invoice_uuid;
    
    outstanding_amount := invoice_total - paid_amount;
    
    IF outstanding_amount <= 0 THEN
        new_status := 'paid';
    ELSIF paid_amount > 0 THEN
        new_status := 'partially_paid';
    ELSIF (SELECT i.due_date FROM invoice_metadata i WHERE i.id = invoice_uuid) < CURRENT_DATE THEN
        new_status := 'overdue';
    ELSE
        new_status := 'sent';
    END IF;
    
    UPDATE invoice_metadata 
    SET 
        amount_paid = paid_amount,
        amount_outstanding = outstanding_amount,
        invoice_status = new_status,
        last_payment_date = CASE 
            WHEN paid_amount > 0 THEN (
                SELECT MAX(p.payment_date)
                FROM invoice_payments ip
                JOIN payments p ON ip.payment_id = p.id
                WHERE ip.invoice_id = invoice_uuid
            )
            ELSE NULL
        END
    WHERE id = invoice_uuid;
END;
$$ LANGUAGE plpgsql;
```

#### Step 1.5: Create Performance Views
```sql
-- Migration 6: Create optimized outstanding summary view
CREATE VIEW customer_outstanding_summary AS
SELECT 
    c.id as customer_id,
    c.billing_name,
    c.contact_person,
    r.name as route_name,
    COALESCE(c.opening_balance, 0) as opening_balance,
    COALESCE(SUM(CASE 
        WHEN i.invoice_status NOT IN ('paid', 'cancelled') 
        THEN i.amount_outstanding 
        ELSE 0 
    END), 0) as invoice_outstanding,
    COALESCE(c.opening_balance, 0) + COALESCE(SUM(CASE 
        WHEN i.invoice_status NOT IN ('paid', 'cancelled') 
        THEN i.amount_outstanding 
        ELSE 0 
    END), 0) as total_outstanding,
    COUNT(CASE 
        WHEN i.invoice_status NOT IN ('paid', 'cancelled') 
        THEN 1 
    END) as unpaid_invoice_count,
    MIN(CASE 
        WHEN i.invoice_status NOT IN ('paid', 'cancelled') 
        THEN i.invoice_date 
    END) as oldest_unpaid_date
FROM customers c
LEFT JOIN routes r ON c.route_id = r.id
LEFT JOIN invoice_metadata i ON c.id = i.customer_id
GROUP BY c.id, c.billing_name, c.contact_person, r.name, c.opening_balance
HAVING COALESCE(c.opening_balance, 0) + COALESCE(SUM(CASE 
    WHEN i.invoice_status NOT IN ('paid', 'cancelled') 
    THEN i.amount_outstanding 
    ELSE 0 
END), 0) > 0;
```

### Phase 2: Data Migration (45 minutes)

#### Step 2.1: Migrate Outstanding Amounts to Opening Balance
```sql
-- Migration 7: Transfer existing outstanding amounts to opening balance
-- CRITICAL: This preserves existing outstanding amounts as opening balance
UPDATE customers 
SET opening_balance = COALESCE(opening_balance, 0) + COALESCE(outstanding_amount, 0)
WHERE outstanding_amount > 0;

-- Verify migration
SELECT 
    COUNT(*) as customers_updated,
    SUM(outstanding_amount) as total_migrated_amount,
    SUM(opening_balance) as total_opening_balance
FROM customers 
WHERE outstanding_amount > 0;
```

#### Step 2.2: Initialize Payment Allocation Status
```sql
-- Migration 8: Initialize payment allocation tracking
UPDATE payments SET 
    amount_unapplied = amount - COALESCE(amount_applied, 0),
    allocation_status = CASE 
        WHEN COALESCE(amount_applied, 0) = 0 THEN 'unapplied'
        WHEN COALESCE(amount_applied, 0) < amount THEN 'partially_applied'
        ELSE 'fully_applied'
    END
WHERE amount_unapplied IS NULL;
```

#### Step 2.3: Initialize Invoice Status
```sql
-- Migration 9: Initialize invoice status and outstanding amounts
UPDATE invoice_metadata SET 
    amount_outstanding = CASE 
        WHEN COALESCE(amount_paid, 0) >= total_amount THEN 0
        ELSE total_amount - COALESCE(amount_paid, 0)
    END,
    invoice_status = CASE 
        WHEN COALESCE(amount_paid, 0) >= total_amount THEN 'paid'
        WHEN COALESCE(amount_paid, 0) > 0 THEN 'partially_paid'
        WHEN due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'sent'
    END
WHERE invoice_status IS NULL OR invoice_status = 'draft';
```

### Phase 3: Application Deployment (15 minutes)

#### Step 3.1: Deploy Application Updates
- Deploy new application code with outstanding system integration
- Restart application services
- Verify application startup and database connectivity

#### Step 3.2: Remove Legacy Fields
```sql
-- Migration 10: Remove old outstanding_amount field (FINAL STEP)
-- Only after confirming application is working correctly
ALTER TABLE customers DROP COLUMN outstanding_amount;
```

### Phase 4: Post-Migration Validation (30 minutes)

#### Step 4.1: Data Integrity Validation
```sql
-- Validation 1: Verify all customers have correct outstanding calculations
SELECT 
    c.billing_name,
    c.opening_balance,
    cos.total_outstanding,
    calculate_customer_outstanding(c.id) as function_result,
    CASE 
        WHEN cos.total_outstanding = calculate_customer_outstanding(c.id) THEN 'PASS'
        ELSE 'FAIL'
    END as validation_status
FROM customers c
LEFT JOIN customer_outstanding_summary cos ON c.id = cos.customer_id
ORDER BY validation_status DESC, total_outstanding DESC;

-- Validation 2: Verify invoice status consistency
SELECT 
    invoice_status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    SUM(amount_paid) as total_paid,
    SUM(amount_outstanding) as total_outstanding
FROM invoice_metadata
GROUP BY invoice_status;

-- Validation 3: Verify payment allocation consistency
SELECT 
    allocation_status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    SUM(amount_applied) as total_applied,
    SUM(amount_unapplied) as total_unapplied
FROM payments
GROUP BY allocation_status;
```

#### Step 4.2: Performance Validation
```sql
-- Performance Test: Outstanding dashboard query
EXPLAIN ANALYZE 
SELECT * FROM customer_outstanding_summary 
ORDER BY total_outstanding DESC
LIMIT 100;

-- Performance Test: Customer outstanding calculation
EXPLAIN ANALYZE 
SELECT calculate_customer_outstanding(id) 
FROM customers 
LIMIT 10;
```

#### Step 4.3: Application Functionality Validation
- [ ] Outstanding dashboard loads correctly
- [ ] Customer detail pages show correct outstanding amounts
- [ ] Payment entry works with invoice allocation
- [ ] Invoice generation creates proper line items
- [ ] Reports generate accurately

## Rollback Procedures

### Emergency Rollback (if issues occur)

#### Step 1: Stop Application
```bash
# Stop application services immediately
sudo systemctl stop dairy-app
```

#### Step 2: Restore Database Schema
```sql
-- Restore customers table
DROP TABLE IF EXISTS customers;
CREATE TABLE customers AS SELECT * FROM customers_backup;

-- Restore invoice_metadata table
DROP TABLE IF EXISTS invoice_metadata;
CREATE TABLE invoice_metadata AS SELECT * FROM invoice_metadata_backup;

-- Restore payments table
DROP TABLE IF EXISTS payments;
CREATE TABLE payments AS SELECT * FROM payments_backup;

-- Drop new tables
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoice_payments CASCADE;
DROP TABLE IF EXISTS unapplied_payments CASCADE;

-- Drop new functions and views
DROP FUNCTION IF EXISTS calculate_customer_outstanding(UUID);
DROP FUNCTION IF EXISTS update_invoice_status(UUID);
DROP VIEW IF EXISTS customer_outstanding_summary;
```

#### Step 3: Deploy Previous Application Version
```bash
# Deploy previous application version
git checkout previous-stable-tag
# Restart application
sudo systemctl start dairy-app
```

### Partial Rollback (if only application issues)

#### Option A: Application-Only Rollback
- Keep database changes
- Deploy previous application version
- Outstanding amounts will fall back to opening_balance only

#### Option B: Data-Only Rollback
- Keep application changes  
- Restore outstanding_amount field from backup
- Update application configuration to use legacy system

## Risk Assessment

### High Risk
- **Data Loss**: Mitigated by comprehensive backup strategy
- **Calculation Inconsistency**: Mitigated by extensive validation testing
- **Performance Issues**: Mitigated by performance testing and optimized views

### Medium Risk
- **Application Downtime**: Mitigated by planned maintenance window
- **User Experience Changes**: Mitigated by thorough testing and documentation

### Low Risk
- **Minor UI Issues**: Can be fixed post-migration without rollback

## Success Criteria

### Technical Success Metrics
- [ ] All outstanding calculations match expected values (100% accuracy)
- [ ] Outstanding dashboard queries execute in <1 second
- [ ] Payment allocation workflow completes successfully
- [ ] No database errors or constraint violations
- [ ] Application startup time remains within normal bounds

### Business Success Metrics
- [ ] Users can view accurate outstanding amounts
- [ ] Payment entry workflow is intuitive and functional
- [ ] Reports generate correct outstanding information
- [ ] No customer data discrepancies reported

## Post-Migration Tasks

### Immediate (Day 1)
- [ ] Monitor application performance and error logs
- [ ] Validate outstanding amounts with sample customer checks
- [ ] Ensure all team members understand new outstanding system
- [ ] Update user documentation and training materials

### Short-term (Week 1)
- [ ] Collect user feedback on new outstanding functionality
- [ ] Monitor database performance with real usage patterns
- [ ] Generate and validate financial reports
- [ ] Plan user training sessions

### Long-term (Month 1)
- [ ] Remove backup tables after confirming system stability
- [ ] Optimize queries based on production usage patterns
- [ ] Implement advanced outstanding features (aging analysis, etc.)
- [ ] Document lessons learned and update migration procedures

## Contact Information

### Migration Team
- **Database Administrator**: [To be assigned]
- **Application Developer**: Claude Code AI Assistant
- **Business Stakeholder**: [To be assigned]
- **QA Lead**: [To be assigned]

### Emergency Contacts
- **On-call Database Support**: [Emergency contact]
- **Application Support**: [Emergency contact]
- **Business Owner**: [Emergency contact]

## Conclusion

This migration plan provides a comprehensive strategy for transitioning from the legacy outstanding_amount field system to the new invoice-based outstanding calculation system. The plan emphasizes data safety, system reliability, and business continuity.

The migration is designed to be reversible and includes extensive validation procedures to ensure data integrity throughout the process. All testing has been completed in the development environment, confirming the system's readiness for production deployment.

**Recommendation**: Proceed with production migration during the next scheduled maintenance window.