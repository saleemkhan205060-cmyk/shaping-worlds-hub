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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_failed_logins: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_login_history: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          body: string
          broadcast: boolean
          created_at: string
          id: string
          sent_by: string | null
          target_user_ids: string[] | null
          title: string
        }
        Insert: {
          body: string
          broadcast?: boolean
          created_at?: string
          id?: string
          sent_by?: string | null
          target_user_ids?: string[] | null
          title: string
        }
        Update: {
          body?: string
          broadcast?: boolean
          created_at?: string
          id?: string
          sent_by?: string | null
          target_user_ids?: string[] | null
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          app_name: string
          banner_url: string | null
          contact_email: string | null
          contact_phone: string | null
          id: number
          logo_url: string | null
          maintenance_mode: boolean
          privacy_policy: string | null
          terms: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          app_name?: string
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          privacy_policy?: string | null
          terms?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          app_name?: string
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          privacy_policy?: string | null
          terms?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      market_products: {
        Row: {
          affiliate_url: string | null
          category: string | null
          created_at: string
          description: string | null
          hashtags: string[] | null
          id: string
          image_url: string
          is_private: boolean
          old_price: number | null
          price: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          image_url: string
          is_private?: boolean
          old_price?: number | null
          price?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          image_url?: string
          is_private?: boolean
          old_price?: number | null
          price?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marriage_profiles: {
        Row: {
          about: string | null
          age: number | null
          country: string | null
          created_at: string
          id: string
          looking_for: string | null
          marital_status: string | null
          profession: string | null
          religion: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          age?: number | null
          country?: string | null
          created_at?: string
          id?: string
          looking_for?: string | null
          marital_status?: string | null
          profession?: string | null
          religion?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          age?: number | null
          country?: string | null
          created_at?: string
          id?: string
          looking_for?: string | null
          marital_status?: string | null
          profession?: string | null
          religion?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      moderation_logs: {
        Row: {
          ai_raw: Json | null
          caption: string | null
          category: string | null
          created_at: string
          id: string
          is_private: boolean
          media_path: string | null
          media_type: string
          media_url: string
          published_post_id: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_raw?: Json | null
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_private?: boolean
          media_path?: string | null
          media_type: string
          media_url: string
          published_post_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_raw?: Json | null
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_private?: boolean
          media_path?: string | null
          media_type?: string
          media_url?: string
          published_post_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_rules: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          rule: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          rule: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          rule?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          auto_flag_reason: string | null
          content: string
          created_at: string
          id: string
          is_hidden: boolean
          post_id: string
          user_id: string
        }
        Insert: {
          auto_flag_reason?: string | null
          content: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          post_id: string
          user_id: string
        }
        Update: {
          auto_flag_reason?: string | null
          content?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
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
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          auto_flag_reason: string | null
          caption: string | null
          category: string | null
          created_at: string
          id: string
          is_hidden: boolean
          is_pinned: boolean
          is_private: boolean
          media_type: string
          media_url: string | null
          text_style: Json | null
          thumbnail_title: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_flag_reason?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          is_private?: boolean
          media_type: string
          media_url?: string | null
          text_style?: Json | null
          thumbnail_title?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_flag_reason?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          is_private?: boolean
          media_type?: string
          media_url?: string | null
          text_style?: Json | null
          thumbnail_title?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          product_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          product_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          product_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      profile_about: {
        Row: {
          country: string
          created_at: string
          dob: string
          education: string
          email: string
          email_private: boolean
          gender: string
          is_public: boolean
          languages: string
          marital_status: string
          mobile: string
          mobile_private: boolean
          profession: string
          updated_at: string
          user_id: string
          user_name: string
          website: string
        }
        Insert: {
          country?: string
          created_at?: string
          dob?: string
          education?: string
          email?: string
          email_private?: boolean
          gender?: string
          is_public?: boolean
          languages?: string
          marital_status?: string
          mobile?: string
          mobile_private?: boolean
          profession?: string
          updated_at?: string
          user_id: string
          user_name?: string
          website?: string
        }
        Update: {
          country?: string
          created_at?: string
          dob?: string
          education?: string
          email?: string
          email_private?: boolean
          gender?: string
          is_public?: boolean
          languages?: string
          marital_status?: string
          mobile?: string
          mobile_private?: boolean
          profession?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          website?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_flag_reason: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_banned: boolean
          is_suspended: boolean
          is_verified: boolean
          location: string | null
          suspended_until: string | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          auto_flag_reason?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_banned?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          location?: string | null
          suspended_until?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          auto_flag_reason?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          location?: string | null
          suspended_until?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profile_about_public: {
        Row: {
          country: string | null
          created_at: string | null
          dob: string | null
          education: string | null
          email: string | null
          email_private: boolean | null
          gender: string | null
          is_public: boolean | null
          languages: string | null
          marital_status: string | null
          mobile: string | null
          mobile_private: boolean | null
          profession: string | null
          updated_at: string | null
          user_id: string | null
          user_name: string | null
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          dob?: string | null
          education?: string | null
          email?: never
          email_private?: boolean | null
          gender?: string | null
          is_public?: boolean | null
          languages?: string | null
          marital_status?: string | null
          mobile?: never
          mobile_private?: boolean | null
          profession?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          dob?: string | null
          education?: string | null
          email?: never
          email_private?: boolean | null
          gender?: string | null
          is_public?: boolean | null
          languages?: string | null
          marital_status?: string | null
          mobile?: never
          mobile_private?: boolean | null
          profession?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      actor_is_staff: { Args: { _uid: string }; Returns: boolean }
      classify_risky_text: { Args: { _t: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin"
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
      app_role: ["user", "moderator", "admin"],
    },
  },
} as const
