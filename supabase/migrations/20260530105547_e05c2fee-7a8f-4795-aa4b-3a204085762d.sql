CREATE OR REPLACE VIEW public.cognition_traces_compat
WITH (security_invoker = true) AS
SELECT
  id,
  session_id,
  created_at,
  created_at                  AS "timestamp",
  trace_data -> 'L0'          AS l0,
  trace_data -> 'L1'          AS l1,
  trace_data -> 'L2'          AS l2,
  trace_data -> 'L3'          AS l3,
  trace_data -> 'L4'          AS l4,
  trace_data -> 'L5'          AS l5,
  trace_data -> 'L6'          AS l6,
  trace_data -> 'L7'          AS l7,
  trace_data                  AS raw_trace
FROM public.execution_traces;

GRANT SELECT ON public.cognition_traces_compat TO authenticated;
GRANT SELECT ON public.cognition_traces_compat TO service_role;