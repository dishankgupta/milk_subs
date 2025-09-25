-- =====================================================
-- 002_functions_and_procedures.sql
-- All Custom Functions and Stored Procedures for milk_subs
-- Contains 25+ business logic functions for dairy management
-- =====================================================

-- =====================================================
-- OUTSTANDING CALCULATION FUNCTIONS
-- =====================================================

-- Calculate customer outstanding balance (core business function)
CREATE OR REPLACE FUNCTION public.calculate_customer_outstanding(customer_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
DECLARE
    customer_opening_balance DECIMAL(10,2) DEFAULT 0;
    opening_balance_payments_total DECIMAL(10,2) DEFAULT 0;
    invoice_outstanding DECIMAL(10,2) DEFAULT 0;
    total_outstanding DECIMAL(10,2) DEFAULT 0;
BEGIN
    -- Get customer's original opening balance (immutable historical data)
    SELECT COALESCE(opening_balance, 0)
    INTO customer_opening_balance
    FROM customers
    WHERE id = customer_uuid;

    -- Get total amount allocated to opening balance (from new table)
    SELECT COALESCE(SUM(amount), 0)
    INTO opening_balance_payments_total
    FROM opening_balance_payments
    WHERE customer_id = customer_uuid;

    -- Get outstanding amount from unpaid/partially paid invoices
    -- FIXED: Include 'sent' status as unpaid
    SELECT COALESCE(SUM(total_amount - amount_paid), 0)
    INTO invoice_outstanding
    FROM invoice_metadata
    WHERE customer_id = customer_uuid
    AND invoice_status IN ('pending', 'partially_paid', 'overdue', 'sent');

    -- Calculate total: opening_balance - opening_balance_payments + invoice_outstanding
    total_outstanding = (customer_opening_balance - opening_balance_payments_total) + invoice_outstanding;

    -- Ensure non-negative result
    IF total_outstanding < 0 THEN
        total_outstanding = 0;
    END IF;

    RETURN total_outstanding;
END;
$function$;

-- Calculate total outstanding (legacy compatibility)
CREATE OR REPLACE FUNCTION public.calculate_total_outstanding(customer_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    opening_bal DECIMAL(10,2);
    current_outstanding DECIMAL(10,2);
BEGIN
    SELECT opening_balance, outstanding_amount
    INTO opening_bal, current_outstanding
    FROM customers
    WHERE id = customer_uuid;

    RETURN COALESCE(opening_bal, 0) + COALESCE(current_outstanding, 0);
END;
$function$;

-- Get comprehensive outstanding data for all customers
CREATE OR REPLACE FUNCTION public.get_all_customers_outstanding_data()
RETURNS TABLE(customer_id uuid, billing_name text, contact_person text, phone_primary text, address text, route_name text, opening_balance numeric, opening_balance_payments_total numeric, effective_opening_balance numeric, invoice_outstanding numeric, total_outstanding numeric, unpaid_invoice_count bigint, oldest_unpaid_date date)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT
    c.id as customer_id,
    c.billing_name,
    c.contact_person,
    c.phone_primary,
    c.address,
    r.name as route_name,
    c.opening_balance,
    -- Opening balance payments total
    COALESCE(obp.opening_balance_payments, 0) as opening_balance_payments_total,
    -- Effective opening balance (opening balance minus opening balance payments)
    (c.opening_balance - COALESCE(obp.opening_balance_payments, 0)) as effective_opening_balance,
    -- Invoice outstanding amount (using exact same logic as original view)
    COALESCE(im.invoice_outstanding, 0) as invoice_outstanding,
    -- Total outstanding (effective opening balance + invoice outstanding)
    (c.opening_balance - COALESCE(obp.opening_balance_payments, 0)) + COALESCE(im.invoice_outstanding, 0) as total_outstanding,
    -- Count of unpaid invoices
    COALESCE(im.unpaid_invoice_count, 0) as unpaid_invoice_count,
    -- Oldest unpaid invoice date
    im.oldest_unpaid_date
  FROM
    customers c
    LEFT JOIN routes r ON c.route_id = r.id
    LEFT JOIN (
      -- Sum of opening balance payments per customer
      SELECT
        customer_id,
        SUM(amount) as opening_balance_payments
      FROM opening_balance_payments
      GROUP BY customer_id
    ) obp ON c.id = obp.customer_id
    LEFT JOIN (
      -- Invoice outstanding calculation using EXACT same logic as original view
      SELECT
        customer_id,
        SUM(total_amount - amount_paid) as invoice_outstanding,
        COUNT(*) as unpaid_invoice_count,
        MIN(invoice_date) as oldest_unpaid_date
      FROM invoice_metadata
      WHERE invoice_status IN ('pending', 'partially_paid', 'overdue', 'sent')
      GROUP BY customer_id
    ) im ON c.id = im.customer_id
  ORDER BY c.billing_name;
$function$;

-- Get customers with net credit balance
CREATE OR REPLACE FUNCTION public.get_customers_with_net_credit()
RETURNS TABLE(customer_id uuid)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id as customer_id
  FROM customers c
  WHERE (
    -- Calculate available credit (sum of unapplied payments)
    COALESCE((
      SELECT SUM(up.amount_unapplied)
      FROM unapplied_payments up
      WHERE up.customer_id = c.id
    ), 0) >
    -- Calculate total outstanding (opening balance + invoice outstanding)
    COALESCE(c.opening_balance, 0) + COALESCE((
      SELECT SUM(im.amount_outstanding)
      FROM invoice_metadata im
      WHERE im.customer_id = c.id
      AND im.invoice_status IN ('pending', 'partially_paid', 'overdue', 'sent')
    ), 0)
  );
END;
$function$;

-- =====================================================
-- ATOMIC PAYMENT ALLOCATION FUNCTIONS
-- =====================================================

-- Atomic payment allocation to invoices
CREATE OR REPLACE FUNCTION public.allocate_payment_atomic(p_payment_id uuid, p_allocations jsonb, p_validate_amounts boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_payment payments%ROWTYPE;
    v_total_allocated DECIMAL(10,2) := 0;
    v_allocation JSONB;
    v_invoice_id UUID;
    v_amount DECIMAL(10,2);
    v_existing_allocated DECIMAL(10,2) := 0;
    v_unapplied_amount DECIMAL(10,2);
BEGIN
    -- 1. Lock and validate payment exists
    SELECT * INTO v_payment
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN '{"success": false, "error": "Payment not found"}'::JSONB;
    END IF;

    -- 2. Calculate existing allocations from both tables
    SELECT COALESCE(SUM(amount_allocated), 0) INTO v_existing_allocated
    FROM invoice_payments
    WHERE payment_id = p_payment_id;

    SELECT COALESCE(v_existing_allocated + SUM(amount), v_existing_allocated) INTO v_existing_allocated
    FROM opening_balance_payments
    WHERE payment_id = p_payment_id;

    -- 3. Validate total allocations don't exceed payment amount
    FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_total_allocated := v_total_allocated + (v_allocation->>'amount')::DECIMAL;
    END LOOP;

    IF p_validate_amounts AND (v_existing_allocated + v_total_allocated) > v_payment.amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Total allocations (₹%s) exceed payment amount (₹%s). Existing: ₹%s, New: ₹%s',
                          v_existing_allocated + v_total_allocated, v_payment.amount,
                          v_existing_allocated, v_total_allocated)
        );
    END IF;

    -- 4. Process all allocations atomically
    FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_invoice_id := (v_allocation->>'invoiceId')::UUID;
        v_amount := (v_allocation->>'amount')::DECIMAL;

        -- Validate invoice exists
        IF NOT EXISTS (SELECT 1 FROM invoice_metadata WHERE id = v_invoice_id) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Invoice %s not found', v_invoice_id)
            );
        END IF;

        -- Insert invoice payment record
        INSERT INTO invoice_payments (payment_id, invoice_id, amount_allocated, allocation_date)
        VALUES (p_payment_id, v_invoice_id, v_amount, CURRENT_TIMESTAMP);

        -- Update invoice status (graceful fallback)
        BEGIN
            PERFORM update_invoice_status_with_sales_completion(v_invoice_id);
        EXCEPTION
            WHEN OTHERS THEN
                BEGIN
                    PERFORM update_invoice_status(v_invoice_id);
                EXCEPTION
                    WHEN OTHERS THEN NULL;
                END;
        END;
    END LOOP;

    -- 5. Update payment allocation status
    v_total_allocated := v_existing_allocated + v_total_allocated;
    UPDATE payments
    SET allocation_status = CASE
        WHEN v_total_allocated >= amount THEN 'fully_applied'
        WHEN v_total_allocated > 0 THEN 'partially_applied'
        ELSE 'unapplied'
    END
    WHERE id = p_payment_id;

    -- 6. Handle unapplied payments table (manual INSERT/UPDATE)
    v_unapplied_amount := v_payment.amount - v_total_allocated;

    -- Remove existing unapplied payment record first
    DELETE FROM unapplied_payments WHERE payment_id = p_payment_id;

    -- Insert new record if there's unapplied amount
    IF v_unapplied_amount > 0 THEN
        INSERT INTO unapplied_payments (payment_id, customer_id, amount_unapplied)
        VALUES (p_payment_id, v_payment.customer_id, v_unapplied_amount);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'allocated_amount', v_total_allocated - v_existing_allocated,
        'total_allocated', v_total_allocated,
        'payment_amount', v_payment.amount,
        'unapplied_amount', v_unapplied_amount
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', format('Error in allocate_payment_atomic: %s', SQLERRM)
        );
END;
$function$;

-- Atomic opening balance allocation
CREATE OR REPLACE FUNCTION public.allocate_opening_balance_atomic(p_payment_id uuid, p_customer_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_customer customers%ROWTYPE;
    v_payment payments%ROWTYPE;
    v_remaining_balance DECIMAL(10,2);
    v_amount_to_allocate DECIMAL(10,2);
    v_existing_invoice_allocations DECIMAL(10,2) := 0;
    v_existing_opening_allocations DECIMAL(10,2) := 0;
    v_total_existing_allocations DECIMAL(10,2);
    v_payment_fully_applied BOOLEAN := FALSE;
BEGIN
    -- Validate input amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Allocation amount must be positive',
            'code', 'INVALID_AMOUNT'
        );
    END IF;

    -- 1. Lock customer row to prevent concurrent opening balance changes
    SELECT * INTO v_customer
    FROM customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Customer not found',
            'code', 'CUSTOMER_NOT_FOUND'
        );
    END IF;

    -- 2. Lock payment row to prevent concurrent allocations
    SELECT * INTO v_payment
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment not found',
            'code', 'PAYMENT_NOT_FOUND'
        );
    END IF;

    -- 3. Calculate remaining opening balance using calculate_customer_outstanding
    v_remaining_balance := v_customer.opening_balance - COALESCE((
        SELECT SUM(amount)
        FROM opening_balance_payments
        WHERE customer_id = p_customer_id
    ), 0);

    IF v_remaining_balance <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No remaining opening balance to allocate',
            'code', 'NO_OPENING_BALANCE',
            'remaining_balance', v_remaining_balance
        );
    END IF;

    -- 4. Get existing payment allocations
    SELECT COALESCE(SUM(amount_allocated), 0) INTO v_existing_invoice_allocations
    FROM invoice_payments
    WHERE payment_id = p_payment_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_existing_opening_allocations
    FROM opening_balance_payments
    WHERE payment_id = p_payment_id;

    v_total_existing_allocations := v_existing_invoice_allocations + v_existing_opening_allocations;

    -- 5. Check if payment has remaining capacity
    IF v_total_existing_allocations >= v_payment.amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment is already fully allocated',
            'code', 'PAYMENT_FULLY_ALLOCATED',
            'payment_amount', v_payment.amount,
            'existing_allocations', v_total_existing_allocations
        );
    END IF;

    -- 6. Determine allocation amount (minimum of requested, available balance, and payment capacity)
    v_amount_to_allocate := LEAST(
        p_amount,
        v_remaining_balance,
        v_payment.amount - v_total_existing_allocations
    );

    -- 7. Create opening balance allocation
    INSERT INTO opening_balance_payments (
        payment_id,
        customer_id,
        amount,
        allocated_at
    )
    VALUES (
        p_payment_id,
        p_customer_id,
        v_amount_to_allocate,
        CURRENT_TIMESTAMP
    );

    -- 8. Update payment allocation status
    v_payment_fully_applied := (v_total_existing_allocations + v_amount_to_allocate) >= v_payment.amount;

    UPDATE payments
    SET allocation_status = CASE
        WHEN v_payment_fully_applied THEN 'fully_applied'
        ELSE 'partially_applied'
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = p_payment_id;

    -- 9. Return success result
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'customer_id', p_customer_id,
        'allocated_amount', v_amount_to_allocate,
        'remaining_opening_balance', v_remaining_balance - v_amount_to_allocate,
        'payment_status', CASE
            WHEN v_payment_fully_applied THEN 'fully_applied'
            ELSE 'partially_applied'
        END,
        'total_allocated', v_total_existing_allocations + v_amount_to_allocate,
        'payment_amount', v_payment.amount,
        'existing_invoice_allocations', v_existing_invoice_allocations,
        'existing_opening_allocations', v_existing_opening_allocations + v_amount_to_allocate
    );

EXCEPTION
    WHEN OTHERS THEN
        -- All changes automatically rolled back
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'DATABASE_ERROR',
            'sqlstate', SQLSTATE
        );
END;
$function$;

-- Rollback partial allocation
CREATE OR REPLACE FUNCTION public.rollback_partial_allocation(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_affected_invoices UUID[];
    v_payment payments%ROWTYPE;
    v_removed_allocations DECIMAL(10,2) := 0;
BEGIN
    -- 1. Validate payment exists
    SELECT * INTO v_payment
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN '{"success": false, "error": "Payment not found"}'::JSONB;
    END IF;

    -- 2. Collect affected invoices and sum removed allocations before deletion
    SELECT
        array_agg(invoice_id),
        COALESCE(SUM(amount_allocated), 0)
    INTO v_affected_invoices, v_removed_allocations
    FROM invoice_payments
    WHERE payment_id = p_payment_id;

    -- 3. Remove payment allocations
    DELETE FROM invoice_payments WHERE payment_id = p_payment_id;

    -- 4. Remove opening balance allocations if any
    DELETE FROM opening_balance_payments WHERE payment_id = p_payment_id;

    -- 5. Reset payment status
    UPDATE payments
    SET allocation_status = 'unapplied'
    WHERE id = p_payment_id;

    -- 6. Remove from unapplied payments (will be re-added by normal flow if needed)
    DELETE FROM unapplied_payments WHERE payment_id = p_payment_id;

    -- 7. Add back to unapplied payments if payment has amount
    IF v_payment.amount > 0 THEN
        INSERT INTO unapplied_payments (payment_id, customer_id, amount_unapplied)
        VALUES (p_payment_id, v_payment.customer_id, v_payment.amount);
    END IF;

    -- 8. Recalculate affected invoice statuses
    IF array_length(v_affected_invoices, 1) > 0 THEN
        FOR i IN 1..array_length(v_affected_invoices, 1) LOOP
            BEGIN
                PERFORM update_invoice_status_with_sales_completion(v_affected_invoices[i]);
            EXCEPTION
                WHEN OTHERS THEN
                    -- Fallback to standard update
                    PERFORM update_invoice_status(v_affected_invoices[i]);
            END;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'affected_invoices', COALESCE(array_length(v_affected_invoices, 1), 0),
        'removed_amount', v_removed_allocations,
        'payment_reset_to_unapplied', true
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', format('Error in rollback_partial_allocation: %s', SQLERRM)
        );
END;
$function$;

-- =====================================================
-- INVOICE STATUS & MANAGEMENT FUNCTIONS
-- =====================================================

-- Update invoice status (core invoice function)
CREATE OR REPLACE FUNCTION public.update_invoice_status(invoice_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    invoice_total DECIMAL(10,2);
    paid_amount DECIMAL(10,2);
    outstanding_amount DECIMAL(10,2);
    new_status VARCHAR(20);
BEGIN
    -- Get invoice total
    SELECT i.total_amount INTO invoice_total
    FROM invoice_metadata i
    WHERE i.id = invoice_uuid;

    -- Get sum of payments allocated to this invoice
    SELECT COALESCE(SUM(ip.amount_allocated), 0)
    INTO paid_amount
    FROM invoice_payments ip
    WHERE ip.invoice_id = invoice_uuid;

    outstanding_amount := invoice_total - paid_amount;

    -- Determine status
    IF outstanding_amount <= 0 THEN
        new_status := 'paid';
    ELSIF paid_amount > 0 THEN
        new_status := 'partially_paid';
    ELSIF (SELECT i.due_date FROM invoice_metadata i WHERE i.id = invoice_uuid) < CURRENT_DATE THEN
        new_status := 'overdue';
    ELSE
        new_status := 'sent';
    END IF;

    -- Update invoice
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
$function$;

-- Update invoice status with sales completion
CREATE OR REPLACE FUNCTION public.update_invoice_status_with_sales_completion(p_invoice_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_old_status TEXT;
    v_new_status TEXT;
    v_updated_sales_count INTEGER := 0;
    v_result JSON;
BEGIN
    -- Get current invoice status before update
    SELECT invoice_status INTO v_old_status
    FROM invoice_metadata
    WHERE id = p_invoice_id;

    -- Call existing update_invoice_status function to recalculate status
    PERFORM update_invoice_status(p_invoice_id);

    -- Get new invoice status after update
    SELECT invoice_status INTO v_new_status
    FROM invoice_metadata
    WHERE id = p_invoice_id;

    -- FORWARD FLOW: If invoice became 'paid', complete related sales
    IF v_new_status = 'paid' AND v_old_status != 'paid' THEN
        UPDATE sales
        SET
            payment_status = 'Completed',
            updated_at = NOW()
        WHERE id IN (
            SELECT ili.sale_id
            FROM invoice_line_items ili
            WHERE ili.invoice_id = p_invoice_id
              AND ili.sale_id IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM sales s
                WHERE s.id = ili.sale_id
                  AND s.payment_status = 'Billed'
                  AND s.sale_type = 'Credit'
              )
        );

        GET DIAGNOSTICS v_updated_sales_count = ROW_COUNT;

    -- REVERSE FLOW: If invoice was 'paid' but now isn't, revert sales back to 'Billed'
    ELSIF v_old_status = 'paid' AND v_new_status != 'paid' THEN
        UPDATE sales
        SET
            payment_status = 'Billed',
            updated_at = NOW()
        WHERE id IN (
            SELECT ili.sale_id
            FROM invoice_line_items ili
            WHERE ili.invoice_id = p_invoice_id
              AND ili.sale_id IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM sales s
                WHERE s.id = ili.sale_id
                  AND s.payment_status = 'Completed'
                  AND s.sale_type = 'Credit'
              )
        );

        GET DIAGNOSTICS v_updated_sales_count = ROW_COUNT;
    END IF;

    -- Return comprehensive result
    v_result := json_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'old_status', v_old_status,
        'new_status', v_new_status,
        'updated_sales_count', v_updated_sales_count,
        'timestamp', NOW()::text
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'invoice_id', p_invoice_id,
            'timestamp', NOW()::text
        );
END;
$function$;

-- Process invoice payment atomic
CREATE OR REPLACE FUNCTION public.process_invoice_payment_atomic(p_invoice_id uuid, p_new_status text DEFAULT 'Paid'::text)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_updated_sales_count INTEGER;
  v_result JSON;
BEGIN
  -- Validate input
  IF p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Invoice ID cannot be null';
  END IF;

  -- Update invoice status
  UPDATE invoice_metadata
  SET
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;

  -- Update related sales to completed (only if invoice becomes 'Paid')
  IF p_new_status = 'Paid' THEN
    UPDATE sales
    SET
      payment_status = 'Completed',
      updated_at = NOW()
    WHERE id IN (
      SELECT ili.sale_id
      FROM invoice_line_items ili
      WHERE ili.invoice_id = p_invoice_id
        AND ili.sale_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM sales s
          WHERE s.id = ili.sale_id
            AND s.payment_status = 'Billed'
        )
    );

    GET DIAGNOSTICS v_updated_sales_count = ROW_COUNT;
  ELSE
    v_updated_sales_count := 0;
  END IF;

  -- Return success result with details
  SELECT json_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'new_status', p_new_status,
    'updated_sales_count', v_updated_sales_count,
    'timestamp', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- =====================================================
-- INVOICE DELETION & RECOVERY FUNCTIONS
-- =====================================================

-- Safe invoice deletion with sales reversion
CREATE OR REPLACE FUNCTION public.delete_invoice_safe(p_invoice_id uuid, p_permanent boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_invoice invoice_metadata%ROWTYPE;
    v_affected_sales UUID[];
    v_payment_count INTEGER;
    v_reverted_count INTEGER := 0;
    v_audit_log_id UUID;
BEGIN
    -- 1. Validate invoice exists and get details
    SELECT * INTO v_invoice
    FROM invoice_metadata
    WHERE id = p_invoice_id AND COALESCE(deleted_at, 'infinity'::timestamp) = 'infinity'::timestamp;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invoice not found or already deleted',
            'code', 'INVOICE_NOT_FOUND'
        );
    END IF;

    -- 2. Check for existing payments - prevent deletion if paid
    SELECT COUNT(*) INTO v_payment_count
    FROM invoice_payments
    WHERE invoice_id = p_invoice_id;

    IF v_payment_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot delete invoice with payments. Remove payments first.',
            'code', 'INVOICE_HAS_PAYMENTS',
            'payment_count', v_payment_count
        );
    END IF;

    -- 3. Get affected sales using precise mapping
    SELECT array_agg(sale_id) INTO v_affected_sales
    FROM invoice_sales_mapping
    WHERE invoice_id = p_invoice_id;

    -- 4. Perform deletion (soft or permanent)
    IF p_permanent THEN
        -- Permanent deletion - remove mapping first due to FK constraints
        DELETE FROM invoice_sales_mapping WHERE invoice_id = p_invoice_id;
        DELETE FROM invoice_line_items WHERE invoice_id = p_invoice_id;
        DELETE FROM invoice_metadata WHERE id = p_invoice_id;
    ELSE
        -- Soft delete
        UPDATE invoice_metadata
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_invoice_id;
    END IF;

    -- 5. Revert only the exact sales that were in this invoice
    IF v_affected_sales IS NOT NULL AND array_length(v_affected_sales, 1) > 0 THEN
        UPDATE sales
        SET payment_status = 'Pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(v_affected_sales)
        AND payment_status IN ('Billed', 'Completed');

        GET DIAGNOSTICS v_reverted_count = ROW_COUNT;
    END IF;

    -- 6. Return success result with detailed information
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'deletion_type', CASE WHEN p_permanent THEN 'permanent' ELSE 'soft' END,
        'soft_delete', NOT p_permanent,
        'reverted_sales', COALESCE(v_reverted_count, 0),
        'affected_sales_ids', COALESCE(v_affected_sales, ARRAY[]::UUID[]),
        'deleted_at', CASE WHEN NOT p_permanent THEN CURRENT_TIMESTAMP ELSE NULL END,
        'can_be_recovered', NOT p_permanent
    );

EXCEPTION
    WHEN OTHERS THEN
        -- All changes automatically rolled back
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'DATABASE_ERROR',
            'sqlstate', SQLSTATE
        );
END;
$function$;

-- Legacy delete invoice function (for compatibility)
CREATE OR REPLACE FUNCTION public.delete_invoice_and_revert_sales(p_invoice_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_reverted_sales_count INTEGER;
  v_result JSON;
BEGIN
  -- Validate input
  IF p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Invoice ID cannot be null';
  END IF;

  -- Revert sales back to 'Pending' status
  UPDATE sales
  SET
    payment_status = 'Pending',
    updated_at = NOW()
  WHERE id IN (
    SELECT ili.sale_id
    FROM invoice_line_items ili
    WHERE ili.invoice_id = p_invoice_id
      AND ili.sale_id IS NOT NULL
  );

  GET DIAGNOSTICS v_reverted_sales_count = ROW_COUNT;

  -- Delete the invoice (CASCADE will handle line items)
  DELETE FROM invoice_metadata WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;

  -- Return success result
  SELECT json_build_object(
    'success', true,
    'deleted_invoice_id', p_invoice_id,
    'reverted_sales_count', v_reverted_sales_count,
    'timestamp', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Recover soft-deleted invoice
CREATE OR REPLACE FUNCTION public.recover_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_invoice invoice_metadata%ROWTYPE;
    v_affected_sales UUID[];
    v_restored_count INTEGER := 0;
BEGIN
    -- 1. Find soft-deleted invoice
    SELECT * INTO v_invoice
    FROM invoice_metadata
    WHERE id = p_invoice_id AND deleted_at IS NOT NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invoice not found or not soft-deleted',
            'code', 'INVOICE_NOT_SOFT_DELETED'
        );
    END IF;

    -- 2. Recover invoice
    UPDATE invoice_metadata
    SET deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_invoice_id;

    -- 3. Get mapped sales and restore their status
    SELECT array_agg(sale_id) INTO v_affected_sales
    FROM invoice_sales_mapping
    WHERE invoice_id = p_invoice_id;

    IF v_affected_sales IS NOT NULL AND array_length(v_affected_sales, 1) > 0 THEN
        UPDATE sales
        SET payment_status = 'Billed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(v_affected_sales)
        AND payment_status = 'Pending';

        GET DIAGNOSTICS v_restored_count = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'recovered_at', CURRENT_TIMESTAMP,
        'restored_sales', v_restored_count
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$;

-- =====================================================
-- BULK OPERATION FUNCTIONS
-- =====================================================

-- Generate bulk invoices atomically
CREATE OR REPLACE FUNCTION public.generate_bulk_invoices_atomic(p_period_start date, p_period_end date, p_customer_ids uuid[], p_validate_existing boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_customer_id UUID;
    v_customer_name TEXT;
    v_existing_invoice RECORD;
    v_existing_customers TEXT[] := '{}';
    v_successful_count INTEGER := 0;
    v_errors TEXT[] := '{}';
    v_invoice_numbers TEXT[] := '{}';
    v_invoice_data RECORD;
    v_invoice_metadata_id UUID;
    v_result JSONB;
BEGIN
    -- Start transaction (automatic in function)

    -- 1. Validate for existing invoices if requested
    IF p_validate_existing THEN
        FOR v_customer_id IN SELECT unnest(p_customer_ids) LOOP
            -- Check for existing invoice
            SELECT im.invoice_number, c.billing_name INTO v_existing_invoice
            FROM invoice_metadata im
            JOIN customers c ON c.id = im.customer_id
            WHERE im.customer_id = v_customer_id
            AND im.period_start = p_period_start
            AND im.period_end = p_period_end
            AND im.deleted_at IS NULL
            LIMIT 1;

            IF FOUND THEN
                v_existing_customers := v_existing_customers ||
                    (v_existing_invoice.billing_name || ' (Invoice: ' || v_existing_invoice.invoice_number || ')');
            END IF;
        END LOOP;

        -- Return early if existing invoices found
        IF array_length(v_existing_customers, 1) > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Existing invoices found for customers: ' || array_to_string(v_existing_customers, ', '),
                'existing_customers', v_existing_customers,
                'successful_count', 0,
                'errors', ARRAY['Bulk operation cancelled due to existing invoices'],
                'invoice_numbers', ARRAY[]::TEXT[]
            );
        END IF;
    END IF;

    -- 2. Process each customer atomically
    FOR v_customer_id IN SELECT unnest(p_customer_ids) LOOP
        BEGIN
            -- Get customer name for error reporting
            SELECT billing_name INTO v_customer_name
            FROM customers
            WHERE id = v_customer_id;

            IF NOT FOUND THEN
                v_errors := v_errors || ('Customer not found: ' || v_customer_id::TEXT);
                CONTINUE;
            END IF;

            -- Generate invoice number
            SELECT
                CASE
                    WHEN EXTRACT(MONTH FROM p_period_start) >= 4 THEN
                        EXTRACT(YEAR FROM p_period_start)::TEXT || '-' || (EXTRACT(YEAR FROM p_period_start) + 1)::TEXT
                    ELSE
                        (EXTRACT(YEAR FROM p_period_start) - 1)::TEXT || '-' || EXTRACT(YEAR FROM p_period_start)::TEXT
                END as financial_year,
                COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_number
            INTO v_invoice_data
            FROM invoice_metadata
            WHERE invoice_number ~ '^[0-9]{4}-[0-9]{2}/[0-9]+$'
            AND EXTRACT(YEAR FROM created_at) =
                CASE
                    WHEN EXTRACT(MONTH FROM p_period_start) >= 4 THEN EXTRACT(YEAR FROM p_period_start)
                    ELSE EXTRACT(YEAR FROM p_period_start) - 1
                END;

            -- Create invoice metadata
            INSERT INTO invoice_metadata (
                customer_id,
                invoice_number,
                period_start,
                period_end,
                sub_total,
                gst_amount,
                total_amount,
                status,
                created_at
            ) VALUES (
                v_customer_id,
                SUBSTRING(v_invoice_data.financial_year, 3, 2) || '/' || v_invoice_data.next_number::TEXT,
                p_period_start,
                p_period_end,
                0, -- Will be calculated by triggers
                0, -- Will be calculated by triggers
                0, -- Will be calculated by triggers
                'draft',
                CURRENT_TIMESTAMP
            ) RETURNING id INTO v_invoice_metadata_id;

            -- Add to successful results
            v_successful_count := v_successful_count + 1;
            v_invoice_numbers := v_invoice_numbers ||
                (SUBSTRING(v_invoice_data.financial_year, 3, 2) || '/' || v_invoice_data.next_number::TEXT);

        EXCEPTION
            WHEN OTHERS THEN
                -- Log individual customer error and continue
                v_errors := v_errors || (v_customer_name || ': ' || SQLERRM);
                -- Don't RAISE - continue processing other customers
        END;
    END LOOP;

    -- 3. Return comprehensive results
    RETURN jsonb_build_object(
        'success', true,
        'successful_count', v_successful_count,
        'total_requested', array_length(p_customer_ids, 1),
        'errors', v_errors,
        'invoice_numbers', v_invoice_numbers,
        'validation_performed', p_validate_existing
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Global error - rollback everything
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Bulk operation failed: ' || SQLERRM,
            'successful_count', 0,
            'errors', ARRAY['Global transaction failure: ' || SQLERRM],
            'invoice_numbers', ARRAY[]::TEXT[]
        );
END;
$function$;

-- Delete bulk invoices safely
CREATE OR REPLACE FUNCTION public.delete_bulk_invoices_safe(p_invoice_ids uuid[], p_validate_payments boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_customer_name TEXT;
    v_payment_count INTEGER;
    v_invoices_with_payments TEXT[] := '{}';
    v_successful_count INTEGER := 0;
    v_errors TEXT[] := '{}';
    v_deleted_numbers TEXT[] := '{}';
    v_affected_sales INTEGER;
BEGIN
    -- 1. Validate for existing payments if requested
    IF p_validate_payments THEN
        FOR v_invoice_id IN SELECT unnest(p_invoice_ids) LOOP
            -- Check for payments
            SELECT COUNT(*) INTO v_payment_count
            FROM invoice_payments
            WHERE invoice_id = v_invoice_id;

            IF v_payment_count > 0 THEN
                -- Get invoice and customer details
                SELECT im.invoice_number, c.billing_name
                INTO v_invoice_number, v_customer_name
                FROM invoice_metadata im
                JOIN customers c ON c.id = im.customer_id
                WHERE im.id = v_invoice_id;

                v_invoices_with_payments := v_invoices_with_payments ||
                    (v_customer_name || ' (Invoice: ' || v_invoice_number || ', Payments: ' || v_payment_count || ')');
            END IF;
        END LOOP;

        -- Return early if payments found
        IF array_length(v_invoices_with_payments, 1) > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cannot delete invoices with payments: ' || array_to_string(v_invoices_with_payments, ', '),
                'invoices_with_payments', v_invoices_with_payments,
                'successful_count', 0,
                'errors', ARRAY['Bulk deletion cancelled due to existing payments'],
                'deleted_numbers', ARRAY[]::TEXT[]
            );
        END IF;
    END IF;

    -- 2. Process each invoice deletion atomically
    FOR v_invoice_id IN SELECT unnest(p_invoice_ids) LOOP
        BEGIN
            -- Get invoice details
            SELECT im.invoice_number, c.billing_name
            INTO v_invoice_number, v_customer_name
            FROM invoice_metadata im
            JOIN customers c ON c.id = im.customer_id
            WHERE im.id = v_invoice_id
            AND im.deleted_at IS NULL;

            IF NOT FOUND THEN
                v_errors := v_errors || ('Invoice not found or already deleted: ' || v_invoice_id::TEXT);
                CONTINUE;
            END IF;

            -- Revert affected sales using precise mapping
            UPDATE sales
            SET payment_status = 'Pending'
            WHERE id IN (
                SELECT ismp.sale_id
                FROM invoice_sales_mapping ismp
                WHERE ismp.invoice_id = v_invoice_id
            ) AND payment_status = 'Billed';

            GET DIAGNOSTICS v_affected_sales = ROW_COUNT;

            -- Soft delete the invoice
            UPDATE invoice_metadata
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = v_invoice_id;

            -- Track success
            v_successful_count := v_successful_count + 1;
            v_deleted_numbers := v_deleted_numbers || v_invoice_number;

        EXCEPTION
            WHEN OTHERS THEN
                -- Log individual invoice error and continue
                v_errors := v_errors || (v_customer_name || ' (' || v_invoice_number || '): ' || SQLERRM);
        END;
    END LOOP;

    -- 3. Return comprehensive results
    RETURN jsonb_build_object(
        'success', true,
        'successful_count', v_successful_count,
        'total_requested', array_length(p_invoice_ids, 1),
        'errors', v_errors,
        'deleted_numbers', v_deleted_numbers,
        'validation_performed', p_validate_payments
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Global error - rollback everything
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Bulk deletion failed: ' || SQLERRM,
            'successful_count', 0,
            'errors', ARRAY['Global transaction failure: ' || SQLERRM],
            'deleted_numbers', ARRAY[]::TEXT[]
        );
END;
$function$;

-- =====================================================
-- INVOICE PREVIEW & REPORTING FUNCTIONS
-- =====================================================

-- Optimized bulk invoice preview
CREATE OR REPLACE FUNCTION public.get_bulk_invoice_preview_optimized(period_start date, period_end date, customer_filter text DEFAULT ''::text)
RETURNS TABLE(customer_id uuid, customer_name text, unbilled_delivery_amount numeric, unbilled_credit_sales_amount numeric, total_unbilled_amount numeric, has_existing_invoice boolean, existing_invoice_number text)
LANGUAGE plpgsql
AS $function$
DECLARE
  sql_query TEXT;
BEGIN
  sql_query := FORMAT('
    WITH customer_deliveries AS (
      -- Get ALL unbilled deliveries (both subscription and additional) using self-contained delivery data
      SELECT
        deliveries.customer_id,
        COALESCE(SUM(deliveries.actual_quantity * deliveries.unit_price), 0) as unbilled_delivery_amount
      FROM deliveries
      LEFT JOIN invoice_line_items ili ON ili.delivery_id = deliveries.id
      WHERE deliveries.order_date BETWEEN %L AND %L
        AND deliveries.delivery_status = ''delivered''
        AND ili.delivery_id IS NULL  -- Not yet billed via delivery_id
      GROUP BY deliveries.customer_id
    ),
    customer_credit_sales AS (
      -- Get unbilled credit sales per customer
      SELECT
        sales.customer_id,
        COALESCE(SUM(sales.total_amount), 0) as unbilled_credit_sales_amount
      FROM sales
      LEFT JOIN invoice_line_items ili ON ili.sale_id = sales.id
      WHERE sales.sale_date BETWEEN %L AND %L
        AND sales.sale_type = ''Credit''
        AND sales.payment_status = ''Pending''
        AND ili.sale_id IS NULL  -- Not yet billed
      GROUP BY sales.customer_id
    ),
    existing_invoices AS (
      -- Check for existing invoices in period
      SELECT
        invoice_metadata.customer_id,
        TRUE as has_existing_invoice,
        invoice_metadata.invoice_number as existing_invoice_number
      FROM invoice_metadata
      WHERE invoice_metadata.period_start >= %L
        AND invoice_metadata.period_end <= %L
    )
    SELECT
      customers.id as customer_id,
      customers.billing_name as customer_name,
      COALESCE(cd.unbilled_delivery_amount, 0) as unbilled_delivery_amount,
      COALESCE(cs.unbilled_credit_sales_amount, 0) as unbilled_credit_sales_amount,
      COALESCE(cd.unbilled_delivery_amount, 0) + COALESCE(cs.unbilled_credit_sales_amount, 0) as total_unbilled_amount,
      COALESCE(ei.has_existing_invoice, FALSE) as has_existing_invoice,
      ei.existing_invoice_number
    FROM customers
    LEFT JOIN customer_deliveries cd ON cd.customer_id = customers.id
    LEFT JOIN customer_credit_sales cs ON cs.customer_id = customers.id
    LEFT JOIN existing_invoices ei ON ei.customer_id = customers.id
    WHERE 1=1 %s
    ORDER BY customers.billing_name
  ', period_start, period_end, period_start, period_end, period_start, period_end, customer_filter);

  RETURN QUERY EXECUTE sql_query;
END;
$function$;

-- Get next invoice sequence number
CREATE OR REPLACE FUNCTION public.get_next_invoice_sequence(year_code text)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    next_seq INTEGER;
BEGIN
    -- Get the highest sequence number for this financial year
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(invoice_number FROM 7) AS INTEGER)),
        0
    ) + 1
    INTO next_seq
    FROM invoice_metadata
    WHERE SUBSTRING(invoice_number FROM 1 FOR 6) = year_code;

    RETURN next_seq;
END;
$function$;

-- =====================================================
-- PAYMENT RECONCILIATION FUNCTIONS
-- =====================================================

-- Reconcile unapplied payments
CREATE OR REPLACE FUNCTION public.reconcile_unapplied_payments()
RETURNS TABLE(payment_id uuid, expected_unapplied numeric, actual_unapplied numeric, discrepancy numeric)
LANGUAGE sql
SECURITY DEFINER
AS $function$
    SELECT
        p.id as payment_id,
        GREATEST(p.amount - COALESCE(ip_total.allocated, 0) - COALESCE(ob_total.allocated, 0), 0) as expected_unapplied,
        COALESCE(up.amount_unapplied, 0) as actual_unapplied,
        GREATEST(p.amount - COALESCE(ip_total.allocated, 0) - COALESCE(ob_total.allocated, 0), 0) - COALESCE(up.amount_unapplied, 0) as discrepancy
    FROM payments p
    LEFT JOIN (
        SELECT payment_id, SUM(amount_allocated) as allocated
        FROM invoice_payments
        GROUP BY payment_id
    ) ip_total ON p.id = ip_total.payment_id
    LEFT JOIN (
        SELECT payment_id, SUM(amount) as allocated
        FROM opening_balance_payments
        GROUP BY payment_id
    ) ob_total ON p.id = ob_total.payment_id
    LEFT JOIN unapplied_payments up ON p.id = up.payment_id
    WHERE GREATEST(p.amount - COALESCE(ip_total.allocated, 0) - COALESCE(ob_total.allocated, 0), 0) != COALESCE(up.amount_unapplied, 0);
$function$;

-- Reconcile unapplied payments with sales support
CREATE OR REPLACE FUNCTION public.reconcile_unapplied_payments_with_sales()
RETURNS TABLE(payment_id uuid, customer_name text, payment_amount numeric, calculated_unapplied numeric, current_unapplied numeric, action_taken text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    payment_record RECORD;
    v_total_allocated DECIMAL(10,2);
    v_calculated_unapplied DECIMAL(10,2);
    v_current_unapplied DECIMAL(10,2);
    v_action TEXT;
    v_payment_id UUID;  -- Use local variable to avoid ambiguity
BEGIN
    -- Process all payments to check for inconsistencies
    FOR payment_record IN
        SELECT
            p.id,
            p.customer_id,
            p.amount,
            c.billing_name,
            up.amount_unapplied as current_unapplied_amount
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN unapplied_payments up ON p.id = up.payment_id
        WHERE p.created_at >= CURRENT_DATE -- Focus on today's payments
    LOOP
        v_payment_id := payment_record.id; -- Store in local variable

        -- Calculate actual allocated amount including sales payments
        SELECT
            COALESCE(ip_total.allocated, 0) +
            COALESCE(ob_total.allocated, 0) +
            COALESCE(sp_total.allocated, 0)
        INTO v_total_allocated
        FROM (SELECT 1) dummy
        LEFT JOIN (
            SELECT SUM(amount_allocated) as allocated
            FROM invoice_payments
            WHERE invoice_payments.payment_id = v_payment_id  -- Use fully qualified name
        ) ip_total ON TRUE
        LEFT JOIN (
            SELECT SUM(amount) as allocated
            FROM opening_balance_payments
            WHERE opening_balance_payments.payment_id = v_payment_id  -- Use fully qualified name
        ) ob_total ON TRUE
        LEFT JOIN (
            SELECT SUM(amount_allocated) as allocated
            FROM sales_payments
            WHERE sales_payments.payment_id = v_payment_id  -- Use fully qualified name
        ) sp_total ON TRUE;

        v_calculated_unapplied := payment_record.amount - v_total_allocated;
        v_current_unapplied := COALESCE(payment_record.current_unapplied_amount, 0);

        -- Fix inconsistencies
        IF v_calculated_unapplied > 0 AND v_current_unapplied != v_calculated_unapplied THEN
            -- Should have unapplied amount but incorrect value
            INSERT INTO unapplied_payments (payment_id, customer_id, amount_unapplied)
            VALUES (v_payment_id, payment_record.customer_id, v_calculated_unapplied)
            ON CONFLICT (payment_id)
            DO UPDATE SET
                amount_unapplied = EXCLUDED.amount_unapplied,
                updated_at = CURRENT_TIMESTAMP;
            v_action := 'Updated unapplied amount';

        ELSIF v_calculated_unapplied <= 0 AND v_current_unapplied > 0 THEN
            -- Should NOT have unapplied amount but it exists
            DELETE FROM unapplied_payments WHERE unapplied_payments.payment_id = v_payment_id;
            v_action := 'Removed incorrect unapplied record';

        ELSE
            v_action := 'No change needed';
        END IF;

        -- Return the results for review
        payment_id := v_payment_id;
        customer_name := payment_record.billing_name;
        payment_amount := payment_record.amount;
        calculated_unapplied := v_calculated_unapplied;
        current_unapplied := v_current_unapplied;
        action_taken := v_action;

        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$function$;

-- Fix unapplied payments inconsistencies
CREATE OR REPLACE FUNCTION public.fix_unapplied_payments_inconsistencies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_fixed_count INTEGER := 0;
    v_payment_record RECORD;
    v_expected_unapplied DECIMAL(10,2);
BEGIN
    -- Fix all inconsistent records
    FOR v_payment_record IN
        SELECT * FROM reconcile_unapplied_payments()
        WHERE discrepancy != 0
    LOOP
        v_expected_unapplied := v_payment_record.expected_unapplied;

        IF v_expected_unapplied > 0 THEN
            -- Update or insert correct unapplied amount
            INSERT INTO unapplied_payments (payment_id, customer_id, amount_unapplied)
            SELECT v_payment_record.payment_id, p.customer_id, v_expected_unapplied
            FROM payments p
            WHERE p.id = v_payment_record.payment_id
            ON CONFLICT (payment_id)
            DO UPDATE SET
                amount_unapplied = EXCLUDED.amount_unapplied,
                updated_at = CURRENT_TIMESTAMP;
        ELSE
            -- Remove unapplied record
            DELETE FROM unapplied_payments
            WHERE payment_id = v_payment_record.payment_id;
        END IF;

        v_fixed_count := v_fixed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'fixed_count', v_fixed_count,
        'timestamp', CURRENT_TIMESTAMP
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'fixed_count', v_fixed_count
        );
END;
$function$;

-- =====================================================
-- BULK OPERATION LOGGING FUNCTIONS
-- =====================================================

-- Log bulk operation
CREATE OR REPLACE FUNCTION public.log_bulk_operation(p_operation_type character varying, p_operation_subtype character varying DEFAULT NULL::character varying, p_total_items integer DEFAULT NULL::integer, p_parameters jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $function$
    INSERT INTO bulk_operation_logs (
        operation_type,
        operation_subtype,
        total_items,
        parameters
    )
    VALUES (p_operation_type, p_operation_subtype, p_total_items, p_parameters)
    RETURNING id;
$function$;

-- Update bulk operation status
CREATE OR REPLACE FUNCTION public.update_bulk_operation_status(p_log_id uuid, p_status character varying, p_successful_items integer DEFAULT NULL::integer, p_failed_items integer DEFAULT NULL::integer, p_error_details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $function$
    UPDATE bulk_operation_logs
    SET
        status = p_status,
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END,
        successful_items = COALESCE(p_successful_items, successful_items),
        failed_items = COALESCE(p_failed_items, failed_items),
        error_details = COALESCE(p_error_details, error_details)
    WHERE id = p_log_id;
$function$;

-- =====================================================
-- MIGRATION & DATA MANAGEMENT FUNCTIONS
-- =====================================================

-- Migrate invoice sales mapping
CREATE OR REPLACE FUNCTION public.migrate_invoice_sales_mapping()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_invoice RECORD;
    v_mapped_count INTEGER := 0;
    v_invoice_count INTEGER := 0;
    v_current_mapped INTEGER;
BEGIN
    -- For each existing invoice, find its sales based on date range and customer
    FOR v_invoice IN
        SELECT id, customer_id, period_start, period_end, created_at
        FROM invoice_metadata
        WHERE COALESCE(deleted_at, 'infinity'::timestamp) = 'infinity'::timestamp
        AND id NOT IN (SELECT DISTINCT invoice_id FROM invoice_sales_mapping)
    LOOP
        v_invoice_count := v_invoice_count + 1;

        INSERT INTO invoice_sales_mapping (invoice_id, sale_id)
        SELECT v_invoice.id, s.id
        FROM sales s
        WHERE s.customer_id = v_invoice.customer_id
        AND s.sale_type = 'Credit'
        AND s.sale_date >= v_invoice.period_start
        AND s.sale_date <= v_invoice.period_end
        AND s.payment_status IN ('Billed', 'Completed')
        ON CONFLICT (invoice_id, sale_id) DO NOTHING;

        GET DIAGNOSTICS v_current_mapped = ROW_COUNT;
        v_mapped_count := v_mapped_count + v_current_mapped;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'migrated_invoices', v_invoice_count,
        'mapped_sales', v_mapped_count,
        'processed_at', CURRENT_TIMESTAMP
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'migrated_invoices', v_invoice_count,
            'mapped_sales', v_mapped_count
        );
END;
$function$;

-- Test opening balance allocation
CREATE OR REPLACE FUNCTION public.test_opening_balance_allocation(p_customer_id uuid, p_payment_amount numeric, p_allocation_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_test_payment_id UUID;
    v_result JSONB;
BEGIN
    -- Create a test payment
    INSERT INTO payments (customer_id, amount, payment_method, allocation_status)
    VALUES (p_customer_id, p_payment_amount, 'Test', 'unapplied')
    RETURNING id INTO v_test_payment_id;

    -- Test the allocation
    SELECT allocate_opening_balance_atomic(v_test_payment_id, p_customer_id, p_allocation_amount)
    INTO v_result;

    -- Clean up test payment
    DELETE FROM opening_balance_payments WHERE payment_id = v_test_payment_id;
    DELETE FROM payments WHERE id = v_test_payment_id;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Clean up on error
        DELETE FROM opening_balance_payments WHERE payment_id = v_test_payment_id;
        DELETE FROM payments WHERE id = v_test_payment_id;
        RAISE;
END;
$function$;

-- =====================================================
-- END OF FUNCTIONS AND PROCEDURES
-- =====================================================