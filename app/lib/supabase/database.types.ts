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
      access_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          drip_start_date: string | null
          expires_at: string | null
          id: string
          max_uses: number
          note: string | null
          program_id: string
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          drip_start_date?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          note?: string | null
          program_id: string
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          drip_start_date?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          note?: string | null
          program_id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      completions: {
        Row: {
          completed_at: string | null
          exercise_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          exercise_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          exercise_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          day: string
          user_id: string
        }
        Insert: {
          day: string
          user_id: string
        }
        Update: {
          day?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          access_code_id: string | null
          drip_start_date: string | null
          program_id: string
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          access_code_id?: string | null
          drip_start_date?: string | null
          program_id: string
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          access_code_id?: string | null
          drip_start_date?: string | null
          program_id?: string
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string | null
          day_number: number | null
          id: string
          kind: string
          pattern_data: Json | null
          position: number
          program_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          day_number?: number | null
          id?: string
          kind: string
          pattern_data?: Json | null
          position: number
          program_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          day_number?: number | null
          id?: string
          kind?: string
          pattern_data?: Json | null
          position?: number
          program_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      handpans: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: Json
          scale_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes: Json
          scale_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: Json
          scale_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handpans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patterns: {
        Row: {
          bpm: number | null
          category: string | null
          created_at: string | null
          grid: number[]
          id: string
          level: number | null
          name: string
          tags: string[] | null
          tier: string | null
        }
        Insert: {
          bpm?: number | null
          category?: string | null
          created_at?: string | null
          grid: number[]
          id?: string
          level?: number | null
          name: string
          tags?: string[] | null
          tier?: string | null
        }
        Update: {
          bpm?: number | null
          category?: string | null
          created_at?: string | null
          grid?: number[]
          id?: string
          level?: number | null
          name?: string
          tags?: string[] | null
          tier?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_handpan_id: string | null
          created_at: string | null
          current_level: number | null
          current_streak: number | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          last_practice_date: string | null
          longest_streak: number | null
          plan: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          active_handpan_id?: string | null
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          last_practice_date?: string | null
          longest_streak?: number | null
          plan?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          active_handpan_id?: string | null
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          last_practice_date?: string | null
          longest_streak?: number | null
          plan?: string | null
          stripe_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_handpan_id_fkey"
            columns: ["active_handpan_id"]
            isOneToOne: false
            referencedRelation: "handpans"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          level: string
          published_at: string | null
          slug: string
          title: string
          total_exercises: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          level: string
          published_at?: string | null
          slug: string
          title: string
          total_exercises?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          level?: string
          published_at?: string | null
          slug?: string
          title?: string
          total_exercises?: number | null
        }
        Relationships: []
      }
      saved_patterns: {
        Row: {
          bpm: number | null
          created_at: string | null
          forked_from_id: string | null
          handsatz: string | null
          id: string
          is_public: boolean | null
          name: string
          notation: string
          notes: string | null
          subdivision: string
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bpm?: number | null
          created_at?: string | null
          forked_from_id?: string | null
          handsatz?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          notation: string
          notes?: string | null
          subdivision?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bpm?: number | null
          created_at?: string | null
          forked_from_id?: string | null
          handsatz?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          notation?: string
          notes?: string | null
          subdivision?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_patterns_forked_from_id_fkey"
            columns: ["forked_from_id"]
            isOneToOne: false
            referencedRelation: "saved_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_logs: {
        Row: {
          bpm: number | null
          completed: boolean | null
          duration_seconds: number | null
          exercise_id: string | null
          id: string
          note: string | null
          pattern_id: string | null
          practiced_at: string | null
          program_id: string | null
          rating: string | null
          user_id: string | null
        }
        Insert: {
          bpm?: number | null
          completed?: boolean | null
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          note?: string | null
          pattern_id?: string | null
          practiced_at?: string | null
          program_id?: string | null
          rating?: string | null
          user_id?: string | null
        }
        Update: {
          bpm?: number | null
          completed?: boolean | null
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          note?: string | null
          pattern_id?: string | null
          practiced_at?: string | null
          program_id?: string | null
          rating?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_logs_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_user: { Args: { check_uid: string }; Returns: boolean }
      redeem_access_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
