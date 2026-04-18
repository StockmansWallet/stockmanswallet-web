-- Clear all category_prices data ahead of clean 12-month MLA re-import.
-- Also clears historical_market_prices which mirrors the same data.
TRUNCATE category_prices;
TRUNCATE historical_market_prices;
