export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Migration 0010 (programs.kind/included_in_plan/whatsapp_url/sort_order,
// access_codes.whatsapp_url, program_sections, lessons, lesson_contents,
// lesson_attachments, lesson_completions, plan_rank, has_program_access,
// program_whatsapp_url) ist VON HAND ERGÄNZT — nach dem Einspielen mit
// generate_typescript_types neu erzeugen. Dasselbe gilt für Migration 0011
// (posts, news_state, can_read_post) und Migration 0013 (Miteinander:
// member_profiles, connection_requests, challenges, meetups, community_blocks
// und ihre Funktionen).
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
          whatsapp_url: string | null
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
          whatsapp_url?: string | null
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
          whatsapp_url?: string | null
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
      day_completions: {
        Row: {
          completed_at: string
          day_number: number
          program_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          day_number: number
          program_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          day_number?: number
          program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_completions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_completions_user_id_fkey"
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
      events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string | null
          description: Json | null
          ends_at: string | null
          id: string
          kind: string
          location: string | null
          program_id: string | null
          series_id: string | null
          starts_at: string
          title: Json
          updated_at: string | null
          visibility: string
          website_link: string | null
          zoom_url: string | null
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: Json | null
          ends_at?: string | null
          id?: string
          kind: string
          location?: string | null
          program_id?: string | null
          series_id?: string | null
          starts_at: string
          title: Json
          updated_at?: string | null
          visibility?: string
          website_link?: string | null
          zoom_url?: string | null
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: Json | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          program_id?: string | null
          series_id?: string | null
          starts_at?: string
          title?: Json
          updated_at?: string | null
          visibility?: string
          website_link?: string | null
          zoom_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
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
      lesson_attachments: {
        Row: {
          id: string
          kind: string
          lesson_id: string
          sort_order: number
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          id?: string
          kind?: string
          lesson_id: string
          sort_order?: number
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          id?: string
          kind?: string
          lesson_id?: string
          sort_order?: number
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_contents: {
        Row: {
          body_md: string | null
          lesson_id: string
          updated_at: string
          video_guid: string | null
        }
        Insert: {
          body_md?: string | null
          lesson_id: string
          updated_at?: string
          video_guid?: string | null
        }
        Update: {
          body_md?: string | null
          lesson_id?: string
          updated_at?: string
          video_guid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_contents_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          duration_seconds: number | null
          event_id: string | null
          id: string
          media_kind: string
          program_id: string
          published_at: string | null
          section_id: string | null
          slug: string
          sort_order: number
          subtitle: string | null
          title: string
          unlock_day: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          event_id?: string | null
          id?: string
          media_kind?: string
          program_id: string
          published_at?: string | null
          section_id?: string | null
          slug: string
          sort_order?: number
          subtitle?: string | null
          title: string
          unlock_day?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          event_id?: string | null
          id?: string
          media_kind?: string
          program_id?: string
          published_at?: string | null
          section_id?: string | null
          slug?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          unlock_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "program_sections"
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
      // Migration 0011 (posts, news_state) · VON HAND ERGÄNZT — nach dem
      // Einspielen mit generate_typescript_types neu erzeugen.
      posts: {
        Row: {
          audience: string
          body_md: string | null
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          video_guid: string | null
        }
        Insert: {
          audience?: string
          body_md?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          video_guid?: string | null
        }
        Update: {
          audience?: string
          body_md?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          video_guid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      // Migration 0013 (Miteinander) · VON HAND ERGÄNZT — nach dem Einspielen
      // mit generate_typescript_types neu erzeugen. Achtung: Die Row-Typen
      // listen alle Spalten, aber phone/whatsapp_url/exact_place/
      // hidden_by_admin/closed_by_admin sind für authenticated teils nicht
      // lesbar oder schreibbar (Spalten-Grants, RLS). Immer mit expliziter
      // Spaltenliste lesen, nie select('*') auf challenges/meetups.
      member_profiles: {
        Row: {
          about: string | null
          display_name: string | null
          open_for: string[]
          phone: string | null
          region: string | null
          updated_at: string
          user_id: string
          visible: boolean
        }
        Insert: {
          about?: string | null
          display_name?: string | null
          open_for?: string[]
          phone?: string | null
          region?: string | null
          updated_at?: string
          user_id: string
          visible?: boolean
        }
        Update: {
          about?: string | null
          display_name?: string | null
          open_for?: string[]
          phone?: string | null
          region?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      // Migration 0014 (Live-Ergänzungen) · von Hand ergänzt.
      event_questions: {
        Row: { body: string; created_at: string; event_id: string; id: string; user_id: string }
        Insert: { body: string; created_at?: string; event_id: string; id?: string; user_id: string }
        Update: { body?: string; created_at?: string; event_id?: string; id?: string; user_id?: string }
        Relationships: []
      }
      community_blocks: {
        Row: { created_at: string; created_by: string | null; reason: string | null; user_id: string }
        Insert: { created_at?: string; created_by?: string | null; reason?: string | null; user_id: string }
        Update: { created_at?: string; created_by?: string | null; reason?: string | null; user_id?: string }
        Relationships: []
      }
      connection_requests: {
        Row: {
          answered_at: string | null
          created_at: string
          from_user: string
          id: string
          message: string
          status: string
          to_user: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          from_user: string
          id?: string
          message: string
          status?: string
          to_user: string
        }
        Update: {
          answered_at?: string | null
          status?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          area: string
          closed_by_admin: boolean
          created_at: string
          created_by: string
          description: string | null
          ends_on: string
          id: string
          max_members: number | null
          starts_on: string
          status: string
          title: string
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          area?: string
          created_by: string
          description?: string | null
          ends_on: string
          max_members?: number | null
          starts_on: string
          title: string
          whatsapp_url?: string | null
        }
        Update: {
          area?: string
          description?: string | null
          ends_on?: string
          max_members?: number | null
          starts_on?: string
          status?: string
          title?: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      challenge_members: {
        Row: { challenge_id: string; joined_at: string; user_id: string }
        Insert: { challenge_id: string; joined_at?: string; user_id: string }
        Update: { challenge_id?: string; joined_at?: string; user_id?: string }
        Relationships: []
      }
      meetups: {
        Row: {
          closed_by_admin: boolean
          created_at: string
          created_by: string
          description: string | null
          exact_place: string | null
          id: string
          max_people: number | null
          online: boolean
          place_hint: string | null
          region: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_by: string
          description?: string | null
          exact_place?: string | null
          max_people?: number | null
          online?: boolean
          place_hint?: string | null
          region?: string | null
          starts_at: string
          title: string
        }
        Update: {
          description?: string | null
          exact_place?: string | null
          max_people?: number | null
          online?: boolean
          place_hint?: string | null
          region?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetup_attendees: {
        Row: { joined_at: string; meetup_id: string; user_id: string }
        Insert: { joined_at?: string; meetup_id: string; user_id: string }
        Update: { joined_at?: string; meetup_id?: string; user_id?: string }
        Relationships: []
      }
      news_state: {
        Row: {
          seen_at: string
          user_id: string
        }
        Insert: {
          seen_at?: string
          user_id: string
        }
        Update: {
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_handpan_id: string | null
          brevo_synced_at: string | null
          created_at: string | null
          current_level: number | null
          current_streak: number | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          last_practice_date: string | null
          longest_streak: number | null
          marketing_consent_at: string | null
          marketing_consent_text_version: string | null
          plan: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          active_handpan_id?: string | null
          brevo_synced_at?: string | null
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          last_practice_date?: string | null
          longest_streak?: number | null
          marketing_consent_at?: string | null
          marketing_consent_text_version?: string | null
          plan?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          active_handpan_id?: string | null
          brevo_synced_at?: string | null
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          last_practice_date?: string | null
          longest_streak?: number | null
          marketing_consent_at?: string | null
          marketing_consent_text_version?: string | null
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
      program_sections: {
        Row: {
          id: string
          program_id: string
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          id?: string
          program_id: string
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          id?: string
          program_id?: string
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_sections_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
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
          kind: string
          included_in_plan: string | null
          whatsapp_url: string | null
          sort_order: number
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
          kind?: string
          included_in_plan?: string | null
          whatsapp_url?: string | null
          sort_order?: number
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
          kind?: string
          included_in_plan?: string | null
          whatsapp_url?: string | null
          sort_order?: number
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
      claim_pending_enrollments: { Args: Record<string, never>; Returns: Json }
      event_zoom_url: { Args: { p_event_id: string }; Returns: string }
      // Migration 0014 (Live-Ergänzungen) · von Hand ergänzt.
      has_event_access: { Args: { p_event_id: string }; Returns: boolean }
      submit_event_question: { Args: { p_event_id: string; p_body: string }; Returns: string }
      withdraw_event_question: { Args: { p_question_id: string }; Returns: boolean }
      link_event_recording: {
        Args: { p_event_id: string; p_program_id: string; p_video_guid: string; p_title: string }
        Returns: string
      }
      grant_enrollment_by_email: {
        Args: {
          p_email: string
          p_program_slug: string
          p_drip_start?: string | null
          p_session_id?: string | null
        }
        Returns: Json
      }
      is_admin_user: { Args: { check_uid: string }; Returns: boolean }
      // Migration 0010 · von Hand ergänzt, nach dem Einspielen mit
      // generate_typescript_types neu erzeugen.
      plan_rank: { Args: { p_plan: string | null }; Returns: number }
      has_program_access: { Args: { p_program_id: string }; Returns: boolean }
      program_whatsapp_url: { Args: { p_program_id: string }; Returns: string | null }
      // Migration 0011 · von Hand ergänzt.
      can_read_post: { Args: { p_audience: string }; Returns: boolean }
      // Migration 0013 (Miteinander) · von Hand ergänzt.
      is_community_member: { Args: Record<string, never>; Returns: boolean }
      community_blocked: { Args: Record<string, never>; Returns: boolean }
      list_members: {
        Args: { p_search?: string | null }
        Returns: {
          user_id: string
          display_name: string
          region: string | null
          about: string | null
          open_for: string[]
          updated_at: string
        }[]
      }
      get_member: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          display_name: string
          region: string | null
          about: string | null
          open_for: string[]
          visible: boolean
        }[]
      }
      // Lieder (0015)
      is_song_member: { Args: Record<string, never>; Returns: boolean }
      list_songs: {
        Args: { p_scope?: string }
        Returns: {
          id: string
          title: string
          artist: string | null
          difficulty: string
          handpan: string | null
          bpm: number | null
          measures: number | null
          status: string
          review_note: string | null
          author_name: string
          is_mine: boolean
          updated_at: string
        }[]
      }
      get_song: {
        Args: { p_id: string }
        Returns: {
          id: string
          title: string
          artist: string | null
          difficulty: string
          handpan: string | null
          status: string
          review_note: string | null
          author_name: string
          is_mine: boolean
          data: Json
          updated_at: string
        }[]
      }
      submit_song: {
        Args: {
          p_id: string | null
          p_title: string
          p_artist: string
          p_difficulty: string
          p_handpan: string
          p_bpm: number
          p_measures: number
          p_data: Json
          p_own_work: boolean
        }
        Returns: string
      }
      delete_song: { Args: { p_id: string }; Returns: undefined }
      admin_review_song: { Args: { p_id: string; p_approve: boolean; p_note?: string | null }; Returns: undefined }
      request_connection: { Args: { p_to_user: string; p_message: string }; Returns: string }
      answer_connection: { Args: { p_request_id: string; p_accept: boolean }; Returns: string }
      withdraw_connection: { Args: { p_request_id: string }; Returns: undefined }
      end_connection: { Args: { p_request_id: string }; Returns: undefined }
      my_connection_requests: {
        Args: Record<string, never>
        Returns: {
          id: string
          direction: string
          other_user: string
          other_name: string
          message: string
          status: string
          created_at: string
          answered_at: string | null
        }[]
      }
      connection_phone: { Args: { p_other_user: string }; Returns: string | null }
      join_challenge: { Args: { p_challenge_id: string }; Returns: undefined }
      leave_challenge: { Args: { p_challenge_id: string }; Returns: undefined }
      challenge_whatsapp_url: { Args: { p_challenge_id: string }; Returns: string | null }
      challenge_people: {
        Args: { p_challenge_id: string }
        Returns: {
          user_id: string
          display_name: string
          is_creator: boolean
          profile_visible: boolean
          joined_at: string
        }[]
      }
      admin_close_challenge: { Args: { p_challenge_id: string; p_closed: boolean }; Returns: undefined }
      join_meetup: { Args: { p_meetup_id: string }; Returns: undefined }
      leave_meetup: { Args: { p_meetup_id: string }; Returns: undefined }
      meetup_exact_place: { Args: { p_meetup_id: string }; Returns: string | null }
      meetup_people: {
        Args: { p_meetup_id: string }
        Returns: {
          user_id: string
          display_name: string
          is_creator: boolean
          profile_visible: boolean
          joined_at: string
        }[]
      }
      admin_close_meetup: { Args: { p_meetup_id: string; p_closed: boolean }; Returns: undefined }
      admin_hide_member: { Args: { p_user_id: string; p_hidden: boolean }; Returns: undefined }
      set_membership_by_customer: {
        Args: { p_customer_id: string; p_email: string; p_active: boolean }
        Returns: Json
      }
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
