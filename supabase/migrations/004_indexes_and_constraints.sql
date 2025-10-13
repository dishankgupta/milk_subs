-- =====================================================
-- 004_indexes_and_constraints.sql
-- Performance Indexes and Additional Constraints for milk_subs
-- Optimizes query performance for large datasets
-- =====================================================

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Audit trail indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_at ON public.audit_trail USING btree (changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_record_id ON public.audit_trail USING btree (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_operation ON public.audit_trail USING btree (table_name, operation);

-- Bulk operation logs indexes
CREATE INDEX IF NOT EXISTS idx_bulk_logs_operation ON public.bulk_operation_logs USING btree (operation_type, started_at);
CREATE INDEX IF NOT EXISTS idx_bulk_logs_status ON public.bulk_operation_logs USING btree (status, started_at);

-- Daily orders indexes
CREATE INDEX IF NOT EXISTS idx_daily_orders_customer_date_status ON public.daily_orders USING btree (customer_id, order_date, status);

-- Deliveries indexes (performance critical)
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON public.deliveries USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_status ON public.deliveries USING btree (delivery_status);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_time ON public.deliveries USING btree (delivery_time);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_date ON public.deliveries USING btree (order_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_product_id ON public.deliveries USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_route_id ON public.deliveries USING btree (route_id);

-- Invoice metadata indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_invoice_customer_id ON public.invoice_metadata USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_date ON public.invoice_metadata USING btree (invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_metadata_active ON public.invoice_metadata USING btree (id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_invoice_metadata_customer_status_outstanding ON public.invoice_metadata USING btree (customer_id, invoice_status, amount_outstanding);
CREATE INDEX IF NOT EXISTS idx_invoice_number ON public.invoice_metadata USING btree (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_period ON public.invoice_metadata USING btree (period_start, period_end);

-- Invoice sales mapping indexes
CREATE INDEX IF NOT EXISTS idx_invoice_sales_mapping_invoice_id ON public.invoice_sales_mapping USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sales_mapping_sale_id ON public.invoice_sales_mapping USING btree (sale_id);

-- Opening balance payments indexes
CREATE INDEX IF NOT EXISTS idx_opening_balance_payments_customer ON public.opening_balance_payments USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_opening_balance_payments_payment ON public.opening_balance_payments USING btree (payment_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_customer_date ON public.payments USING btree (customer_id, payment_date);

-- Sales indexes (performance critical for reports)
CREATE INDEX IF NOT EXISTS idx_sales_customer_date ON public.sales USING btree (customer_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_type_date ON public.sales USING btree (customer_id, sale_type, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales USING btree (sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales USING btree (payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_sales_type ON public.sales USING btree (sale_type);

-- Sales payments indexes
CREATE INDEX IF NOT EXISTS idx_sales_payments_created_at ON public.sales_payments USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payments_payment_id ON public.sales_payments USING btree (payment_id);
CREATE INDEX IF NOT EXISTS idx_sales_payments_sales_id ON public.sales_payments USING btree (sales_id);

-- =====================================================
-- ADDITIONAL CONSTRAINTS & VALIDATIONS
-- =====================================================

-- Ensure invoice line items reference validation is consistent
-- (This constraint already exists but ensuring it's documented)
-- ALTER TABLE public.invoice_line_items
--     ADD CONSTRAINT invoice_line_items_reference_check
--     CHECK (
--         ((line_item_type::text = 'subscription'::text) AND (delivery_id IS NOT NULL) AND (sale_id IS NULL)) OR
--         ((line_item_type::text = 'manual_sale'::text) AND (sale_id IS NOT NULL) AND (delivery_id IS NULL)) OR
--         ((line_item_type::text = 'adjustment'::text) AND (delivery_id IS NULL) AND (sale_id IS NULL))
--     );

-- Sales business logic constraints (already exist but documenting)
-- Cash/QR sales cannot have customer_id, Credit sales must have customer_id
-- ALTER TABLE public.sales
--     ADD CONSTRAINT sales_cash_no_customer
--     CHECK (((sale_type = ANY (ARRAY['Cash'::text, 'QR'::text])) AND (customer_id IS NULL)) OR (sale_type = 'Credit'::text));

-- ALTER TABLE public.sales
--     ADD CONSTRAINT sales_credit_has_customer
--     CHECK (((sale_type = 'Credit'::text) AND (customer_id IS NOT NULL)) OR (sale_type = ANY (ARRAY['Cash'::text, 'QR'::text])));

-- Sales payment status logic validation
-- ALTER TABLE public.sales
--     ADD CONSTRAINT sales_payment_status_logic
--     CHECK (
--         ((sale_type = ANY (ARRAY['Cash'::text, 'QR'::text])) AND (payment_status = 'Completed'::text)) OR
--         ((sale_type = 'Credit'::text) AND (payment_status = ANY (ARRAY['Pending'::text, 'Billed'::text, 'Completed'::text])))
--     );

-- =====================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- Customer and product combination for subscriptions
CREATE INDEX IF NOT EXISTS idx_base_subscriptions_customer_product ON public.base_subscriptions USING btree (customer_id, product_id, is_active);

-- Customer and date range for modifications
CREATE INDEX IF NOT EXISTS idx_modifications_customer_date_range ON public.modifications USING btree (customer_id, start_date, end_date, is_active);

-- Multi-column index for invoice generation queries
CREATE INDEX IF NOT EXISTS idx_deliveries_invoice_generation ON public.deliveries USING btree (customer_id, order_date, delivery_status) WHERE delivery_status = 'delivered';

-- Multi-column index for sales invoice generation
CREATE INDEX IF NOT EXISTS idx_sales_invoice_generation ON public.sales USING btree (customer_id, sale_date, sale_type, payment_status) WHERE sale_type = 'Credit' AND payment_status = 'Pending';

-- Invoice payments lookup optimization
CREATE INDEX IF NOT EXISTS idx_invoice_payments_lookup ON public.invoice_payments USING btree (invoice_id, payment_id, amount_allocated);

-- Outstanding calculations optimization
CREATE INDEX IF NOT EXISTS idx_invoice_metadata_outstanding ON public.invoice_metadata USING btree (customer_id, invoice_status, amount_outstanding) WHERE invoice_status IN ('pending', 'partially_paid', 'overdue', 'sent');

-- Unapplied payments optimization
CREATE INDEX IF NOT EXISTS idx_unapplied_payments_customer ON public.unapplied_payments USING btree (customer_id, amount_unapplied);

-- =====================================================
-- PARTIAL INDEXES FOR PERFORMANCE
-- =====================================================

-- Active subscriptions only
CREATE INDEX IF NOT EXISTS idx_base_subscriptions_active ON public.base_subscriptions USING btree (customer_id, product_id) WHERE is_active = true;

-- Active modifications only
CREATE INDEX IF NOT EXISTS idx_modifications_active ON public.modifications USING btree (customer_id, product_id, start_date, end_date) WHERE is_active = true;

-- Pending orders only
CREATE INDEX IF NOT EXISTS idx_daily_orders_pending ON public.daily_orders USING btree (customer_id, order_date) WHERE status = 'Pending';

-- Delivered deliveries only
CREATE INDEX IF NOT EXISTS idx_deliveries_delivered ON public.deliveries USING btree (order_date, customer_id) WHERE delivery_status = 'delivered';

-- Credit sales pending payment
CREATE INDEX IF NOT EXISTS idx_sales_credit_pending ON public.sales USING btree (customer_id, sale_date) WHERE sale_type = 'Credit' AND payment_status = 'Pending';

-- Non-deleted invoices only
CREATE INDEX IF NOT EXISTS idx_invoice_metadata_not_deleted ON public.invoice_metadata USING btree (customer_id, period_start, period_end) WHERE deleted_at IS NULL;

-- Unpaid invoices only
CREATE INDEX IF NOT EXISTS idx_invoice_metadata_unpaid ON public.invoice_metadata USING btree (customer_id, invoice_date, total_amount) WHERE invoice_status IN ('pending', 'partially_paid', 'overdue', 'sent');

-- =====================================================
-- FUNCTIONAL INDEXES
-- =====================================================

-- Case-insensitive customer search
CREATE INDEX IF NOT EXISTS idx_customers_billing_name_lower ON public.customers USING btree (lower(billing_name));

-- Case-insensitive product search
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON public.products USING btree (lower(name));
CREATE INDEX IF NOT EXISTS idx_products_code_lower ON public.products USING btree (lower(code));

-- Date extraction indexes for reporting
CREATE INDEX IF NOT EXISTS idx_sales_month_year ON public.sales USING btree (EXTRACT(year FROM sale_date), EXTRACT(month FROM sale_date));
CREATE INDEX IF NOT EXISTS idx_deliveries_month_year ON public.deliveries USING btree (EXTRACT(year FROM order_date), EXTRACT(month FROM order_date));
CREATE INDEX IF NOT EXISTS idx_payments_month_year ON public.payments USING btree (EXTRACT(year FROM payment_date), EXTRACT(month FROM payment_date));

-- =====================================================
-- UNIQUE CONSTRAINTS (Additional)
-- =====================================================

-- Ensure unique daily orders per customer per product per date
-- (Already exists: daily_orders_customer_id_product_id_order_date_key)

-- Ensure unique invoice numbers
-- (Already exists: invoice_metadata_invoice_number_key)

-- Ensure unique product codes
-- (Already exists: products_code_key)

-- Ensure unique payment allocation per invoice-payment combination
-- (Already exists: invoice_payments_invoice_id_payment_id_key)

-- Ensure unique sales payment allocation per sales-payment combination
-- (Already exists: sales_payments_sales_id_payment_id_key)

-- Ensure unique opening balance payment per payment-customer combination
-- (Already exists: opening_balance_payments_payment_id_customer_id_key)

-- Ensure unique unapplied payment per payment
-- (Already exists: unique_payment_id on unapplied_payments)

-- Ensure unique invoice-sales mapping
-- (Already exists: invoice_sales_mapping_invoice_id_sale_id_key)

-- =====================================================
-- EXPRESSION INDEXES FOR COMPLEX CALCULATIONS
-- =====================================================

-- Index for GST calculations
CREATE INDEX IF NOT EXISTS idx_sales_gst_calculation ON public.sales USING btree ((total_amount - gst_amount), gst_amount);

-- Index for invoice totals
CREATE INDEX IF NOT EXISTS idx_invoice_metadata_totals ON public.invoice_metadata USING btree ((total_amount - amount_paid), amount_outstanding);

-- =====================================================
-- MAINTENANCE AND MONITORING INDEXES
-- =====================================================

-- Bulk operation monitoring
CREATE INDEX IF NOT EXISTS idx_bulk_logs_monitoring ON public.bulk_operation_logs USING btree (started_at, status, operation_type);

-- Audit trail monitoring
CREATE INDEX IF NOT EXISTS idx_audit_trail_monitoring ON public.audit_trail USING btree (changed_at, table_name, operation);

-- System health monitoring indexes
CREATE INDEX IF NOT EXISTS idx_payments_allocation_status ON public.payments USING btree (allocation_status, created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_metadata_status_created ON public.invoice_metadata USING btree (invoice_status, created_at);

-- =====================================================
-- COVERING INDEXES (Include columns for index-only scans)
-- =====================================================

-- Customer details with route information
CREATE INDEX IF NOT EXISTS idx_customers_with_route ON public.customers USING btree (id) INCLUDE (billing_name, contact_person, phone_primary, route_id);

-- Product details
CREATE INDEX IF NOT EXISTS idx_products_details ON public.products USING btree (id) INCLUDE (name, code, current_price, gst_rate);

-- Sales summary information
CREATE INDEX IF NOT EXISTS idx_sales_summary ON public.sales USING btree (customer_id, sale_date) INCLUDE (product_id, quantity, total_amount, sale_type, payment_status);

-- =====================================================
-- QUERY OPTIMIZATION COMMENTS
-- =====================================================

-- Common query patterns optimized by these indexes:
-- 1. Customer outstanding calculations (idx_invoice_metadata_customer_status_outstanding)
-- 2. Invoice generation queries (idx_deliveries_invoice_generation, idx_sales_invoice_generation)
-- 3. Payment allocation lookups (idx_invoice_payments_lookup)
-- 4. Date-range reports (idx_sales_date, idx_deliveries_order_date, idx_payments_customer_date)
-- 5. Status-based filtering (partial indexes for active/pending/delivered records)
-- 6. Search functionality (case-insensitive indexes)
-- 7. Monthly/yearly reporting (date extraction indexes)

-- =====================================================
-- INDEX MAINTENANCE NOTES
-- =====================================================

-- These indexes should be monitored for usage and performance:
-- - Run pg_stat_user_indexes to monitor index usage
-- - Consider dropping unused indexes in production
-- - Monitor index size vs. performance benefit
-- - Review and update indexes based on query performance analysis

-- Recommended maintenance commands:
-- ANALYZE; -- Update table statistics
-- REINDEX CONCURRENTLY; -- Rebuild indexes if needed

-- =====================================================
-- END OF INDEXES AND CONSTRAINTS
-- =====================================================