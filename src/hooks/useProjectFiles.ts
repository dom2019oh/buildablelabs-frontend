import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectFilesStore } from '@/stores/projectFilesStore';

interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  file_path: string;
  file_content: string;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectFiles(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addFile, clearFiles, files } = useProjectFilesStore();

  // Fetch saved files from database
  const { data: savedFiles, isLoading } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('file_path');

      if (error) throw error;
      return data as ProjectFile[];
    },
    enabled: !!projectId && !!user,
  });

  // Load files into store on mount
  useEffect(() => {
    if (savedFiles && savedFiles.length > 0) {
      // Clear and load from DB
      savedFiles.forEach(file => {
        addFile(file.file_path, file.file_content);
      });
    }
  }, [savedFiles, addFile]);

  // Save a single file
  const saveFile = useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      if (!projectId || !user) throw new Error('No project or user');

      const fileType = path.split('.').pop() || 'txt';

      // Upsert file (insert or update if exists)
      const { data, error } = await supabase
        .from('project_files')
        .upsert({
          project_id: projectId,
          user_id: user.id,
          file_path: path,
          file_content: content,
          file_type: fileType,
        }, {
          onConflict: 'project_id,file_path',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
  });

  // Save multiple files at once (batch)
  const saveFiles = useMutation({
    mutationFn: async (filesToSave: Array<{ path: string; content: string }>) => {
      if (!projectId || !user) throw new Error('No project or user');

      const records = filesToSave.map(f => ({
        project_id: projectId,
        user_id: user.id,
        file_path: f.path,
        file_content: f.content,
        file_type: f.path.split('.').pop() || 'txt',
      }));

      const { data, error } = await supabase
        .from('project_files')
        .upsert(records, {
          onConflict: 'project_id,file_path',
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
  });

  // Delete a file
  const deleteFile = useMutation({
    mutationFn: async (path: string) => {
      if (!projectId) throw new Error('No project');

      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', projectId)
        .eq('file_path', path);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
  });

  // Auto-save all current store files to database
  const syncToDatabase = useCallback(async () => {
    if (!projectId || !user) return;

    const currentFiles = Array.from(files.values());
    if (currentFiles.length === 0) return;

    await saveFiles.mutateAsync(
      currentFiles.map(f => ({ path: f.path, content: f.content }))
    );
  }, [projectId, user, files, saveFiles]);

  return {
    savedFiles,
    isLoading,
    saveFile,
    saveFiles,
    deleteFile,
    syncToDatabase,
  };
}
