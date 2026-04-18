-- Update build labels from Build 0.5 (8) to Build 0.5 (9) after build 8 failed processing
UPDATE dev_updates
SET build_label = 'Build 0.5 (9)'
WHERE date = '2026-03-19'
  AND platform = 'ios'
  AND build_label = 'Build 0.5 (8)';
