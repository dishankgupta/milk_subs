-- =====================================================
-- 001_initial_schema.sql
-- Comprehensive Initial Schema Recreation for milk_subs
-- Creates all core tables with proper structure and constraints
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- =====================================================
-- CORE BUSINESS TABLES
-- =====================================================

-- Routes table: Route 1 & Route 2 with personnel
CREATE TABLE public.routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    personnel_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT routes_pkey PRIMARY KEY (id)
);

-- Products table: Product catalog with GST rates
CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    current_price numeric NOT NULL,
    unit text DEFAULT 'liter'::text NOT NULL,
    gst_rate numeric DEFAULT 0.00,
    unit_of_measure text DEFAULT 'liter'::text,
    is_subscription_product boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_code_key UNIQUE (code),
    CONSTRAINT products_gst_rate_check CHECK ((gst_rate >= 0::numeric) AND (gst_rate <= 30::numeric))
);

-- Customers table: Customer profiles with billing info, routes, opening balance
CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    billing_name text NOT NULL,
    contact_person text,
    address text,
    phone_primary text,
    phone_secondary text,
    phone_tertiary text,
    route_id uuid,
    delivery_time text,
    payment_method text,
    billing_cycle_day integer,
    opening_balance numeric DEFAULT 0.00,
    status text DEFAULT 'Active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT customers_pkey PRIMARY KEY (id),
    CONSTRAINT customers_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id),
    CONSTRAINT customers_billing_cycle_day_check CHECK ((billing_cycle_day >= 1) AND (billing_cycle_day <= 31)),
    CONSTRAINT customers_delivery_time_check CHECK (delivery_time = ANY (ARRAY['Morning'::text, 'Evening'::text])),
    CONSTRAINT customers_opening_balance_check CHECK (opening_balance >= 0::numeric),
    CONSTRAINT customers_payment_method_check CHECK (payment_method = ANY (ARRAY['Monthly'::text, 'Prepaid'::text])),
    CONSTRAINT customers_status_check CHECK (status = ANY (ARRAY['Active'::text, 'Inactive'::text]))
);

-- Base subscriptions table: Daily/Pattern subscription types with 2-day cycles
CREATE TABLE public.base_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    product_id uuid,
    subscription_type text NOT NULL,
    daily_quantity numeric,
    pattern_day1_quantity numeric,
    pattern_day2_quantity numeric,
    pattern_start_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT base_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT base_subscriptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT base_subscriptions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT base_subscriptions_subscription_type_check CHECK (subscription_type = ANY (ARRAY['Daily'::text, 'Pattern'::text]))
);

-- Modifications table: Temporary subscription changes (skip/increase/decrease)
CREATE TABLE public.modifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    product_id uuid,
    modification_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    quantity_change numeric,
    reason text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT modifications_pkey PRIMARY KEY (id),
    CONSTRAINT modifications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT modifications_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT modifications_modification_type_check CHECK (modification_type = ANY (ARRAY['Skip'::text, 'Increase'::text, 'Decrease'::text, 'Add Note'::text])) -- Added 'Add Note' on 26-09-2025 for note-only modifications
);

-- Daily orders table: Generated orders with pricing & delivery details
CREATE TABLE public.daily_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    product_id uuid,
    order_date date NOT NULL,
    planned_quantity numeric NOT NULL,
    unit_price numeric NOT NULL,
    total_amount numeric NOT NULL,
    route_id uuid,
    delivery_time text,
    status text DEFAULT 'Pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT daily_orders_pkey PRIMARY KEY (id),
    CONSTRAINT daily_orders_customer_id_product_id_order_date_key UNIQUE (customer_id, product_id, order_date),
    CONSTRAINT daily_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT daily_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT daily_orders_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id),
    CONSTRAINT daily_orders_delivery_time_check CHECK (delivery_time = ANY (ARRAY['Morning'::text, 'Evening'::text])),
    CONSTRAINT daily_orders_status_check CHECK (status = ANY (ARRAY['Pending'::text, 'Generated'::text, 'Delivered'::text]))
);

-- Deliveries table: Self-contained delivery tracking with additional items
CREATE TABLE public.deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_order_id uuid,
    customer_id uuid NOT NULL,
    product_id uuid NOT NULL,
    route_id uuid NOT NULL,
    order_date date NOT NULL,
    planned_quantity numeric,
    actual_quantity numeric,
    unit_price numeric NOT NULL,
    total_amount numeric NOT NULL,
    delivery_status text DEFAULT 'delivered'::text,
    delivery_time text,
    delivery_notes text,
    delivered_at timestamp with time zone,
    delivery_person text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT deliveries_pkey PRIMARY KEY (id),
    CONSTRAINT deliveries_daily_order_id_fkey FOREIGN KEY (daily_order_id) REFERENCES public.daily_orders(id),
    CONSTRAINT fk_deliveries_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT fk_deliveries_product FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT fk_deliveries_route FOREIGN KEY (route_id) REFERENCES public.routes(id),
    CONSTRAINT chk_delivery_status CHECK (delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'cancelled'::text])),
    CONSTRAINT chk_delivery_time CHECK (delivery_time = ANY (ARRAY['Morning'::text, 'Evening'::text]))
);

-- =====================================================
-- PAYMENT & FINANCIAL TABLES
-- =====================================================

-- Payments table: Payment history with allocation tracking
CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    amount numeric NOT NULL,
    payment_date date NOT NULL,
    payment_method text,
    period_start date,
    period_end date,
    notes text,
    primary_invoice_id uuid,
    allocation_status character varying DEFAULT 'unapplied'::character varying,
    amount_applied numeric DEFAULT 0,
    amount_unapplied numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT payments_allocation_status_check CHECK (allocation_status::text = ANY (ARRAY['unapplied'::character varying, 'partially_applied'::character varying, 'fully_applied'::character varying]::text[]))
);

-- Sales table: Manual sales tracking (Cash/Credit/QR) with GST compliance
CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    product_id uuid NOT NULL,
    quantity numeric NOT NULL,
    unit_price numeric NOT NULL,
    total_amount numeric NOT NULL,
    sale_type text NOT NULL,
    notes text,
    gst_amount numeric DEFAULT 0.00,
    sale_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_status text DEFAULT 'Completed'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT sales_pkey PRIMARY KEY (id),
    CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT sales_quantity_check CHECK (quantity > 0::numeric),
    CONSTRAINT sales_unit_price_check CHECK (unit_price > 0::numeric),
    CONSTRAINT sales_total_amount_check CHECK (total_amount > 0::numeric),
    CONSTRAINT sales_sale_type_check CHECK (sale_type = ANY (ARRAY['Cash'::text, 'Credit'::text, 'QR'::text])),
    CONSTRAINT sales_payment_status_check CHECK (payment_status = ANY (ARRAY['Completed'::text, 'Pending'::text, 'Billed'::text])),
    CONSTRAINT sales_cash_no_customer CHECK (((sale_type = ANY (ARRAY['Cash'::text, 'QR'::text])) AND (customer_id IS NULL)) OR (sale_type = 'Credit'::text)),
    CONSTRAINT sales_credit_has_customer CHECK (((sale_type = 'Credit'::text) AND (customer_id IS NOT NULL)) OR (sale_type = ANY (ARRAY['Cash'::text, 'QR'::text]))),
    CONSTRAINT sales_customer_check CHECK (((sale_type = ANY (ARRAY['Cash'::text, 'QR'::text])) AND (customer_id IS NULL)) OR (sale_type = 'Credit'::text)),
    CONSTRAINT sales_payment_status_logic CHECK (((sale_type = ANY (ARRAY['Cash'::text, 'QR'::text])) AND (payment_status = 'Completed'::text)) OR ((sale_type = 'Credit'::text) AND (payment_status = ANY (ARRAY['Pending'::text, 'Billed'::text, 'Completed'::text]))))
);

-- Invoice metadata table: Invoice generation with status & payment tracking
CREATE TABLE public.invoice_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    customer_id uuid NOT NULL,
    invoice_date date NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_amount numeric NOT NULL,
    subscription_amount numeric DEFAULT 0.00,
    manual_sales_amount numeric DEFAULT 0.00,
    gst_amount numeric DEFAULT 0.00,
    file_path text,
    status text DEFAULT 'Generated'::text,
    deleted_at timestamp with time zone,
    due_date date,
    last_payment_date timestamp with time zone,
    invoice_status character varying DEFAULT 'draft'::character varying,
    amount_paid numeric DEFAULT 0,
    amount_outstanding numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT invoice_metadata_pkey PRIMARY KEY (id),
    CONSTRAINT invoice_metadata_invoice_number_key UNIQUE (invoice_number),
    CONSTRAINT invoice_metadata_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT invoice_metadata_status_check CHECK (status = ANY (ARRAY['Generated'::text, 'Sent'::text, 'Paid'::text])),
    CONSTRAINT invoice_metadata_invoice_status_check CHECK (invoice_status::text = ANY (ARRAY['draft'::character varying, 'sent'::character varying, 'paid'::character varying, 'partially_paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying]::text[]))
);

-- Invoice line items table: Detailed line items with delivery references
CREATE TABLE public.invoice_line_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    line_item_type character varying NOT NULL,
    reference_id uuid,
    order_id uuid,
    sale_id uuid,
    delivery_id uuid,
    product_id uuid,
    product_name character varying NOT NULL,
    quantity numeric NOT NULL,
    unit_price numeric NOT NULL,
    line_total numeric NOT NULL,
    gst_rate numeric DEFAULT 0,
    gst_amount numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id),
    CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice_metadata(id),
    CONSTRAINT invoice_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.daily_orders(id),
    CONSTRAINT invoice_line_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id),
    CONSTRAINT invoice_line_items_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id),
    CONSTRAINT invoice_line_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT invoice_line_items_line_item_type_check CHECK (line_item_type::text = ANY (ARRAY['subscription'::character varying, 'manual_sale'::character varying, 'adjustment'::character varying]::text[])),
    CONSTRAINT invoice_line_items_reference_check CHECK (((line_item_type::text = 'subscription'::text) AND (delivery_id IS NOT NULL) AND (sale_id IS NULL)) OR ((line_item_type::text = 'manual_sale'::text) AND (sale_id IS NOT NULL) AND (delivery_id IS NULL)) OR ((line_item_type::text = 'adjustment'::text) AND (delivery_id IS NULL) AND (sale_id IS NULL)))
);

-- Invoice payments table: Payment allocation for invoice-to-payment mapping
CREATE TABLE public.invoice_payments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    amount_allocated numeric NOT NULL,
    notes text,
    allocation_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),

    CONSTRAINT invoice_payments_pkey PRIMARY KEY (id),
    CONSTRAINT invoice_payments_invoice_id_payment_id_key UNIQUE (invoice_id, payment_id),
    CONSTRAINT invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice_metadata(id),
    CONSTRAINT invoice_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id),
    CONSTRAINT invoice_payments_amount_allocated_check CHECK (amount_allocated > 0::numeric)
);

-- Unapplied payments table: Payments not yet allocated to invoices
CREATE TABLE public.unapplied_payments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    amount_unapplied numeric NOT NULL,
    reason character varying DEFAULT 'Awaiting invoice allocation'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT unapplied_payments_pkey PRIMARY KEY (id),
    CONSTRAINT unique_payment_id UNIQUE (payment_id),
    CONSTRAINT unapplied_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT unapplied_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id),
    CONSTRAINT unapplied_payments_amount_unapplied_check CHECK (amount_unapplied > 0::numeric),
    CONSTRAINT unapplied_positive CHECK (amount_unapplied > 0::numeric)
);

-- Opening balance payments table: Historical opening balance payment tracking
CREATE TABLE public.opening_balance_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    amount numeric NOT NULL,
    allocated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT opening_balance_payments_pkey PRIMARY KEY (id),
    CONSTRAINT opening_balance_payments_payment_id_customer_id_key UNIQUE (payment_id, customer_id),
    CONSTRAINT opening_balance_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
    CONSTRAINT opening_balance_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id),
    CONSTRAINT opening_balance_payments_amount_check CHECK (amount > 0::numeric)
);

-- Sales payments table: Direct payment allocation to sales (bypassing invoices)
CREATE TABLE public.sales_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sales_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    amount_allocated numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT sales_payments_pkey PRIMARY KEY (id),
    CONSTRAINT sales_payments_sales_id_payment_id_key UNIQUE (sales_id, payment_id),
    CONSTRAINT sales_payments_sales_id_fkey FOREIGN KEY (sales_id) REFERENCES public.sales(id),
    CONSTRAINT sales_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id),
    CONSTRAINT sales_payments_amount_allocated_check CHECK (amount_allocated > 0::numeric)
);

-- Product pricing history table: Price change audit trail
CREATE TABLE public.product_pricing_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    price numeric NOT NULL,
    effective_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),

    CONSTRAINT product_pricing_history_pkey PRIMARY KEY (id),
    CONSTRAINT product_pricing_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- =====================================================
-- ADDITIONAL SYSTEM TABLES
-- =====================================================

-- Invoice sales mapping table: Invoice-to-sales relationship mapping for legacy compatibility
CREATE TABLE public.invoice_sales_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT invoice_sales_mapping_pkey PRIMARY KEY (id),
    CONSTRAINT invoice_sales_mapping_invoice_id_sale_id_key UNIQUE (invoice_id, sale_id),
    CONSTRAINT invoice_sales_mapping_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice_metadata(id),
    CONSTRAINT invoice_sales_mapping_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id)
);

-- Audit trail table: System audit logging for compliance tracking
CREATE TABLE public.audit_trail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying NOT NULL,
    operation character varying NOT NULL,
    record_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audit_trail_pkey PRIMARY KEY (id)
);

-- Bulk operation logs table: Bulk operation progress and error tracking
CREATE TABLE public.bulk_operation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_type character varying NOT NULL,
    operation_subtype character varying,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    status character varying DEFAULT 'running'::character varying,
    total_items integer,
    successful_items integer DEFAULT 0,
    failed_items integer DEFAULT 0,
    error_details jsonb,
    initiated_by uuid,
    parameters jsonb,

    CONSTRAINT bulk_operation_logs_pkey PRIMARY KEY (id)
);

-- =====================================================
-- FOREIGN KEY UPDATES (for circular references)
-- =====================================================

-- Add foreign key constraint that was deferred
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_primary_invoice_id_fkey
    FOREIGN KEY (primary_invoice_id) REFERENCES public.invoice_metadata(id);

-- =====================================================
-- COMMENTS
-- =====================================================

-- Add table comments for documentation
COMMENT ON TABLE public.sales_payments IS 'Tracks payment allocations directly to sales (bypassing invoice generation)';
COMMENT ON COLUMN public.sales_payments.sales_id IS 'Reference to the sales record being paid';
COMMENT ON COLUMN public.sales_payments.payment_id IS 'Reference to the payment being allocated';
COMMENT ON COLUMN public.sales_payments.amount_allocated IS 'Amount of payment allocated to this sales record';
COMMENT ON COLUMN public.invoice_line_items.delivery_id IS 'Direct reference to delivery record for cleaner invoice-delivery relationship';

-- =====================================================
-- END OF INITIAL SCHEMA
-- =====================================================