export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_rate_limits: {
        Row: {
          created_at: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      credit_action_costs: {
        Row: {
          action_type: Database["public"]["Enums"]["credit_action_type"]
          created_at: string
          credit_cost: number
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["credit_action_type"]
          created_at?: string
          credit_cost: number
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["credit_action_type"]
          created_at?: string
          credit_cost?: number
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      credit_tiers: {
        Row: {
          created_at: string
          credits: number
          id: string
          is_popular: boolean
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          price_cents: number
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          is_popular?: boolean
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          price_cents: number
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          is_popular?: boolean
          plan_type?: Database["public"]["Enums"]["subscription_plan_type"]
          price_cents?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action_type: Database["public"]["Enums"]["credit_action_type"] | null
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        Insert: {
          action_type?: Database["public"]["Enums"]["credit_action_type"] | null
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["credit_action_type"] | null
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      file_operations: {
        Row: {
          ai_model: string | null
          ai_reasoning: string | null
          applied: boolean
          applied_at: string | null
          created_at: string
          file_path: string
          id: string
          new_content: string | null
          operation: Database["public"]["Enums"]["file_operation_type"]
          previous_content: string | null
          previous_path: string | null
          session_id: string | null
          user_id: string
          validated: boolean
          validation_errors: Json | null
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_reasoning?: string | null
          applied?: boolean
          applied_at?: string | null
          created_at?: string
          file_path: string
          id?: string
          new_content?: string | null
          operation: Database["public"]["Enums"]["file_operation_type"]
          previous_content?: string | null
          previous_path?: string | null
          session_id?: string | null
          user_id: string
          validated?: boolean
          validation_errors?: Json | null
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          ai_reasoning?: string | null
          applied?: boolean
          applied_at?: string | null
          created_at?: string
          file_path?: string
          id?: string
          new_content?: string | null
          operation?: Database["public"]["Enums"]["file_operation_type"]
          previous_content?: string | null
          previous_path?: string | null
          session_id?: string | null
          user_id?: string
          validated?: boolean
          validation_errors?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_operations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "generation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_operations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string
          files: Json
          id: string
          label: string | null
          message_id: string | null
          preview_html: string | null
          project_id: string
          user_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          files?: Json
          id?: string
          label?: string | null
          message_id?: string | null
          preview_html?: string | null
          project_id: string
          user_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          files?: Json
          id?: string
          label?: string | null
          message_id?: string | null
          preview_html?: string | null
          project_id?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "project_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          credits_used: number | null
          duration_ms: number | null
          error_message: string | null
          files_generated: number | null
          files_planned: number | null
          id: string
          metadata: Json | null
          model_used: string | null
          plan: Json | null
          plan_created_at: string | null
          prompt: string
          started_at: string | null
          status: Database["public"]["Enums"]["generation_session_status"]
          tokens_used: number | null
          user_id: string
          validation_errors: Json | null
          validation_passed: boolean | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credits_used?: number | null
          duration_ms?: number | null
          error_message?: string | null
          files_generated?: number | null
          files_planned?: number | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          plan?: Json | null
          plan_created_at?: string | null
          prompt: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_session_status"]
          tokens_used?: number | null
          user_id: string
          validation_errors?: Json | null
          validation_passed?: boolean | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credits_used?: number | null
          duration_ms?: number | null
          error_message?: string | null
          files_generated?: number | null
          files_planned?: number | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          plan?: Json | null
          plan_created_at?: string | null
          prompt?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_session_status"]
          tokens_used?: number | null
          user_id?: string
          validation_errors?: Json | null
          validation_passed?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_builds: {
        Row: {
          build_logs: string | null
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          project_id: string
          started_at: string
          status: Database["public"]["Enums"]["build_status"]
          user_id: string
        }
        Insert: {
          build_logs?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          project_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["build_status"]
          user_id: string
        }
        Update: {
          build_logs?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          project_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["build_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_builds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          file_content: string
          file_path: string
          file_type: string | null
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_content: string
          file_path: string
          file_type?: string | null
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_content?: string
          file_path?: string
          file_type?: string | null
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_prompts: {
        Row: {
          created_at: string
          id: string
          project_id: string
          prompt_text: string
          response_summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          prompt_text: string
          response_summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          prompt_text?: string
          response_summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_prompts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          deployed_url: string | null
          description: string | null
          id: string
          is_archived: boolean
          name: string
          preview_html: string | null
          status: Database["public"]["Enums"]["project_status"]
          subdomain: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deployed_url?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          preview_html?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          subdomain?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deployed_url?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          preview_html?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          subdomain?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          allows_custom_domain: boolean
          allows_remove_branding: boolean
          allows_rollover: boolean
          base_price_cents: number
          created_at: string
          daily_bonus_credits: number
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_credits: number
          max_team_members: number | null
          min_credits: number
          name: string
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          updated_at: string
        }
        Insert: {
          allows_custom_domain?: boolean
          allows_remove_branding?: boolean
          allows_rollover?: boolean
          base_price_cents?: number
          created_at?: string
          daily_bonus_credits?: number
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_credits?: number
          max_team_members?: number | null
          min_credits?: number
          name: string
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          updated_at?: string
        }
        Update: {
          allows_custom_domain?: boolean
          allows_remove_branding?: boolean
          allows_rollover?: boolean
          base_price_cents?: number
          created_at?: string
          daily_bonus_credits?: number
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_credits?: number
          max_team_members?: number | null
          min_credits?: number
          name?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          bonus_credits: number
          created_at: string
          id: string
          last_daily_bonus_at: string | null
          monthly_credits: number
          rollover_credits: number
          topup_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_credits?: number
          created_at?: string
          id?: string
          last_daily_bonus_at?: string | null
          monthly_credits?: number
          rollover_credits?: number
          topup_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_credits?: number
          created_at?: string
          id?: string
          last_daily_bonus_at?: string | null
          monthly_credits?: number
          rollover_credits?: number
          topup_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          is_annual: boolean
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          price_cents: number
          selected_credits: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          is_annual?: boolean
          plan_type?: Database["public"]["Enums"]["subscription_plan_type"]
          price_cents?: number
          selected_credits?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          is_annual?: boolean
          plan_type?: Database["public"]["Enums"]["subscription_plan_type"]
          price_cents?: number
          selected_credits?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_recordings: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          project_id: string
          status: string
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          project_id: string
          status?: string
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          project_id?: string
          status?: string
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_files: {
        Row: {
          content: string
          created_at: string
          file_path: string
          file_type: string | null
          hash: string | null
          id: string
          is_generated: boolean
          metadata: Json | null
          size_bytes: number | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          file_path: string
          file_type?: string | null
          hash?: string | null
          id?: string
          is_generated?: boolean
          metadata?: Json | null
          size_bytes?: number | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_path?: string
          file_type?: string | null
          hash?: string | null
          id?: string
          is_generated?: boolean
          metadata?: Json | null
          size_bytes?: number | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_activity_at: string | null
          metadata: Json
          preview_status: string | null
          preview_url: string | null
          project_id: string
          status: Database["public"]["Enums"]["workspace_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_activity_at?: string | null
          metadata?: Json
          preview_status?: string | null
          preview_url?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["workspace_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_activity_at?: string | null
          metadata?: Json
          preview_status?: string | null
          preview_url?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["workspace_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_metadata?: Json
          p_transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          p_user_id: string
        }
        Returns: {
          message: string
          new_balance: number
          success: boolean
        }[]
      }
      apply_file_operation: { Args: { p_operation_id: string }; Returns: Json }
      check_ai_rate_limit: {
        Args: {
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      claim_daily_bonus: {
        Args: { p_user_id: string }
        Returns: {
          credits_added: number
          message: string
          success: boolean
        }[]
      }
      deduct_credits: {
        Args: {
          p_action_type: Database["public"]["Enums"]["credit_action_type"]
          p_description?: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: {
          message: string
          remaining_credits: number
          success: boolean
        }[]
      }
      get_action_credit_cost: {
        Args: {
          p_action_type: Database["public"]["Enums"]["credit_action_type"]
        }
        Returns: number
      }
      get_or_create_workspace: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: string
      }
      get_user_total_credits: { Args: { p_user_id: string }; Returns: number }
      user_has_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      build_status: "pending" | "building" | "completed" | "failed"
      credit_action_type:
        | "question_answer"
        | "page_creation"
        | "component_generation"
        | "code_export"
        | "ai_chat"
        | "image_generation"
        | "deployment"
      credit_transaction_type:
        | "subscription"
        | "topup"
        | "daily_bonus"
        | "rollover"
        | "usage"
        | "refund"
        | "admin_adjustment"
      file_operation_type: "create" | "update" | "delete" | "rename" | "move"
      generation_session_status:
        | "pending"
        | "planning"
        | "scaffolding"
        | "generating"
        | "validating"
        | "completed"
        | "failed"
      project_status: "building" | "ready" | "failed"
      subscription_plan_type: "free" | "pro" | "business" | "enterprise"
      workspace_status:
        | "initializing"
        | "ready"
        | "generating"
        | "error"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      build_status: ["pending", "building", "completed", "failed"],
      credit_action_type: [
        "question_answer",
        "page_creation",
        "component_generation",
        "code_export",
        "ai_chat",
        "image_generation",
        "deployment",
      ],
      credit_transaction_type: [
        "subscription",
        "topup",
        "daily_bonus",
        "rollover",
        "usage",
        "refund",
        "admin_adjustment",
      ],
      file_operation_type: ["create", "update", "delete", "rename", "move"],
      generation_session_status: [
        "pending",
        "planning",
        "scaffolding",
        "generating",
        "validating",
        "completed",
        "failed",
      ],
      project_status: ["building", "ready", "failed"],
      subscription_plan_type: ["free", "pro", "business", "enterprise"],
      workspace_status: [
        "initializing",
        "ready",
        "generating",
        "error",
        "archived",
      ],
    },
  },
} as const
