-- Fix check_and_increment_usage to use Australia/Sydney timezone
-- Previously used CURRENT_DATE (UTC), meaning the daily counter reset at 10am/11am AEST
-- instead of midnight Sydney time.
DROP FUNCTION IF EXISTS check_and_increment_usage(uuid, text, int);
CREATE OR REPLACE FUNCTION check_and_increment_usage(
    p_user_id uuid,
    p_usage_type text,
    p_daily_limit int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today date := (now() AT TIME ZONE 'Australia/Sydney')::date;
    v_current int;
BEGIN
    -- Upsert: create today's row if it doesn't exist, otherwise fetch current count
    INSERT INTO usage_tracking (user_id, period_start, brangus_queries, freight_calculations)
    VALUES (p_user_id, v_today, 0, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;

    -- Read the current count for the requested usage type
    IF p_usage_type = 'brangus_queries' THEN
        SELECT brangus_queries INTO v_current
        FROM usage_tracking
        WHERE user_id = p_user_id AND period_start = v_today;
    ELSIF p_usage_type = 'freight_calculations' THEN
        SELECT freight_calculations INTO v_current
        FROM usage_tracking
        WHERE user_id = p_user_id AND period_start = v_today;
    ELSE
        RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', p_daily_limit);
    END IF;

    -- Check if over limit
    IF v_current >= p_daily_limit THEN
        RETURN jsonb_build_object('allowed', false, 'current', v_current, 'limit', p_daily_limit);
    END IF;

    -- Increment the counter
    IF p_usage_type = 'brangus_queries' THEN
        UPDATE usage_tracking
        SET brangus_queries = brangus_queries + 1
        WHERE user_id = p_user_id AND period_start = v_today;
    ELSIF p_usage_type = 'freight_calculations' THEN
        UPDATE usage_tracking
        SET freight_calculations = freight_calculations + 1
        WHERE user_id = p_user_id AND period_start = v_today;
    END IF;

    RETURN jsonb_build_object('allowed', true, 'current', v_current + 1, 'limit', p_daily_limit);
END;
$$;
