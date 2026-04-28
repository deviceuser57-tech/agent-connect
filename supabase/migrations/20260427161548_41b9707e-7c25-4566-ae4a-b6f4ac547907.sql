CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workspaces"
ON public.workspaces FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can create their own workspaces"
ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own workspaces"
ON public.workspaces FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own workspaces"
ON public.workspaces FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();