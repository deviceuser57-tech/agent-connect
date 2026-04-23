-- DCK v2.0: Transactional State Management
CREATE OR REPLACE FUNCTION atomic_state_commit(
  p_session_id TEXT,
  p_next_state TEXT,
  p_payload JSONB,
  p_action TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. Acquire Row-level lock
  PERFORM * FROM system_state WHERE session_id = p_session_id FOR UPDATE;

  -- 2. Update state
  INSERT INTO system_state (session_id, current_state, payload, updated_at)
  VALUES (p_session_id, p_next_state, p_payload, now())
  ON CONFLICT (session_id) DO UPDATE SET
    current_state = p_next_state,
    payload = p_payload,
    updated_at = now();

  -- 3. Log Audit Trail
  INSERT INTO execution_logs (session_id, action, state, details, created_at)
  VALUES (p_session_id, p_action, p_next_state, p_payload, now());

  SELECT jsonb_build_object('session_id', p_session_id, 'state', p_next_state) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
