
-- Shift handovers table
CREATE TABLE public.shift_handovers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shift_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shift_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  open_alerts_count INTEGER NOT NULL DEFAULT 0,
  escalated_count INTEGER NOT NULL DEFAULT 0,
  resolved_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  key_findings TEXT,
  pending_actions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own handovers"
  ON public.shift_handovers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_handovers;
