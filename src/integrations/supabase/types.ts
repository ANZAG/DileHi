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
      announcement_files: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          name: string
          storage_path: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          name: string
          storage_path: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          name?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_files_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_replies: {
        Row: {
          announcement_id: string
          content: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          announcement_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_replies_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          created_at: string
          election_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          election_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          election_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      contact_replies: {
        Row: {
          contact_message_id: string
          created_at: string
          id: string
          message: string
          replied_by: string
        }
        Insert: {
          contact_message_id: string
          created_at?: string
          id?: string
          message: string
          replied_by: string
        }
        Update: {
          contact_message_id?: string
          created_at?: string
          id?: string
          message?: string
          replied_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_replies_contact_message_id_fkey"
            columns: ["contact_message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_rates: {
        Row: {
          amount: number
          id: string
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          amount: number
          id?: string
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          amount?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number | null
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
          year: number
        }
        Insert: {
          amount?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          year: number
        }
        Update: {
          amount?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          id: string
          storage_path: string
          title: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          id?: string
          storage_path: string
          title: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          id?: string
          storage_path?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      election_audit_log: {
        Row: {
          deleted_at: string
          deleted_by: string
          election_description: string | null
          election_title: string
          group_title: string | null
          id: string
          result_snapshot: Json | null
          total_votes: number | null
        }
        Insert: {
          deleted_at?: string
          deleted_by: string
          election_description?: string | null
          election_title: string
          group_title?: string | null
          id?: string
          result_snapshot?: Json | null
          total_votes?: number | null
        }
        Update: {
          deleted_at?: string
          deleted_by?: string
          election_description?: string | null
          election_title?: string
          group_title?: string | null
          id?: string
          result_snapshot?: Json | null
          total_votes?: number | null
        }
        Relationships: []
      }
      election_groups: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string
          id: string
          status: string
          title: string
          votes_per_member: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          status?: string
          title: string
          votes_per_member?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          title?: string
          votes_per_member?: number
        }
        Relationships: []
      }
      elections: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          group_id: string | null
          id: string
          status: string
          title: string
          type: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          group_id?: string | null
          id?: string
          status?: string
          title: string
          type?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "elections_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "election_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      epoch_sources: {
        Row: {
          created_at: string
          created_by: string | null
          epoch: string
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          epoch?: string
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          epoch?: string
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: []
      }
      epoch_visitor_items: {
        Row: {
          created_at: string
          created_by: string | null
          epoch: string
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          epoch?: string
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          epoch?: string
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_form_answers: {
        Row: {
          created_at: string
          field_id: string
          id: string
          response_id: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          response_id: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          response_id?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_form_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "event_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "event_form_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      event_form_fields: {
        Row: {
          created_at: string
          description: string | null
          form_id: string
          id: string
          label: string
          options: Json | null
          required: boolean
          settings: Json | null
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_id: string
          id?: string
          label: string
          options?: Json | null
          required?: boolean
          settings?: Json | null
          sort_order?: number
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          form_id?: string
          id?: string
          label?: string
          options?: Json | null
          required?: boolean
          settings?: Json | null
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      event_form_responses: {
        Row: {
          created_at: string
          form_id: string
          id: string
          respondent_email: string | null
          respondent_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          respondent_email?: string | null
          respondent_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          respondent_email?: string | null
          respondent_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      event_forms: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_id: string
          id: string
          is_open: boolean
          public_token: string | null
          settings: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_id: string
          id?: string
          is_open?: boolean
          public_token?: string | null
          settings?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_id?: string
          id?: string
          is_open?: boolean
          public_token?: string | null
          settings?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          is_public: boolean
          location: string | null
          location_lat: number | null
          location_lng: number | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          alt_text: string
          created_at: string
          created_by: string
          epoch: string
          id: string
          show_subtitle: boolean
          storage_path: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          created_by: string
          epoch?: string
          id?: string
          show_subtitle?: boolean
          storage_path: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          created_by?: string
          epoch?: string
          id?: string
          show_subtitle?: boolean
          storage_path?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          represented_by: string | null
          user_id: string
          vote_count: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          represented_by?: string | null
          user_id: string
          vote_count?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          represented_by?: string | null
          user_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "election_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      member_tents: {
        Row: {
          created_at: string
          diameter: number | null
          guy_rope: number
          id: string
          length: number | null
          name: string
          shape: string
          tent_type: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          diameter?: number | null
          guy_rope?: number
          id?: string
          length?: number | null
          name?: string
          shape?: string
          tent_type: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          diameter?: number | null
          guy_rope?: number
          id?: string
          length?: number | null
          name?: string
          shape?: string
          tent_type?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_tents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_files: {
        Row: {
          created_at: string
          id: string
          name: string
          storage_path: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          storage_path: string
          uploaded_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          storage_path?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birthdate: string | null
          calendar_token: string | null
          city: string | null
          contribution_interval: string | null
          created_at: string
          display_name: string
          entry_date: string | null
          exit_date: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          map_lat: number | null
          map_lng: number | null
          membership_type: string | null
          phone: string | null
          salutation: string | null
          show_on_map: boolean
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          birthdate?: string | null
          calendar_token?: string | null
          city?: string | null
          contribution_interval?: string | null
          created_at?: string
          display_name?: string
          entry_date?: string | null
          exit_date?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          map_lat?: number | null
          map_lng?: number | null
          membership_type?: string | null
          phone?: string | null
          salutation?: string | null
          show_on_map?: boolean
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          birthdate?: string | null
          calendar_token?: string | null
          city?: string | null
          contribution_interval?: string | null
          created_at?: string
          display_name?: string
          entry_date?: string | null
          exit_date?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          map_lat?: number | null
          map_lng?: number | null
          membership_type?: string | null
          phone?: string | null
          salutation?: string | null
          show_on_map?: boolean
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      representation_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string
          details: string
          group_id: string
          id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by: string
          details: string
          group_id: string
          id?: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string
          details?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "representation_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "election_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      site_images: {
        Row: {
          alt_text: string
          id: string
          label: string
          page: string
          slot: string
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alt_text?: string
          id?: string
          label: string
          page: string
          slot: string
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alt_text?: string
          id?: string
          label?: string
          page?: string
          slot?: string
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      source_folders: {
        Row: {
          created_at: string
          created_by: string
          epoch: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          epoch: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          epoch?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "source_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          epoch: string
          file_path: string | null
          folder_id: string | null
          id: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          epoch: string
          file_path?: string | null
          folder_id?: string | null
          id?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          epoch?: string
          file_path?: string | null
          folder_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "source_folders"
            referencedColumns: ["id"]
          },
        ]
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
      votes: {
        Row: {
          candidate_id: string
          created_at: string
          election_id: string
          id: string
          voter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          election_id: string
          id?: string
          voter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          election_id?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      election_results: {
        Row: {
          candidate_id: string | null
          candidate_name: string | null
          election_id: string | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_vote: {
        Args: { _election_id: string; _user_id: string }
        Returns: boolean
      }
      cast_votes: {
        Args: { _election_id: string; _voter_id: string; _votes: Json }
        Returns: undefined
      }
      count_members: { Args: never; Returns: number }
      get_form_by_token: { Args: { _token: string }; Returns: Json }
      get_member_directory: {
        Args: never
        Returns: {
          display_name: string
          id: string
          is_active: boolean
        }[]
      }
      get_user_permissions: { Args: { _user_id: string }; Returns: string[] }
      get_user_vote_count: {
        Args: { _election_id: string; _user_id: string }
        Returns: number
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_voted: {
        Args: { _election_id: string; _user_id: string }
        Returns: boolean
      }
      is_herold: { Args: { _user_id: string }; Returns: boolean }
      is_member: { Args: { _user_id: string }; Returns: boolean }
      is_schatzmeister: { Args: { _user_id: string }; Returns: boolean }
      is_vorstand: { Args: { _user_id: string }; Returns: boolean }
      submit_form_response: {
        Args: { _answers: Json; _email: string; _name: string; _token: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "vorstand" | "mitglied" | "herold" | "schatzmeister"
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
      app_role: ["vorstand", "mitglied", "herold", "schatzmeister"],
    },
  },
} as const
