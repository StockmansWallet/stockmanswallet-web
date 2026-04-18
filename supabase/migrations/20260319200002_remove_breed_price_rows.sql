-- Remove pre-computed breed-specific rows from category_prices.
-- Breed premiums are applied dynamically at valuation time by both iOS and web engines.
-- These rows were a 21x multiplication (1 base + 20 breeds per entry) that bloated
-- the table from ~165k to 3.46M rows, causing CPU overload and query timeouts.
--
-- Full truncate — data will be re-uploaded from MLA CSVs without breed multiplication.
TRUNCATE category_prices;
TRUNCATE historical_market_prices;
