CREATE TABLE public.cognitive_dna (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_key   text NOT NULL,
  trait_value jsonb NOT NULL,
  version     integer NOT NULL DEFAULT 1,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (trait_key, version)
);

GRANT SELECT ON public.cognitive_dna TO authenticated;
GRANT ALL    ON public.cognitive_dna TO service_role;

ALTER TABLE public.cognitive_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read active cognitive_dna"
  ON public.cognitive_dna
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      SELECT user_roles.role FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      LIMIT 1
    ) = 'ADMIN'
  );

CREATE POLICY "Service role manages cognitive_dna"
  ON public.cognitive_dna
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.cognitive_dna;