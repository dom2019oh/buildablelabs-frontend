-- Allow users to update their own project messages (needed for placeholder -> final content)
CREATE POLICY "Users can update their own messages"
ON public.project_messages
FOR UPDATE
USING (
  (auth.uid() = user_id) AND (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_messages.project_id
    AND projects.user_id = auth.uid()
  ))
);