-- Add interested_features column to waitlist table
-- Stores an array of feature keys the user is most interested in
alter table waitlist
  add column if not exists interested_features text[] default '{}';
