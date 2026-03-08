
-- Create evidence storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false);

-- RLS: users can upload to their own folder
CREATE POLICY "Users can upload evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can view their own evidence
CREATE POLICY "Users can view own evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can delete their own evidence
CREATE POLICY "Users can delete own evidence"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Evidence metadata table
CREATE TABLE public.evidence_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'unknown',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own evidence"
  ON public.evidence_attachments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
