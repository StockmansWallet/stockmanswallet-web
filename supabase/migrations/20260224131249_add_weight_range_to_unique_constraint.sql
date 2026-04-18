-- Add weight_range to the unique constraint on category_prices
-- This allows different weight brackets (e.g. 200-280, 330-400) to coexist
-- for the same category+breed+saleyard+date combination

-- Drop the old constraint that doesn't include weight_range
ALTER TABLE category_prices
  DROP CONSTRAINT IF EXISTS category_prices_category_breed_saleyard_data_date_key;

-- Create new constraint including weight_range
ALTER TABLE category_prices
  ADD CONSTRAINT category_prices_category_breed_saleyard_weight_range_date_key
  UNIQUE (category, breed, saleyard, weight_range, data_date);
