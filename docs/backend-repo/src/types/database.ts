// =============================================================================
// Supabase Database Types
// =============================================================================
// Auto-generated from Supabase schema.
// Run: bun run db:generate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          status: 'initializing' | 'ready' | 'generating' | 'error' | 'archived';
          preview_url: string | null;
          preview_status: string | null;
          config: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
          last_activity_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          status?: 'initializing' | 'ready' | 'generating' | 'error' | 'archived';
          preview_url?: string | null;
          preview_status?: string | null;
          config?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          last_activity_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          status?: 'initializing' | 'ready' | 'generating' | 'error' | 'archived';
          preview_url?: string | null;
          preview_status?: string | null;
          config?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          last_activity_at?: string | null;
        };
      };
      workspace_files: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          file_path: string;
          content: string;
          file_type: string | null;
          is_generated: boolean;
          hash: string | null;
          size_bytes: number | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          file_path: string;
          content?: string;
          file_type?: string | null;
          is_generated?: boolean;
          hash?: string | null;
          size_bytes?: number | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          file_path?: string;
          content?: string;
          file_type?: string | null;
          is_generated?: boolean;
          hash?: string | null;
          size_bytes?: number | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      generation_sessions: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          prompt: string;
          status: 'pending' | 'planning' | 'scaffolding' | 'generating' | 'validating' | 'completed' | 'failed';
          plan: Json | null;
          plan_created_at: string | null;
          files_planned: number | null;
          files_generated: number | null;
          validation_passed: boolean | null;
          validation_errors: Json | null;
          error_message: string | null;
          model_used: string | null;
          tokens_used: number | null;
          credits_used: number | null;
          duration_ms: number | null;
          metadata: Json | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          prompt: string;
          status?: 'pending' | 'planning' | 'scaffolding' | 'generating' | 'validating' | 'completed' | 'failed';
          plan?: Json | null;
          plan_created_at?: string | null;
          files_planned?: number | null;
          files_generated?: number | null;
          validation_passed?: boolean | null;
          validation_errors?: Json | null;
          error_message?: string | null;
          model_used?: string | null;
          tokens_used?: number | null;
          credits_used?: number | null;
          duration_ms?: number | null;
          metadata?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          prompt?: string;
          status?: 'pending' | 'planning' | 'scaffolding' | 'generating' | 'validating' | 'completed' | 'failed';
          plan?: Json | null;
          plan_created_at?: string | null;
          files_planned?: number | null;
          files_generated?: number | null;
          validation_passed?: boolean | null;
          validation_errors?: Json | null;
          error_message?: string | null;
          model_used?: string | null;
          tokens_used?: number | null;
          credits_used?: number | null;
          duration_ms?: number | null;
          metadata?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      file_operations: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          session_id: string | null;
          operation: 'create' | 'update' | 'delete' | 'rename' | 'move';
          file_path: string;
          previous_path: string | null;
          previous_content: string | null;
          new_content: string | null;
          ai_model: string | null;
          ai_reasoning: string | null;
          validated: boolean;
          validation_errors: Json | null;
          applied: boolean;
          applied_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          session_id?: string | null;
          operation: 'create' | 'update' | 'delete' | 'rename' | 'move';
          file_path: string;
          previous_path?: string | null;
          previous_content?: string | null;
          new_content?: string | null;
          ai_model?: string | null;
          ai_reasoning?: string | null;
          validated?: boolean;
          validation_errors?: Json | null;
          applied?: boolean;
          applied_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          session_id?: string | null;
          operation?: 'create' | 'update' | 'delete' | 'rename' | 'move';
          file_path?: string;
          previous_path?: string | null;
          previous_content?: string | null;
          new_content?: string | null;
          ai_model?: string | null;
          ai_reasoning?: string | null;
          validated?: boolean;
          validation_errors?: Json | null;
          applied?: boolean;
          applied_at?: string | null;
          created_at?: string;
        };
      };
    };
    Enums: {
      workspace_status: 'initializing' | 'ready' | 'generating' | 'error' | 'archived';
      file_operation_type: 'create' | 'update' | 'delete' | 'rename' | 'move';
      generation_session_status: 'pending' | 'planning' | 'scaffolding' | 'generating' | 'validating' | 'completed' | 'failed';
    };
  };
}
