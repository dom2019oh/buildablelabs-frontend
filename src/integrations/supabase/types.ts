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
          status: Database["public"]["Enums"]["project_status"]
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
          status?: Database["public"]["Enums"]["project_status"]
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
          status?: Database["public"]["Enums"]["project_status"]
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
      project_status: "building" | "ready" | "failed"
      subscription_plan_type: "free" | "pro" | "business" | "enterprise"
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
      project_status: ["building", "ready", "failed"],
      subscription_plan_type: ["free", "pro", "business", "enterprise"],
    },
  },
} as const
