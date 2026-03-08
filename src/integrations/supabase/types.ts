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
      gallery_images: {
        Row: {
          alt_text: string
          created_at: string
          created_by: string
          epoch: string
          id: string
          storage_path: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          created_by: string
          epoch?: string
          id?: string
          storage_path: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          created_by?: string
          epoch?: string
          id?: string
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
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
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
      get_user_vote_count: {
        Args: { _election_id: string; _user_id: string }
        Returns: number
      }
      has_voted: {
        Args: { _election_id: string; _user_id: string }
        Returns: boolean
      }
      is_herold: { Args: { _user_id: string }; Returns: boolean }
      is_member: { Args: { _user_id: string }; Returns: boolean }
      is_vorstand: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "vorstand" | "mitglied" | "herold"
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
      app_role: ["vorstand", "mitglied", "herold"],
    },
  },
} as const
