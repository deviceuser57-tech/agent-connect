-- DCK v2.0: Architecture Evolution Audit Trail
CREATE TABLE IF NOT EXISTS public.architecture_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason TEXT NOT NULL,
    affected_modules TEXT[] NOT NULL,
    before_hash TEXT,
    after_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.architecture_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.architecture_change_log FOR ALL USING (true);
