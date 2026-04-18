-- Relax price source constraint to allow MLA Transactions sources from NLRS CSV import
-- The mla-scraper Edge Function uses "MLA Transactions - <saleyard>" format
-- and "MLA Transactions - <saleyard> + Breed Premium" for breed-specific entries

ALTER TABLE category_prices DROP CONSTRAINT IF EXISTS chk_price_source;
ALTER TABLE category_prices ADD CONSTRAINT chk_price_source
    CHECK (
        source IN (
            'MLA Physical Report',
            'MLA API',
            'MLA API + Smart Mapping',
            'MLA API + Smart Mapping + Breed Premium',
            'Calculated',
            'Manual',
            'CSV Import',
            'CSV Import + Breed Premium'
        )
        OR source LIKE 'MLA Transactions%'
    );
