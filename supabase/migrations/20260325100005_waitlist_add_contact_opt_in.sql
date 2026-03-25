-- Add contact opt-in column to waitlist table
-- Tracks whether the user has opted in to receive product updates
alter table waitlist
  add column if not exists contact_opt_in boolean not null default false;
