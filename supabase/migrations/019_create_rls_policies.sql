-- RLS Policies for all tables

-- Helper function to get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id FROM staff WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Companies policies
CREATE POLICY "company_select" ON companies
    FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "company_update" ON companies
    FOR UPDATE USING (id = get_user_company_id())
    WITH CHECK (id = get_user_company_id());

-- Stores policies
CREATE POLICY "stores_select" ON stores
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "stores_insert" ON stores
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "stores_update" ON stores
    FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "stores_delete" ON stores
    FOR DELETE USING (company_id = get_user_company_id());

-- Staff policies
CREATE POLICY "staff_select" ON staff
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "staff_insert" ON staff
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "staff_update" ON staff
    FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "staff_delete" ON staff
    FOR DELETE USING (company_id = get_user_company_id());

-- Staff Stores policies
CREATE POLICY "staff_stores_all" ON staff_stores
    FOR ALL USING (
        EXISTS (SELECT 1 FROM staff WHERE staff.id = staff_stores.staff_id AND staff.company_id = get_user_company_id())
    );

-- Customers policies
CREATE POLICY "customers_select" ON customers
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "customers_insert" ON customers
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "customers_update" ON customers
    FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "customers_delete" ON customers
    FOR DELETE USING (company_id = get_user_company_id());

-- Customer Kartes policies
CREATE POLICY "customer_kartes_all" ON customer_kartes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM customers WHERE customers.id = customer_kartes.customer_id AND customers.company_id = get_user_company_id())
    );

-- Menu Categories policies
CREATE POLICY "menu_categories_all" ON menu_categories
    FOR ALL USING (company_id = get_user_company_id());

-- Menus policies
CREATE POLICY "menus_all" ON menus
    FOR ALL USING (company_id = get_user_company_id());

-- Processes policies
CREATE POLICY "processes_all" ON processes
    FOR ALL USING (company_id = get_user_company_id());

-- Menu Processes policies
CREATE POLICY "menu_processes_all" ON menu_processes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM menus WHERE menus.id = menu_processes.menu_id AND menus.company_id = get_user_company_id())
    );

-- Products policies
CREATE POLICY "products_all" ON products
    FOR ALL USING (company_id = get_user_company_id());

-- Materials policies
CREATE POLICY "materials_all" ON materials
    FOR ALL USING (company_id = get_user_company_id());

-- Tags policies
CREATE POLICY "tags_all" ON tags
    FOR ALL USING (company_id = get_user_company_id());

-- Tag Items policies
CREATE POLICY "tag_items_all" ON tag_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM tags WHERE tags.id = tag_items.tag_id AND tags.company_id = get_user_company_id())
    );

-- Reservations policies
CREATE POLICY "reservations_all" ON reservations
    FOR ALL USING (company_id = get_user_company_id());

-- Reservation Menus policies
CREATE POLICY "reservation_menus_all" ON reservation_menus
    FOR ALL USING (
        EXISTS (SELECT 1 FROM reservations WHERE reservations.id = reservation_menus.reservation_id AND reservations.company_id = get_user_company_id())
    );

-- Visits policies
CREATE POLICY "visits_all" ON visits
    FOR ALL USING (company_id = get_user_company_id());

-- Customer Photos policies
CREATE POLICY "customer_photos_all" ON customer_photos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM customers WHERE customers.id = customer_photos.customer_id AND customers.company_id = get_user_company_id())
    );

-- Sales policies
CREATE POLICY "sales_select" ON sales
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "sales_insert" ON sales
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Sale Items policies
CREATE POLICY "sale_items_all" ON sale_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.company_id = get_user_company_id())
    );

-- Sale Item Staff Assignments policies
CREATE POLICY "sale_item_staff_assignments_all" ON sale_item_staff_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sale_items
            JOIN sales ON sales.id = sale_items.sale_id
            WHERE sale_items.id = sale_item_staff_assignments.sale_item_id
            AND sales.company_id = get_user_company_id()
        )
    );

-- Sale Item Process Assignments policies
CREATE POLICY "sale_item_process_assignments_all" ON sale_item_process_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sale_items
            JOIN sales ON sales.id = sale_items.sale_id
            WHERE sale_items.id = sale_item_process_assignments.sale_item_id
            AND sales.company_id = get_user_company_id()
        )
    );

-- Sale Payments policies
CREATE POLICY "sale_payments_all" ON sale_payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_payments.sale_id AND sales.company_id = get_user_company_id())
    );

-- Sale Discounts policies
CREATE POLICY "sale_discounts_all" ON sale_discounts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_discounts.sale_id AND sales.company_id = get_user_company_id())
    );

-- Refunds policies
CREATE POLICY "refunds_all" ON refunds
    FOR ALL USING (company_id = get_user_company_id());

-- Refund Items policies
CREATE POLICY "refund_items_all" ON refund_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM refunds WHERE refunds.id = refund_items.refund_id AND refunds.company_id = get_user_company_id())
    );

-- Accounts Receivable policies
CREATE POLICY "accounts_receivable_all" ON accounts_receivable
    FOR ALL USING (company_id = get_user_company_id());

-- AR Payments policies
CREATE POLICY "ar_payments_all" ON accounts_receivable_payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM accounts_receivable WHERE accounts_receivable.id = accounts_receivable_payments.accounts_receivable_id AND accounts_receivable.company_id = get_user_company_id())
    );

-- Ticket Types policies
CREATE POLICY "ticket_types_all" ON ticket_types
    FOR ALL USING (company_id = get_user_company_id());

-- Tickets policies
CREATE POLICY "tickets_all" ON tickets
    FOR ALL USING (company_id = get_user_company_id());

-- Ticket Usages policies
CREATE POLICY "ticket_usages_all" ON ticket_usages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_usages.ticket_id AND tickets.company_id = get_user_company_id())
    );

-- Coupons policies
CREATE POLICY "coupons_all" ON coupons
    FOR ALL USING (company_id = get_user_company_id());

-- Coupon Usages policies
CREATE POLICY "coupon_usages_all" ON coupon_usages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM coupons WHERE coupons.id = coupon_usages.coupon_id AND coupons.company_id = get_user_company_id())
    );

-- Point Transactions policies
CREATE POLICY "point_transactions_all" ON point_transactions
    FOR ALL USING (company_id = get_user_company_id());

-- Color Recipes policies
CREATE POLICY "color_recipes_all" ON color_recipes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM customers WHERE customers.id = color_recipes.customer_id AND customers.company_id = get_user_company_id())
    );

-- Perm Recipes policies
CREATE POLICY "perm_recipes_all" ON perm_recipes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM customers WHERE customers.id = perm_recipes.customer_id AND customers.company_id = get_user_company_id())
    );

-- Shifts policies
CREATE POLICY "shifts_all" ON shifts
    FOR ALL USING (company_id = get_user_company_id());

-- Attendances policies
CREATE POLICY "attendances_all" ON attendances
    FOR ALL USING (company_id = get_user_company_id());

-- Conversation Recordings policies
CREATE POLICY "conversation_recordings_all" ON conversation_recordings
    FOR ALL USING (company_id = get_user_company_id());

-- Conversation Transcripts policies
CREATE POLICY "conversation_transcripts_all" ON conversation_transcripts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM conversation_recordings WHERE conversation_recordings.id = conversation_transcripts.recording_id AND conversation_recordings.company_id = get_user_company_id())
    );

-- Conversation Analyses policies
CREATE POLICY "conversation_analyses_all" ON conversation_analyses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM conversation_recordings WHERE conversation_recordings.id = conversation_analyses.recording_id AND conversation_recordings.company_id = get_user_company_id())
    );

-- AI Suggestions policies
CREATE POLICY "ai_suggestions_all" ON ai_suggestions
    FOR ALL USING (company_id = get_user_company_id());

-- Hairstyle Simulations policies
CREATE POLICY "hairstyle_simulations_all" ON hairstyle_simulations
    FOR ALL USING (company_id = get_user_company_id());

-- Notification Templates policies
CREATE POLICY "notification_templates_all" ON notification_templates
    FOR ALL USING (company_id = get_user_company_id());

-- Notifications policies
CREATE POLICY "notifications_all" ON notifications
    FOR ALL USING (company_id = get_user_company_id());

-- Subscription Plans policies
CREATE POLICY "subscription_plans_all" ON subscription_plans
    FOR ALL USING (company_id = get_user_company_id());

-- Customer Subscriptions policies
CREATE POLICY "customer_subscriptions_all" ON customer_subscriptions
    FOR ALL USING (company_id = get_user_company_id());

-- Audit Logs policies
CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT USING (company_id = get_user_company_id());
