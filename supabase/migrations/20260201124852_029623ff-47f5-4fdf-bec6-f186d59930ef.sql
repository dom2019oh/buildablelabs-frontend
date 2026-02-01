-- Enable realtime for generation progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_operations;