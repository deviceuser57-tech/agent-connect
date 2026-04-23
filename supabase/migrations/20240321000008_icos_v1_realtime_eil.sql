-- EIL v1.0: Realtime State Streaming Activation
-- Enabling Realtime for UI-synchronization
BEGIN;
  -- Add tables to the realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE system_state;
  ALTER PUBLICATION supabase_realtime ADD TABLE execution_traces;
  ALTER PUBLICATION supabase_realtime ADD TABLE memory_graph_nodes;
COMMIT;
