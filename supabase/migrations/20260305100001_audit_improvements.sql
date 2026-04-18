-- ============================================
-- MIGRATION: Audit Improvements
-- ============================================
-- Date: 2026-03-05
-- Context: Supabase infrastructure audit (session 15)
-- Adds: date-based indexes, cascade soft-delete trigger, CHECK constraints
--
-- Safe to run multiple times (all statements are idempotent via IF NOT EXISTS / OR REPLACE).

-- ============================================
-- M2: Date-based indexes for common query patterns
-- ============================================
-- Debug: These indexes speed up date-range queries on child records.
-- muster_records, health_records, and sales_records are queried by date in
-- Dashboard, Portfolio, and Brangus AI (lookup_portfolio_data).

CREATE INDEX IF NOT EXISTS idx_muster_records_user_date
    ON muster_records(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_health_records_user_date
    ON health_records(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_records_user_sale_date
    ON sales_records(user_id, sale_date DESC);


-- ============================================
-- M3: Cascade soft-delete trigger for herds -> children
-- ============================================
-- Debug: When a herd is soft-deleted (is_deleted set to true), automatically
-- soft-delete all associated muster_records and health_records.
-- This ensures consistency even if app code fails to cascade the deletion.
-- updated_at is also set so the change is picked up by delta sync pulls.

CREATE OR REPLACE FUNCTION cascade_soft_delete_herd_children()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
        UPDATE muster_records
            SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
            WHERE herd_id = NEW.id AND is_deleted = false;

        UPDATE health_records
            SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
            WHERE herd_id = NEW.id AND is_deleted = false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Debug: Drop and recreate to ensure latest version is applied
DROP TRIGGER IF EXISTS trg_cascade_soft_delete_herd ON herds;

CREATE TRIGGER trg_cascade_soft_delete_herd
    AFTER UPDATE ON herds
    FOR EACH ROW
    EXECUTE FUNCTION cascade_soft_delete_herd_children();


-- ============================================
-- M4: CHECK constraints for data integrity
-- ============================================
-- Debug: Validates enum-like columns at the database level.
-- Prevents invalid values from being inserted even if app code has bugs.
-- Uses DO blocks for idempotent application (skip if constraint already exists).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_herds_valid_species'
    ) THEN
        ALTER TABLE herds ADD CONSTRAINT chk_herds_valid_species
            CHECK (species IN ('Cattle', 'Sheep', 'Pigs', 'Goats'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_herds_valid_sex'
    ) THEN
        ALTER TABLE herds ADD CONSTRAINT chk_herds_valid_sex
            CHECK (sex IN ('Male', 'Female', 'Mixed'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_records_pricing_type'
    ) THEN
        ALTER TABLE sales_records ADD CONSTRAINT chk_sales_records_pricing_type
            CHECK (pricing_type IS NULL OR pricing_type IN ('per_kg', 'per_head'));
    END IF;
END $$;
