-- =====================================================
-- 003_triggers_and_policies.sql
-- Trigger Functions, Triggers, and RLS Policies for milk_subs
-- Maintains data consistency and implements business logic
-- =====================================================

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Handle direct invoice deletion (safety net)
CREATE OR REPLACE FUNCTION public.handle_direct_invoice_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    affected_sales_id UUID;
BEGIN
    RAISE NOTICE 'Invoice % being deleted directly, reverting related sales...', OLD.id;

    -- Revert sales that were in this invoice back to Pending
    -- Use invoice_sales_mapping for precise mapping
    FOR affected_sales_id IN
        SELECT sale_id
        FROM invoice_sales_mapping
        WHERE invoice_id = OLD.id
    LOOP
        UPDATE sales
        SET
            payment_status = 'Pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = affected_sales_id
        AND payment_status IN ('Billed', 'Completed');

        RAISE NOTICE 'Reverted sale % back to Pending due to invoice deletion', affected_sales_id;
    END LOOP;

    -- Note: The existing delete_invoice_safe function is still preferred
    -- This trigger is just a safety net for direct deletions

    RETURN OLD;
END;
$function$;

-- Handle invoice payment deletion
CREATE OR REPLACE FUNCTION public.handle_invoice_payment_deletion_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Update the affected invoice's status automatically
    PERFORM update_invoice_status(OLD.invoice_id);

    RAISE NOTICE 'Invoice payment mapping deleted, updated status for invoice %', OLD.invoice_id;

    -- The maintain_unapplied_payments_from_allocation trigger will handle
    -- updating the payment's unapplied status automatically

    RETURN OLD;
END;
$function$;

-- Handle payment deletion with cascades
CREATE OR REPLACE FUNCTION public.handle_payment_deletion_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    affected_invoice_id UUID;
    affected_sales_id UUID;
BEGIN
    RAISE NOTICE 'Payment % being deleted, handling cascades...', OLD.id;

    -- 1. Revert sales that were paid via this payment back to Pending
    -- This happens BEFORE the sales_payments records are deleted by CASCADE
    FOR affected_sales_id IN
        SELECT sales_id FROM sales_payments WHERE payment_id = OLD.id
    LOOP
        UPDATE sales
        SET
            payment_status = 'Pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = affected_sales_id
        AND payment_status = 'Completed';

        RAISE NOTICE 'Reverted sale % from Completed to Pending', affected_sales_id;
    END LOOP;

    -- 2. Update invoice status for affected invoices
    -- This happens BEFORE the invoice_payments records are deleted by CASCADE
    FOR affected_invoice_id IN
        SELECT invoice_id FROM invoice_payments WHERE payment_id = OLD.id
    LOOP
        -- Call the existing update_invoice_status function
        PERFORM update_invoice_status(affected_invoice_id);
        RAISE NOTICE 'Updated status for invoice %', affected_invoice_id;
    END LOOP;

    -- Note: CASCADE constraints will automatically handle:
    -- - sales_payments deletion
    -- - invoice_payments deletion
    -- - opening_balance_payments deletion
    -- - unapplied_payments cleanup (via existing triggers)

    RETURN OLD;
END;
$function$;

-- Handle sales payment deletion
CREATE OR REPLACE FUNCTION public.handle_sales_payment_deletion_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- If sales_payment mapping is deleted, revert the sale status
    UPDATE sales
    SET
        payment_status = 'Pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.sales_id
    AND payment_status = 'Completed';

    RAISE NOTICE 'Sales payment mapping deleted, reverted sale % to Pending', OLD.sales_id;

    -- The maintain_unapplied_payments_from_allocation trigger will handle
    -- updating the payment's unapplied status automatically

    RETURN OLD;
END;
$function$;

-- Log cascade operations for audit
CREATE OR REPLACE FUNCTION public.log_cascade_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Log the cascade operation for audit purposes
    INSERT INTO audit_trail (
        table_name,
        operation,
        record_id,
        old_values,
        new_values,
        changed_by,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        'CASCADE_' || TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        current_setting('app.current_user_id', true)::uuid,
        CURRENT_TIMESTAMP
    );

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the main operation if audit logging fails
        RAISE WARNING 'Failed to log cascade operation: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Maintain unapplied payments for payment inserts/updates
CREATE OR REPLACE FUNCTION public.maintain_unapplied_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_total_allocated DECIMAL(10,2) := 0;
    v_amount_unapplied DECIMAL(10,2);
BEGIN
    -- Calculate total allocated for this payment from both tables
    SELECT
        COALESCE(ip_total.allocated, 0) + COALESCE(ob_total.allocated, 0)
    INTO v_total_allocated
    FROM (SELECT 1) dummy -- Dummy table for consistent FROM clause
    LEFT JOIN (
        SELECT SUM(amount_allocated) as allocated
        FROM invoice_payments
        WHERE payment_id = NEW.id
    ) ip_total ON TRUE
    LEFT JOIN (
        SELECT SUM(amount) as allocated
        FROM opening_balance_payments
        WHERE payment_id = NEW.id
    ) ob_total ON TRUE;

    v_amount_unapplied := NEW.amount - v_total_allocated;

    -- Update or remove unapplied payment record
    IF v_amount_unapplied > 0 THEN
        INSERT INTO unapplied_payments (payment_id, customer_id, amount_unapplied)
        VALUES (NEW.id, NEW.customer_id, v_amount_unapplied)
        ON CONFLICT (payment_id)
        DO UPDATE SET
            amount_unapplied = EXCLUDED.amount_unapplied,
            updated_at = CURRENT_TIMESTAMP;
    ELSE
        DELETE FROM unapplied_payments WHERE payment_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;

-- Maintain unapplied payments from allocation changes
CREATE OR REPLACE FUNCTION public.maintain_unapplied_payments_from_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_payment_id UUID;
    v_payment_record payments%ROWTYPE;
    v_total_allocated DECIMAL(10,2) := 0;
    v_amount_unapplied DECIMAL(10,2);
BEGIN
    -- Get payment ID from the changed allocation record
    IF TG_OP = 'DELETE' THEN
        v_payment_id := OLD.payment_id;
    ELSE
        v_payment_id := NEW.payment_id;
    END IF;

    -- Get payment details
    SELECT * INTO v_payment_record
    FROM payments
    WHERE id = v_payment_id;

    IF NOT FOUND THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate total allocated for this payment (INCLUDING SALES PAYMENTS)
    SELECT
        COALESCE(ip_total.allocated, 0) +
        COALESCE(ob_total.allocated, 0) +
        COALESCE(sp_total.allocated, 0)  -- Include sales payments
    INTO v_total_allocated
    FROM (SELECT 1) dummy
    LEFT JOIN (
        SELECT SUM(amount_allocated) as allocated
        FROM invoice_payments
        WHERE payment_id = v_payment_id
    ) ip_total ON TRUE
    LEFT JOIN (
        SELECT SUM(amount) as allocated
        FROM opening_balance_payments
        WHERE payment_id = v_payment_id
    ) ob_total ON TRUE
    LEFT JOIN (
        SELECT SUM(amount_allocated) as allocated  -- Sales payments
        FROM sales_payments
        WHERE payment_id = v_payment_id
    ) sp_total ON TRUE;

    v_amount_unapplied := v_payment_record.amount - v_total_allocated;

    -- Update or remove unapplied payment record
    IF v_amount_unapplied > 0 THEN
        INSERT INTO unapplied_payments (payment_id, customer_id, amount_unapplied)
        VALUES (v_payment_id, v_payment_record.customer_id, v_amount_unapplied)
        ON CONFLICT (payment_id)
        DO UPDATE SET
            amount_unapplied = EXCLUDED.amount_unapplied,
            updated_at = CURRENT_TIMESTAMP;
    ELSE
        DELETE FROM unapplied_payments WHERE payment_id = v_payment_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Invoice metadata triggers
DROP TRIGGER IF EXISTS invoice_deletion_cascade ON public.invoice_metadata;
CREATE TRIGGER invoice_deletion_cascade
    BEFORE DELETE ON public.invoice_metadata
    FOR EACH ROW EXECUTE FUNCTION handle_direct_invoice_deletion();

DROP TRIGGER IF EXISTS log_invoice_cascades ON public.invoice_metadata;
CREATE TRIGGER log_invoice_cascades
    AFTER DELETE ON public.invoice_metadata
    FOR EACH ROW EXECUTE FUNCTION log_cascade_operations();

-- Invoice payments triggers
DROP TRIGGER IF EXISTS invoice_payment_deletion_cascade ON public.invoice_payments;
CREATE TRIGGER invoice_payment_deletion_cascade
    AFTER DELETE ON public.invoice_payments
    FOR EACH ROW EXECUTE FUNCTION handle_invoice_payment_deletion_complete();

DROP TRIGGER IF EXISTS invoice_payments_unapplied_sync ON public.invoice_payments;
CREATE TRIGGER invoice_payments_unapplied_sync
    AFTER INSERT OR DELETE OR UPDATE ON public.invoice_payments
    FOR EACH ROW EXECUTE FUNCTION maintain_unapplied_payments_from_allocation();

-- Opening balance payments triggers
DROP TRIGGER IF EXISTS opening_balance_payments_unapplied_sync ON public.opening_balance_payments;
CREATE TRIGGER opening_balance_payments_unapplied_sync
    AFTER INSERT OR DELETE OR UPDATE ON public.opening_balance_payments
    FOR EACH ROW EXECUTE FUNCTION maintain_unapplied_payments_from_allocation();

-- Payments triggers
DROP TRIGGER IF EXISTS log_payment_cascades ON public.payments;
CREATE TRIGGER log_payment_cascades
    AFTER DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION log_cascade_operations();

DROP TRIGGER IF EXISTS payment_deletion_cascade ON public.payments;
CREATE TRIGGER payment_deletion_cascade
    BEFORE DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION handle_payment_deletion_complete();

DROP TRIGGER IF EXISTS payments_unapplied_sync_insert ON public.payments;
CREATE TRIGGER payments_unapplied_sync_insert
    AFTER INSERT ON public.payments
    FOR EACH ROW EXECUTE FUNCTION maintain_unapplied_payments();

DROP TRIGGER IF EXISTS payments_unapplied_sync_update ON public.payments;
CREATE TRIGGER payments_unapplied_sync_update
    AFTER UPDATE ON public.payments
    FOR EACH ROW WHEN ((old.amount IS DISTINCT FROM new.amount))
    EXECUTE FUNCTION maintain_unapplied_payments();

-- Sales triggers
DROP TRIGGER IF EXISTS log_sales_cascades ON public.sales;
CREATE TRIGGER log_sales_cascades
    AFTER UPDATE ON public.sales
    FOR EACH ROW WHEN ((old.payment_status IS DISTINCT FROM new.payment_status))
    EXECUTE FUNCTION log_cascade_operations();

-- Sales payments triggers
DROP TRIGGER IF EXISTS sales_payment_deletion_cascade ON public.sales_payments;
CREATE TRIGGER sales_payment_deletion_cascade
    AFTER DELETE ON public.sales_payments
    FOR EACH ROW EXECUTE FUNCTION handle_sales_payment_deletion_complete();

DROP TRIGGER IF EXISTS sales_payments_unapplied_sync ON public.sales_payments;
CREATE TRIGGER sales_payments_unapplied_sync
    AFTER INSERT OR DELETE OR UPDATE ON public.sales_payments
    FOR EACH ROW EXECUTE FUNCTION maintain_unapplied_payments_from_allocation();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_balance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_payments ENABLE ROW LEVEL SECURITY;

-- Note: RLS is already disabled on invoice_line_items, invoice_payments,
-- unapplied_payments, invoice_sales_mapping, audit_trail, and bulk_operation_logs
-- as per the current database state

-- =====================================================
-- BASIC RLS POLICIES (Allow all operations for authenticated users)
-- Note: These are basic policies - you may want to implement more
-- granular permissions based on user roles in production
-- =====================================================

-- Products policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.products;
CREATE POLICY "Enable all operations for authenticated users" ON public.products
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Routes policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.routes;
CREATE POLICY "Enable all operations for authenticated users" ON public.routes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customers policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.customers;
CREATE POLICY "Enable all operations for authenticated users" ON public.customers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Base subscriptions policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.base_subscriptions;
CREATE POLICY "Enable all operations for authenticated users" ON public.base_subscriptions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Modifications policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.modifications;
CREATE POLICY "Enable all operations for authenticated users" ON public.modifications
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Daily orders policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.daily_orders;
CREATE POLICY "Enable all operations for authenticated users" ON public.daily_orders
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Deliveries policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.deliveries;
CREATE POLICY "Enable all operations for authenticated users" ON public.deliveries
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payments policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.payments;
CREATE POLICY "Enable all operations for authenticated users" ON public.payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sales policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.sales;
CREATE POLICY "Enable all operations for authenticated users" ON public.sales
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoice metadata policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.invoice_metadata;
CREATE POLICY "Enable all operations for authenticated users" ON public.invoice_metadata
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Product pricing history policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.product_pricing_history;
CREATE POLICY "Enable all operations for authenticated users" ON public.product_pricing_history
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Opening balance payments policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.opening_balance_payments;
CREATE POLICY "Enable all operations for authenticated users" ON public.opening_balance_payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sales payments policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.sales_payments;
CREATE POLICY "Enable all operations for authenticated users" ON public.sales_payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- ADVANCED RLS POLICIES (Examples for future implementation)
-- =====================================================

-- Example: Customer data access by route (commented out for now)
/*
DROP POLICY IF EXISTS "Route-based customer access" ON public.customers;
CREATE POLICY "Route-based customer access" ON public.customers
    FOR SELECT TO authenticated
    USING (
        route_id IN (
            SELECT r.id FROM routes r
            WHERE r.personnel_name = current_setting('app.current_user_name', true)
        )
    );
*/

-- Example: Sales access by date range (commented out for now)
/*
DROP POLICY IF EXISTS "Sales access by date" ON public.sales;
CREATE POLICY "Sales access by date" ON public.sales
    FOR SELECT TO authenticated
    USING (
        sale_date >= (CURRENT_DATE - INTERVAL '30 days')
        OR current_setting('app.user_role', true) = 'admin'
    );
*/

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant access to all sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- END OF TRIGGERS AND POLICIES
-- =====================================================