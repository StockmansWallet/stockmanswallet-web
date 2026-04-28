-- ============================================================================
-- Rename waitlist feature interest 'producer_network' -> 'ch40'
--
-- Context: The Producer Network feature rebranded to Ch 40 (UHF channel 40,
-- the producer channel). The waitlist.interested_features text array stores
-- the feature IDs users selected at sign-up. This migration replaces the
-- legacy 'producer_network' value with the new 'ch40' identifier so the
-- admin waitlist table reads correctly under the new feature ID.
--
-- Scope: data-only update against waitlist.interested_features. The DB
-- otherwise has no producer-network-specific schema - peer connections live
-- in the generic connection_requests table with connection_type = 'producer_peer',
-- which describes the relationship type (vs 'advisory') rather than the
-- brand and so stays unchanged.
-- ============================================================================

UPDATE waitlist
   SET interested_features = ARRAY_REPLACE(interested_features, 'producer_network', 'ch40')
 WHERE 'producer_network' = ANY(interested_features);
