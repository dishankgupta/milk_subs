-- =====================================================
-- 005_seed_data.sql
-- Essential Seed Data for milk_subs
-- Contains routes and products needed for basic operation
-- =====================================================

-- =====================================================
-- ESSENTIAL ROUTES
-- =====================================================

-- Insert Route 1 and Route 2 (core delivery routes)
INSERT INTO public.routes (id, name, description, personnel_name) VALUES
('8a0f4431-6601-4ba6-bd03-462c72cf8573', 'Route 1', 'Morning and evening delivery route 1', NULL),
('5f1e2a68-1b8c-4972-b5a5-17e541e140e1', 'Route 2', 'Morning and evening delivery route 2', NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- ESSENTIAL PRODUCTS
-- =====================================================

-- Insert core dairy products with proper GST rates
INSERT INTO public.products (id, name, code, current_price, gst_rate, unit, is_subscription_product) VALUES
-- Milk products (GST 0% - essential commodities)
('87dfe1e5-c440-4842-a73e-a430d899bfe5', 'Cow Milk', 'CM', 75.00, 0.00, 'liter', true),
('9284b6d2-ebeb-4197-91f1-443979b07b49', 'Buffalo Milk', 'BM', 80.00, 0.00, 'liter', true),

-- Dairy products (GST 5% for ghee, 0% for others)
('6a9edc09-3242-4d92-8ae7-22c1e6c3045a', 'A2 Cow Ghee', 'CG', 2400.00, 5.00, 'Kgs.', false),
('fcfc1b3a-556e-4a78-9489-4511a1f57c99', 'Buffalo Ghee', 'BG', 850.00, 5.00, 'Kgs.', false),
('ad6ec068-ff93-4401-94b0-6e7313fdfcfd', 'BSM Dahi', 'BSMD', 70.00, 0.00, 'Kgs.', false),
('56bc6256-80dd-4385-a92d-0c4f8bae1477', 'BSM Tak', 'BSMT', 30.00, 0.00, 'Ltrs', false),
('1fd19ea9-6372-4161-9bb3-f0b9b1fcd9e0', 'Masala Tak', 'MT', 20.00, 0.00, 'Packs', false),
('5abc1aaa-5186-48ab-b3dd-09efc9077922', 'Malai Paneer', 'MP', 480.00, 0.00, 'Kgs.', false),
('40347e4b-5af4-4067-8e8c-c79b77fcdd3b', 'Tak', 'TAK', 30.00, 0.00, 'liter', false)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    current_price = EXCLUDED.current_price,
    gst_rate = EXCLUDED.gst_rate,
    unit = EXCLUDED.unit,
    is_subscription_product = EXCLUDED.is_subscription_product,
    updated_at = now();

-- =====================================================
-- PRODUCT PRICING HISTORY
-- =====================================================

-- Insert initial pricing history for tracking
INSERT INTO public.product_pricing_history (product_id, price, effective_date)
SELECT id, current_price, CURRENT_DATE
FROM public.products
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE CUSTOMERS (Optional - for development/testing)
-- =====================================================

-- Uncomment this section if you want sample customers for development
/*
INSERT INTO public.customers (
    billing_name, contact_person, address, phone_primary,
    route_id, delivery_time, payment_method, billing_cycle_day,
    opening_balance, status
) VALUES
('Pure Dairy Development Corp', 'Rajesh Kumar', '123 Dairy Street, Milk Colony', '9876543210',
 '8a0f4431-6601-4ba6-bd03-462c72cf8573', 'Morning', 'Monthly', 15, 0.00, 'Active'),

('Fresh Milk Distributors', 'Priya Sharma', '456 Distribution Hub, Market Area', '9876543211',
 '5f1e2a68-1b8c-4972-b5a5-17e541e140e1', 'Evening', 'Monthly', 30, 500.00, 'Active'),

('Local Community Store', 'Amit Patel', '789 Community Center, Village Road', '9876543212',
 '8a0f4431-6601-4ba6-bd03-462c72cf8573', 'Morning', 'Prepaid', 1, 1000.00, 'Active')
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- SYSTEM CONFIGURATION DATA
-- =====================================================

-- Add any system configuration or lookup data here
-- For example, payment methods, delivery time slots, etc.

-- Standard delivery times
-- INSERT INTO public.delivery_time_slots (name, description) VALUES
-- ('Morning', '6:00 AM - 10:00 AM'),
-- ('Evening', '5:00 PM - 8:00 PM')
-- ON CONFLICT DO NOTHING;

-- Standard payment methods
-- INSERT INTO public.payment_methods (name, description) VALUES
-- ('Cash', 'Cash on delivery'),
-- ('QR', 'QR code payment'),
-- ('UPI', 'UPI payment'),
-- ('Bank Transfer', 'Direct bank transfer')
-- ON CONFLICT DO NOTHING;

-- =====================================================
-- DATA VALIDATION
-- =====================================================

-- Verify essential data was inserted
DO $$
DECLARE
    route_count INTEGER;
    product_count INTEGER;
BEGIN
    -- Check routes
    SELECT COUNT(*) INTO route_count FROM public.routes;
    IF route_count < 2 THEN
        RAISE EXCEPTION 'Expected at least 2 routes, found %', route_count;
    END IF;

    -- Check products
    SELECT COUNT(*) INTO product_count FROM public.products;
    IF product_count < 5 THEN
        RAISE EXCEPTION 'Expected at least 5 products, found %', product_count;
    END IF;

    RAISE NOTICE 'Seed data validation passed: % routes, % products', route_count, product_count;
END $$;

-- =====================================================
-- ADDITIONAL SEED DATA FUNCTIONS
-- =====================================================

-- Function to add sample subscription data (for development)
CREATE OR REPLACE FUNCTION public.add_sample_subscriptions()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    v_customer_id UUID;
    v_milk_product_id UUID;
BEGIN
    -- Only add sample data if there are customers
    SELECT id INTO v_customer_id FROM public.customers LIMIT 1;
    SELECT id INTO v_milk_product_id FROM public.products WHERE code = 'CM' LIMIT 1;

    IF v_customer_id IS NOT NULL AND v_milk_product_id IS NOT NULL THEN
        INSERT INTO public.base_subscriptions (
            customer_id, product_id, subscription_type,
            daily_quantity, is_active
        ) VALUES
        (v_customer_id, v_milk_product_id, 'Daily', 2.0, true)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sample subscription added for customer %', v_customer_id;
    ELSE
        RAISE NOTICE 'No customers found, skipping sample subscription creation';
    END IF;
END;
$function$;

-- Function to add sample modification data (for development)
CREATE OR REPLACE FUNCTION public.add_sample_modifications()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    v_customer_id UUID;
    v_product_id UUID;
BEGIN
    SELECT c.id, p.id INTO v_customer_id, v_product_id
    FROM public.customers c, public.products p
    WHERE p.code = 'CM'
    LIMIT 1;

    IF v_customer_id IS NOT NULL AND v_product_id IS NOT NULL THEN
        INSERT INTO public.modifications (
            customer_id, product_id, modification_type,
            start_date, end_date, quantity_change, reason, is_active
        ) VALUES
        (v_customer_id, v_product_id, 'Increase',
         CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 1.0,
         'Festival season increase', true)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sample modification added for customer %', v_customer_id;
    END IF;
END;
$function$;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- To use the sample data functions for development:
-- SELECT public.add_sample_subscriptions();
-- SELECT public.add_sample_modifications();

-- To remove sample data functions after production deployment:
-- DROP FUNCTION IF EXISTS public.add_sample_subscriptions();
-- DROP FUNCTION IF EXISTS public.add_sample_modifications();

-- =====================================================
-- PRODUCTION NOTES
-- =====================================================

-- 1. Routes and Products are essential for system operation
-- 2. Sample customer data should be removed in production
-- 3. Add real customer data through the application interface
-- 4. Monitor product pricing and update as needed
-- 5. Ensure GST rates comply with local tax regulations

-- =====================================================
-- GST COMPLIANCE NOTES
-- =====================================================

-- Current GST rates (as per Indian taxation):
-- - Milk and milk products (except ghee): 0% GST
-- - Ghee and clarified butter: 5% GST
-- - Paneer and cheese: 0% GST (if less than ₹500/kg)
-- - Value-added dairy products may have different rates

-- Update GST rates as per current tax regulations:
-- UPDATE public.products SET gst_rate = 0.00 WHERE code IN ('CM', 'BM', 'BSMD', 'MP', 'TAK');
-- UPDATE public.products SET gst_rate = 5.00 WHERE code IN ('CG', 'BG');

-- =====================================================
-- DATA INTEGRITY CHECKS
-- =====================================================

-- Verify all products have valid GST rates
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.products
        WHERE gst_rate < 0 OR gst_rate > 28
    ) THEN
        RAISE WARNING 'Some products have invalid GST rates. Please verify.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.products
        WHERE current_price <= 0
    ) THEN
        RAISE WARNING 'Some products have invalid prices. Please verify.';
    END IF;

    RAISE NOTICE 'Data integrity check completed';
END $$;

-- =====================================================
-- END OF SEED DATA
-- =====================================================

-- This seed data provides the minimum required data for the milk_subs
-- system to function. Add additional products, routes, and customers
-- as needed through the application interface.