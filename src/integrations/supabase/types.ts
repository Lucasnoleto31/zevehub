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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          device_info: string | null
          id: string
          ip_address: string | null
          login_at: string
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_info?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_info?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      account_transfers: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          from_account_id: string
          id: string
          to_account_id: string
          transfer_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          from_account_id: string
          id?: string
          to_account_id: string
          transfer_date: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          from_account_id?: string
          id?: string
          to_account_id?: string
          transfer_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badge_progress: {
        Row: {
          badge_type: string
          created_at: string
          current_progress: number
          id: string
          target_progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_type: string
          created_at?: string
          current_progress?: number
          id?: string
          target_progress: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          current_progress?: number
          id?: string
          target_progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bankroll_management: {
        Row: {
          created_at: string
          current_capital: number
          id: string
          initial_capital: number
          max_daily_loss_percentage: number
          risk_percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_capital: number
          id?: string
          initial_capital: number
          max_daily_loss_percentage?: number
          risk_percentage?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_capital?: number
          id?: string
          initial_capital?: number
          max_daily_loss_percentage?: number
          risk_percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          alert_threshold: number | null
          budget_amount: number
          category: string
          created_at: string | null
          id: string
          month: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_threshold?: number | null
          budget_amount: number
          category: string
          created_at?: string | null
          id?: string
          month: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_threshold?: number | null
          budget_amount?: number
          category?: string
          created_at?: string | null
          id?: string
          month?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_bots: {
        Row: {
          bot_name: string
          created_at: string
          id: string
          performance_percentage: number | null
          status: string | null
          updated_at: string
          user_id: string
          volume_operated: number | null
        }
        Insert: {
          bot_name: string
          created_at?: string
          id?: string
          performance_percentage?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
          volume_operated?: number | null
        }
        Update: {
          bot_name?: string
          created_at?: string
          id?: string
          performance_percentage?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
          volume_operated?: number | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes: number
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes?: number
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          balance: number
          color: string | null
          created_at: string | null
          currency: string
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          color?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          color?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean | null
          priority: string | null
          read: boolean | null
          title: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          priority?: string | null
          read?: boolean | null
          title: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          priority?: string | null
          read?: boolean | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          operation_id: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          operation_id?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          operation_id?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "trading_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_finances: {
        Row: {
          account_id: string | null
          amount: number
          attachment_url: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          tags: string[] | null
          title: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          attachment_url?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title: string
          transaction_date: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          attachment_url?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_finances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          is_read: boolean
          mentioned_by: string
          mentioned_user_id: string
          post_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_by: string
          mentioned_user_id: string
          post_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_by?: string
          mentioned_user_id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          post_id: string
          reason: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          post_id: string
          reason: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          post_id?: string
          reason?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_login_streak: number
          email: string
          full_name: string | null
          id: string
          investment_profile:
            | Database["public"]["Enums"]["investment_profile"]
            | null
          last_login: string | null
          last_login_date: string | null
          level: number
          phone: string | null
          points: number
          status: string | null
          totp_enabled: boolean | null
          totp_secret: string | null
          totp_verified_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_login_streak?: number
          email: string
          full_name?: string | null
          id: string
          investment_profile?:
            | Database["public"]["Enums"]["investment_profile"]
            | null
          last_login?: string | null
          last_login_date?: string | null
          level?: number
          phone?: string | null
          points?: number
          status?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          totp_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_login_streak?: number
          email?: string
          full_name?: string | null
          id?: string
          investment_profile?:
            | Database["public"]["Enums"]["investment_profile"]
            | null
          last_login?: string | null
          last_login_date?: string | null
          level?: number
          phone?: string | null
          points?: number
          status?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          totp_verified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string | null
          day_of_month: number | null
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          next_execution_date: string
          start_date: string
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          created_at?: string | null
          day_of_month?: number | null
          description?: string | null
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          next_execution_date: string
          start_date: string
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string | null
          day_of_month?: number | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          next_execution_date?: string
          start_date?: string
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_goals: {
        Row: {
          created_at: string
          end_date: string
          goal_type: string
          id: string
          is_active: boolean | null
          period_type: string
          start_date: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          goal_type: string
          id?: string
          is_active?: boolean | null
          period_type: string
          start_date: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          goal_type?: string
          id?: string
          is_active?: boolean | null
          period_type?: string
          start_date?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_operations: {
        Row: {
          asset: string
          contracts: number
          costs: number
          created_at: string
          id: string
          notes: string | null
          operation_date: string
          operation_time: string
          result: number
          strategy: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset: string
          contracts: number
          costs?: number
          created_at?: string
          id?: string
          notes?: string | null
          operation_date: string
          operation_time: string
          result: number
          strategy?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset?: string
          contracts?: number
          costs?: number
          created_at?: string
          id?: string
          notes?: string | null
          operation_date?: string
          operation_time?: string
          result?: number
          strategy?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          granted_at: string
          granted_by: string | null
          id: string
          module_name: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          module_name: string
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          module_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_points: {
        Row: {
          created_at: string
          id: string
          points: number
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_award_badges: {
        Args: { p_user_id: string }
        Returns: {
          badge_description: string
          badge_id: string
          badge_name: string
          newly_awarded: boolean
        }[]
      }
      check_budget_status: {
        Args: { p_category: string; p_month: string; p_user_id: string }
        Returns: {
          alert_threshold: number
          budget_amount: number
          percentage: number
          should_alert: boolean
          spent_amount: number
        }[]
      }
      distinct_strategies: {
        Args: never
        Returns: {
          strategy: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_column: {
        Args: {
          column_name: string
          increment_value: number
          row_id: string
          table_name: string
        }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      process_mentions: {
        Args: {
          p_comment_id?: string
          p_content: string
          p_mentioned_by?: string
          p_post_id?: string
        }
        Returns: undefined
      }
      update_account_balance: {
        Args: { account_id: string; delta: number }
        Returns: undefined
      }
    }
    Enums: {
      investment_profile:
        | "start"
        | "perfil_1"
        | "perfil_2"
        | "perfil_5"
        | "perfil_10"
      user_role: "admin" | "vip" | "trader_ativo" | "parceiro" | "iniciante"
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
      investment_profile: [
        "start",
        "perfil_1",
        "perfil_2",
        "perfil_5",
        "perfil_10",
      ],
      user_role: ["admin", "vip", "trader_ativo", "parceiro", "iniciante"],
    },
  },
} as const
