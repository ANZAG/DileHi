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
      app_modules: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          label: string
          requires: string | null
          sort_order: number
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          label: string
          requires?: string | null
          sort_order?: number
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          label?: string
          requires?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_modules_requires_fkey"
            columns: ["requires"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["key"]
          },
        ]
      }
      app_settings: {
        Row: {
          logo_in_header: boolean
          bank_bic: string | null
          bank_iban: string | null
          bank_recipient: string | null
          contribution_model: string
          footer_legal_label: string
          footer_navigation_label: string
          board_members: string | null
          calendar_timezone: string
          color_dark: string
          color_primary: string
          favicon_path: string | null
          font_body: string
          font_headings: string
          forum_event_thread: string
          hosting_address: string | null
          hosting_provider: string | null
          id: boolean
          logo_path: string | null
          mail_from_address: string | null
          mail_from_name: string | null
          mail_reply_to: string | null
          mail_transport: string
          org_city: string | null
          org_country: string
          org_email: string | null
          org_name: string
          org_phone: string | null
          org_short_name: string
          org_street: string | null
          org_tagline: string | null
          org_zip: string | null
          privacy_contact: string | null
          privacy_officer: string | null
          register_court: string | null
          register_number: string | null
          seo_description: string | null
          seo_image_path: string | null
          updated_at: string
          updated_by: string | null
          vat_id: string | null
          website_url: string | null
        }
        Insert: {
          logo_in_header?: boolean
          bank_bic?: string | null
          bank_iban?: string | null
          bank_recipient?: string | null
          contribution_model?: string
          footer_legal_label?: string
          footer_navigation_label?: string
          board_members?: string | null
          calendar_timezone?: string
          color_dark?: string
          color_primary?: string
          favicon_path?: string | null
          font_body?: string
          font_headings?: string
          forum_event_thread?: string
          hosting_address?: string | null
          hosting_provider?: string | null
          id?: boolean
          logo_path?: string | null
          mail_from_address?: string | null
          mail_from_name?: string | null
          mail_reply_to?: string | null
          mail_transport?: string
          org_city?: string | null
          org_country?: string
          org_email?: string | null
          org_name?: string
          org_phone?: string | null
          org_short_name?: string
          org_street?: string | null
          org_tagline?: string | null
          org_zip?: string | null
          privacy_contact?: string | null
          privacy_officer?: string | null
          register_court?: string | null
          register_number?: string | null
          seo_description?: string | null
          seo_image_path?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_id?: string | null
          website_url?: string | null
        }
        Update: {
          logo_in_header?: boolean
          bank_bic?: string | null
          bank_iban?: string | null
          bank_recipient?: string | null
          contribution_model?: string
          footer_legal_label?: string
          footer_navigation_label?: string
          board_members?: string | null
          calendar_timezone?: string
          color_dark?: string
          color_primary?: string
          favicon_path?: string | null
          font_body?: string
          font_headings?: string
          forum_event_thread?: string
          hosting_address?: string | null
          hosting_provider?: string | null
          id?: boolean
          logo_path?: string | null
          mail_from_address?: string | null
          mail_from_name?: string | null
          mail_reply_to?: string | null
          mail_transport?: string
          org_city?: string | null
          org_country?: string
          org_email?: string | null
          org_name?: string
          org_phone?: string | null
          org_short_name?: string
          org_street?: string | null
          org_tagline?: string | null
          org_zip?: string | null
          privacy_contact?: string | null
          privacy_officer?: string | null
          register_court?: string | null
          register_number?: string | null
          seo_description?: string | null
          seo_image_path?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_id?: string | null
          website_url?: string | null
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
          category: string
          amount: number
          id: string
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          category?: string
          amount: number
          id?: string
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          category?: string
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
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
          edit_token: string | null
          form_id: string
          id: string
          respondent_email: string | null
          respondent_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          edit_token?: string | null
          form_id: string
          id?: string
          respondent_email?: string | null
          respondent_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          edit_token?: string | null
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
          forum_thread_wanted: boolean | null
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
          forum_thread_wanted?: boolean | null
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
          forum_thread_wanted?: boolean | null
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
      form_templates: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          id: string
          name: string
          settings: Json
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          name?: string
          settings?: Json
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          name?: string
          settings?: Json
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          is_event_room: boolean
          name: string
          only_auto_threads: boolean
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["forum_category_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_event_room?: boolean
          name: string
          only_auto_threads?: boolean
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["forum_category_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_event_room?: boolean
          name?: string
          only_auto_threads?: boolean
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["forum_category_status"]
        }
        Relationships: []
      }
      forum_category_roles: {
        Row: {
          can_reply: boolean
          can_start: boolean
          can_view: boolean
          category_id: string
          is_moderator: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_reply?: boolean
          can_start?: boolean
          can_view?: boolean
          category_id: string
          is_moderator?: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_reply?: boolean
          can_start?: boolean
          can_view?: boolean
          category_id?: string
          is_moderator?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "forum_category_roles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_drafts: {
        Row: {
          body: string
          category_id: string | null
          thread_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          category_id?: string | null
          thread_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category_id?: string | null
          thread_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_drafts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_poll_votes: {
        Row: {
          created_at: string
          note: string | null
          option_key: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          option_key: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          option_key?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_revisions: {
        Row: {
          body: string
          edited_at: string
          edited_by: string
          id: string
          post_id: string
        }
        Insert: {
          body: string
          edited_at?: string
          edited_by: string
          id?: string
          post_id: string
        }
        Update: {
          body?: string
          edited_at?: string
          edited_by?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          body: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          edited_by: string | null
          id: string
          kind: Database["public"]["Enums"]["forum_post_kind"]
          payload: Json
          reply_to_id: string | null
          thread_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["forum_post_kind"]
          payload?: Json
          reply_to_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["forum_post_kind"]
          payload?: Json
          reply_to_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reactions: {
        Row: {
          emoji: string
          post_id: string
          user_id: string
        }
        Insert: {
          emoji: string
          post_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_read_state: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_read_state_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_subscriptions: {
        Row: {
          category_id: string | null
          level: Database["public"]["Enums"]["forum_watch_level"]
          thread_id: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          level?: Database["public"]["Enums"]["forum_watch_level"]
          thread_id?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          level?: Database["public"]["Enums"]["forum_watch_level"]
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_subscriptions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          category_id: string
          created_at: string
          created_by: string
          event_ends_on: string | null
          event_id: string | null
          id: string
          is_archived: boolean
          is_locked: boolean
          is_pinned: boolean
          last_post_at: string
          last_post_by: string | null
          post_count: number
          slug: string
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by: string
          event_ends_on?: string | null
          event_id?: string | null
          id?: string
          is_archived?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          last_post_at?: string
          last_post_by?: string | null
          post_count?: number
          slug: string
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string
          event_ends_on?: string | null
          event_id?: string | null
          id?: string
          is_archived?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          last_post_at?: string
          last_post_by?: string | null
          post_count?: number
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      member_personas: {
        Row: {
          created_at: string
          expertise: string
          id: string
          images: string[]
          is_public: boolean
          period: string
          portrayal: string
          public_images: string[]
          published_at: string | null
          published_by: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expertise?: string
          id?: string
          images?: string[]
          is_public?: boolean
          period?: string
          portrayal?: string
          public_images?: string[]
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expertise?: string
          id?: string
          images?: string[]
          is_public?: boolean
          period?: string
          portrayal?: string
          public_images?: string[]
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      membership_applications: {
        Row: {
          extra: Json
          birthdate: string | null
          city: string | null
          contribution_interval: string
          created_at: string
          created_user_id: string | null
          data_processing_accepted: boolean
          email: string
          first_name: string
          id: string
          last_name: string
          membership_type: string
          phone: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          salutation: string | null
          status: string
          statutes_accepted: boolean
          street: string | null
          zip: string | null
        }
        Insert: {
          extra?: Json
          birthdate?: string | null
          city?: string | null
          contribution_interval?: string
          created_at?: string
          created_user_id?: string | null
          data_processing_accepted?: boolean
          email: string
          first_name: string
          id?: string
          last_name: string
          membership_type?: string
          phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salutation?: string | null
          status?: string
          statutes_accepted?: boolean
          street?: string | null
          zip?: string | null
        }
        Update: {
          extra?: Json
          birthdate?: string | null
          city?: string | null
          contribution_interval?: string
          created_at?: string
          created_user_id?: string | null
          data_processing_accepted?: boolean
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          membership_type?: string
          phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salutation?: string | null
          status?: string
          statutes_accepted?: boolean
          street?: string | null
          zip?: string | null
        }
        Relationships: []
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
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      permission_catalog: {
        Row: {
          category: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          category: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          category?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allergies: string | null
          birthdate: string | null
          calendar_token: string | null
          city: string | null
          contribution_interval: string | null
          created_at: string
          diet: string | null
          digest_sent_at: string | null
          display_name: string
          entry_date: string | null
          exit_date: string | null
          first_name: string | null
          forum_signature: string | null
          forum_title: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          map_lat: number | null
          map_lng: number | null
          membership_type: string | null
          notify_digest: boolean
          notify_push: boolean
          phone: string | null
          salutation: string | null
          show_on_map: boolean
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          allergies?: string | null
          birthdate?: string | null
          calendar_token?: string | null
          city?: string | null
          contribution_interval?: string | null
          created_at?: string
          diet?: string | null
          digest_sent_at?: string | null
          display_name?: string
          entry_date?: string | null
          exit_date?: string | null
          first_name?: string | null
          forum_signature?: string | null
          forum_title?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          map_lat?: number | null
          map_lng?: number | null
          membership_type?: string | null
          notify_digest?: boolean
          notify_push?: boolean
          phone?: string | null
          salutation?: string | null
          show_on_map?: boolean
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          allergies?: string | null
          birthdate?: string | null
          calendar_token?: string | null
          city?: string | null
          contribution_interval?: string | null
          created_at?: string
          diet?: string | null
          digest_sent_at?: string | null
          display_name?: string
          entry_date?: string | null
          exit_date?: string | null
          first_name?: string | null
          forum_signature?: string | null
          forum_title?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          map_lat?: number | null
          map_lng?: number | null
          membership_type?: string | null
          notify_digest?: boolean
          notify_push?: boolean
          phone?: string | null
          salutation?: string | null
          show_on_map?: boolean
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failure_count: number
          last_sent_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failure_count?: number
          last_sent_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failure_count?: number
          last_sent_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
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
      role_catalog: {
        Row: {
          description: string | null
          is_board: boolean
          is_system: boolean
          key: string
          label: string
          max_holders: number | null
          public_listed: boolean
          sort_order: number
        }
        Insert: {
          description?: string | null
          is_board?: boolean
          is_system?: boolean
          key: string
          label: string
          max_holders?: number | null
          public_listed?: boolean
          sort_order?: number
        }
        Update: {
          description?: string | null
          is_board?: boolean
          is_system?: boolean
          key?: string
          label?: string
          max_holders?: number | null
          public_listed?: boolean
          sort_order?: number
        }
        Relationships: []
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
      site_categories: {
        Row: {
          created_at: string
          description: string | null
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          label?: string
          sort_order?: number
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
      site_menu: {
        Row: {
          bereich: string
          created_at: string
          href: string | null
          id: string
          is_visible: boolean
          label: string
          opens_new: boolean
          page_id: string | null
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          bereich?: string
          created_at?: string
          href?: string | null
          id?: string
          is_visible?: boolean
          label: string
          opens_new?: boolean
          page_id?: string | null
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          bereich?: string
          created_at?: string
          href?: string | null
          id?: string
          is_visible?: boolean
          label?: string
          opens_new?: boolean
          page_id?: string | null
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_menu_page_fk"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_menu_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "site_menu"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          content: Json | null
          created_at: string
          draft_content: Json | null
          id: string
          is_published: boolean
          is_system: boolean
          noindex: boolean
          published_at: string | null
          seo_description: string | null
          seo_image_path: string | null
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          draft_content?: Json | null
          id?: string
          is_published?: boolean
          is_system?: boolean
          noindex?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_image_path?: string | null
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          draft_content?: Json | null
          id?: string
          is_published?: boolean
          is_system?: boolean
          noindex?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_image_path?: string | null
          slug?: string
          title?: string
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
      user_tours: {
        Row: {
          completed_at: string
          id: string
          tour_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          tour_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          tour_key?: string
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
      [_ in never]: never
    }
    Functions: {
      assign_response_to_member: {
        Args: { _response_id: string; _user_id: string }
        Returns: undefined
      }
      backup_manifest: {
        Args: never
        Returns: {
          approx_rows: number
          table_name: string
        }[]
      }
      backup_schema_ddl: { Args: never; Returns: string }
      can_vote: {
        Args: { _election_id: string; _user_id: string }
        Returns: boolean
      }
      cast_votes: {
        Args: { _election_id: string; _voter_id: string; _votes: Json }
        Returns: undefined
      }
      count_members: { Args: never; Returns: number }
      ensure_event_thread: { Args: { _event_id: string }; Returns: string }
      forum_can: {
        Args: { _category_id: string; _what: string }
        Returns: boolean
      }
      forum_mentioned_users: {
        Args: { _body: string }
        Returns: {
          user_id: string
        }[]
      }
      forum_poll_results: {
        Args: { _post_id: string }
        Returns: {
          namen: string[]
          note_by: string[]
          option_key: string
          stimmen: number
        }[]
      }
      forum_thread_audience: {
        Args: { _exclude: string; _thread_id: string }
        Returns: {
          user_id: string
        }[]
      }
      get_board_members: {
        Args: never
        Returns: {
          display_name: string
          role_key: string
          role_label: string
          sort_order: number
        }[]
      }
      get_current_contribution_rate: { Args: never; Returns: number }
      get_current_satzung_path: { Args: never; Returns: string }
      get_election_results: {
        Args: never
        Returns: {
          candidate_id: string
          candidate_name: string
          election_id: string
          vote_count: number
        }[]
      }
      get_form_by_token: { Args: { _token: string }; Returns: Json }
      get_map_members: {
        Args: never
        Returns: {
          city: string
          display_name: string
          id: string
          map_lat: number
          map_lng: number
          zip: string
        }[]
      }
      get_member_directory: {
        Args: never
        Returns: {
          display_name: string
          id: string
          is_active: boolean
        }[]
      }
      get_member_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      get_pending_application_count: { Args: never; Returns: number }
      get_permission_catalog: {
        Args: never
        Returns: {
          category: string
          key: string
          label: string
        }[]
      }
      get_public_personas: {
        Args: never
        Returns: {
          expertise: string
          images: string[]
          period: string
          portrayal: string
        }[]
      }
      get_public_settings: {
        Args: never
        Returns: {
          color_dark: string
          color_primary: string
          logo_path: string
          org_name: string
          org_short_name: string
          org_tagline: string
          website_url: string
        }[]
      }
      get_response_by_edit_token: {
        Args: { _edit_token: string }
        Returns: Json
      }
      get_role_catalog: {
        Args: never
        Returns: {
          key: string
          label: string
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
      mark_notifications_read: { Args: { _ids?: string[] }; Returns: number }
      module_enabled: { Args: { _key: string }; Returns: boolean }
      pending_digests: {
        Args: never
        Returns: {
          display_name: string
          items: Json
          user_id: string
        }[]
      }
      public_branding: {
        Args: never
        Returns: {
          logo_in_header: boolean
          footer_legal_label: string
          footer_navigation_label: string
          board_members: string
          color_dark: string
          color_primary: string
          favicon_path: string
          font_body: string
          font_headings: string
          hosting_address: string
          hosting_provider: string
          logo_path: string
          org_city: string
          org_country: string
          org_email: string
          org_name: string
          org_phone: string
          org_short_name: string
          org_street: string
          org_tagline: string
          org_zip: string
          privacy_contact: string
          privacy_officer: string
          register_court: string
          register_number: string
          seo_description: string
          seo_image_path: string
          vat_id: string
          website_url: string
        }[]
      }
      push_mark_failure: {
        Args: { _endpoint: string; _gone: boolean }
        Returns: undefined
      }
      push_targets_for_thread: {
        Args: { _exclude: string; _thread_id: string }
        Returns: {
          auth: string
          endpoint: string
          p256dh: string
          user_id: string
        }[]
      }
      set_persona_public: {
        Args: {
          _is_public: boolean
          _persona_id: string
          _public_images?: string[]
        }
        Returns: undefined
      }
      submit_form_response: {
        Args: { _answers: Json; _email: string; _name: string; _token: string }
        Returns: string
      }
      update_form_settings: {
        Args: { _form_id: string; _patch: Json }
        Returns: Json
      }
      update_response_by_edit_token: {
        Args: {
          _answers: Json
          _edit_token: string
          _email: string
          _name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "vorstand"
        | "mitglied"
        | "herold"
        | "schatzmeister"
        | "officiatus_1"
        | "officiatus_2"
      forum_category_status: "vorgeschlagen" | "aktiv" | "archiviert"
      forum_post_kind: "beitrag" | "umfrage" | "mitbringliste"
      forum_watch_level: "beobachten" | "verfolgen" | "stumm"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "vorstand",
        "mitglied",
        "herold",
        "schatzmeister",
        "officiatus_1",
        "officiatus_2",
      ],
      forum_category_status: ["vorgeschlagen", "aktiv", "archiviert"],
      forum_post_kind: ["beitrag", "umfrage", "mitbringliste"],
      forum_watch_level: ["beobachten", "verfolgen", "stumm"],
    },
  },
} as const
