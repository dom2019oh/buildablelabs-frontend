// =============================================================================
// Database Query Helpers
// =============================================================================

import { supabase } from './client';
import { nanoid } from 'nanoid';

// =============================================================================
// WORKSPACE QUERIES
// =============================================================================

export async function getOrCreateWorkspace(projectId: string, userId: string) {
  // Try to get existing workspace
  const { data: existing } = await supabase
    .from('workspaces')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing;
  }

  // Create new workspace
  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      project_id: projectId,
      user_id: userId,
      status: 'ready',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWorkspace(workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateWorkspaceStatus(
  workspaceId: string,
  status: 'initializing' | 'ready' | 'generating' | 'error' | 'archived'
) {
  const { error } = await supabase
    .from('workspaces')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', workspaceId);

  if (error) throw error;
}

// =============================================================================
// FILE QUERIES
// =============================================================================

export async function getWorkspaceFiles(workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_files')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('file_path', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getFile(workspaceId: string, filePath: string) {
  const { data, error } = await supabase
    .from('workspace_files')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('file_path', filePath)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertFile(
  workspaceId: string,
  userId: string,
  filePath: string,
  content: string,
  fileType?: string
) {
  const { data, error } = await supabase
    .from('workspace_files')
    .upsert({
      workspace_id: workspaceId,
      user_id: userId,
      file_path: filePath,
      content,
      file_type: fileType || filePath.split('.').pop() || null,
      is_generated: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'workspace_id,file_path',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFile(workspaceId: string, filePath: string) {
  const { error } = await supabase
    .from('workspace_files')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('file_path', filePath);

  if (error) throw error;
}

// =============================================================================
// GENERATION SESSION QUERIES
// =============================================================================

export async function createSession(
  workspaceId: string,
  userId: string,
  prompt: string
) {
  const { data, error } = await supabase
    .from('generation_sessions')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      prompt,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSession(
  sessionId: string,
  updates: {
    status?: 'pending' | 'planning' | 'scaffolding' | 'generating' | 'validating' | 'completed' | 'failed';
    plan?: object;
    files_planned?: number;
    files_generated?: number;
    error_message?: string;
    completed_at?: string;
  }
) {
  const { data, error } = await supabase
    .from('generation_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSessions(workspaceId: string) {
  const { data, error } = await supabase
    .from('generation_sessions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =============================================================================
// FILE OPERATION QUERIES
// =============================================================================

export async function recordFileOperation(
  workspaceId: string,
  userId: string,
  sessionId: string,
  operation: 'create' | 'update' | 'delete' | 'rename' | 'move',
  filePath: string,
  options?: {
    previousContent?: string;
    newContent?: string;
    previousPath?: string;
    aiModel?: string;
    aiReasoning?: string;
  }
) {
  const { data, error } = await supabase
    .from('file_operations')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      session_id: sessionId,
      operation,
      file_path: filePath,
      previous_content: options?.previousContent,
      new_content: options?.newContent,
      previous_path: options?.previousPath,
      ai_model: options?.aiModel,
      ai_reasoning: options?.aiReasoning,
      validated: false,
      applied: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function applyFileOperation(operationId: string) {
  const { data, error } = await supabase
    .rpc('apply_file_operation', { p_operation_id: operationId });

  if (error) throw error;
  return data;
}

export async function getOperationHistory(workspaceId: string, limit = 100) {
  const { data, error } = await supabase
    .from('file_operations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
