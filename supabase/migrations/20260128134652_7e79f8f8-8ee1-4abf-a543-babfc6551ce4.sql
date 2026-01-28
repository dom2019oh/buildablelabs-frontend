-- Create project messages table for storing chat history
CREATE TABLE public.project_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_project_messages_project_id ON public.project_messages(project_id);
CREATE INDEX idx_project_messages_created_at ON public.project_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access messages for their own projects
CREATE POLICY "Users can view messages for their projects"
ON public.project_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_messages.project_id
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create messages for their projects"
ON public.project_messages
FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_messages.project_id
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own messages"
ON public.project_messages
FOR DELETE
USING (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_messages.project_id
        AND projects.user_id = auth.uid()
    )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;