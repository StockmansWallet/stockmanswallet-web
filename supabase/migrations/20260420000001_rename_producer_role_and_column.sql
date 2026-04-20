-- ============================================================================
-- Hard-cut rename of user_profiles.role value 'farmer_grazier' -> 'producer'
-- and column is_discoverable_to_farmers -> is_discoverable_to_producers.
--
-- Still in closed beta so we do not keep compatibility aliases. iOS and web
-- both ship against the new names in the same release cycle.
-- ============================================================================

-- 1. Role value flip. Must happen BEFORE the CHECK constraint is replaced,
--    otherwise the UPDATE fails the new constraint.
--    We drop the old constraint first, update, then add the new one.
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS chk_valid_role;

UPDATE user_profiles
   SET role = 'producer'
 WHERE role = 'farmer_grazier';

ALTER TABLE user_profiles ADD CONSTRAINT chk_valid_role
    CHECK (role IN (
        'producer',
        'agribusiness_banker',
        'insurer',
        'livestock_agent',
        'accountant',
        'succession_planner'
    ));

-- 2. Column rename. The "Read discoverable profiles or own" RLS policy
--    references this column in its USING clause, so we drop the policy
--    first, rename the column, then recreate the policy.
DROP POLICY IF EXISTS "Read discoverable profiles or own" ON user_profiles;

ALTER TABLE user_profiles
    RENAME COLUMN is_discoverable_to_farmers TO is_discoverable_to_producers;

CREATE POLICY "Read discoverable profiles or own"
    ON user_profiles FOR SELECT
    USING (
        is_discoverable = true
        OR is_listed_in_directory = true
        OR is_discoverable_to_producers = true
        OR user_id = auth.uid()
    );

-- 3. Rename the partial index so its name matches the column. Postgres
--    rewrites the WHERE clause to the new column automatically during the
--    ALTER TABLE RENAME above, so only the index identifier needs renaming.
ALTER INDEX IF EXISTS idx_user_profiles_discoverable_to_farmers
    RENAME TO idx_user_profiles_discoverable_to_producers;
