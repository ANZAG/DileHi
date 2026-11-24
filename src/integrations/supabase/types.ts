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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      anfragen_bremse: {
        Row: {
          schluessel: string
          zeit: string
        }
        Insert: {
          schluessel: string
          zeit?: string
        }
        Update: {
          schluessel?: string
          zeit?: string
        }
        Relationships: []
      }
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
          kind: string
          label: string
          requires: string | null
          sort_order: number
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          kind?: string
          label: string
          requires?: string | null
          sort_order?: number
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          kind?: string
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
          bank_bic: string | null
          bank_iban: string | null
          bank_recipient: string | null
          board_members: string | null
          calendar_timezone: string
          color_accent_text: string | null
          color_dark: string
          color_muted: string | null
          color_primary: string
          color_surface: string
          contribution_model: string
          contribution_retention_years: number
          default_role: string | null
          exemption_notice_date: string | null
          exemption_notice_kind: string | null
          exemption_notice_period: string | null
          favicon_path: string | null
          fees_deductible: boolean
          file_storage: string
          font_body: string
          font_headings: string
          footer_legal_label: string
          footer_navigation_label: string
          forum_event_thread: string
          hosting_address: string | null
          hosting_provider: string | null
          id: boolean
          is_nonprofit: boolean
          logo_in_header: boolean
          logo_path: string | null
          mail_from_address: string | null
          mail_from_name: string | null
          mail_reply_to: string | null
          mail_transport: string
          org_city: string | null
          org_country: string
          org_email: string | null
          org_form: string
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
          setup_done_at: string | null
          setup_step: number
          sharepoint_site_url: string | null
          statutes_category: string | null
          statutes_document_id: string | null
          statutes_link: boolean
          tax_number: string | null
          tax_office: string | null
          tax_purposes: string | null
          trainer_allowance: number
          updated_at: string
          updated_by: string | null
          vat_id: string | null
          volunteer_allowance: number
          website_url: string | null
        }
        Insert: {
          bank_bic?: string | null
          bank_iban?: string | null
          bank_recipient?: string | null
          board_members?: string | null
          calendar_timezone?: string
          color_accent_text?: string | null
          color_dark?: string
          color_muted?: string | null
          color_primary?: string
          color_surface?: string
          contribution_model?: string
          contribution_retention_years?: number
          default_role?: string | null
          exemption_notice_date?: string | null
          exemption_notice_kind?: string | null
          exemption_notice_period?: string | null
          favicon_path?: string | null
          fees_deductible?: boolean
          file_storage?: string
          font_body?: string
          font_headings?: string
          footer_legal_label?: string
          footer_navigation_label?: string
          forum_event_thread?: string
          hosting_address?: string | null
          hosting_provider?: string | null
          id?: boolean
          is_nonprofit?: boolean
          logo_in_header?: boolean
          logo_path?: string | null
          mail_from_address?: string | null
          mail_from_name?: string | null
          mail_reply_to?: string | null
          mail_transport?: string
          org_city?: string | null
          org_country?: string
          org_email?: string | null
          org_form?: string
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
          setup_done_at?: string | null
          setup_step?: number
          sharepoint_site_url?: string | null
          statutes_category?: string | null
          statutes_document_id?: string | null
          statutes_link?: boolean
          tax_number?: string | null
          tax_office?: string | null
          tax_purposes?: string | null
          trainer_allowance?: number
          updated_at?: string
          updated_by?: string | null
          vat_id?: string | null
          volunteer_allowance?: number
          website_url?: string | null
        }
        Update: {
          bank_bic?: string | null
          bank_iban?: string | null
          bank_recipient?: string | null
          board_members?: string | null
          calendar_timezone?: string
          color_accent_text?: string | null
          color_dark?: string
          color_muted?: string | null
          color_primary?: string
          color_surface?: string
          contribution_model?: string
          contribution_retention_years?: number
          default_role?: string | null
          exemption_notice_date?: string | null
          exemption_notice_kind?: string | null
          exemption_notice_period?: string | null
          favicon_path?: string | null
          fees_deductible?: boolean
          file_storage?: string
          font_body?: string
          font_headings?: string
          footer_legal_label?: string
          footer_navigation_label?: string
          forum_event_thread?: string
          hosting_address?: string | null
          hosting_provider?: string | null
          id?: boolean
          is_nonprofit?: boolean
          logo_in_header?: boolean
          logo_path?: string | null
          mail_from_address?: string | null
          mail_from_name?: string | null
          mail_reply_to?: string | null
          mail_transport?: string
          org_city?: string | null
          org_country?: string
          org_email?: string | null
          org_form?: string
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
          setup_done_at?: string | null
          setup_step?: number
          sharepoint_site_url?: string | null
          statutes_category?: string | null
          statutes_document_id?: string | null
          statutes_link?: boolean
          tax_number?: string | null
          tax_office?: string | null
          tax_purposes?: string | null
          trainer_allowance?: number
          updated_at?: string
          updated_by?: string | null
          vat_id?: string | null
          volunteer_allowance?: number
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_default_role_fkey"
            columns: ["default_role"]
            isOneToOne: false
            referencedRelation: "role_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "app_settings_statutes_category_fkey"
            columns: ["statutes_category"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "app_settings_statutes_document_fk"
            columns: ["statutes_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      application_fields: {
        Row: {
          column_name: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          options: Json
          required: boolean
          settings: Json
          sort_order: number
          type: string
        }
        Insert: {
          column_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          options?: Json
          required?: boolean
          settings?: Json
          sort_order?: number
          type: string
        }
        Update: {
          column_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          options?: Json
          required?: boolean
          settings?: Json
          sort_order?: number
          type?: string
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
      certificate_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          remind_days: number
          sort_order: number
          validity_months: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          remind_days?: number
          sort_order?: number
          validity_months?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          remind_days?: number
          sort_order?: number
          validity_months?: number | null
        }
        Relationships: []
      }
      club_deadlines: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          done_at: string | null
          done_by: string | null
          due_date: string
          id: string
          note: string | null
          overdue_notified_at: string | null
          remind_days: number
          reminded_at: string | null
          repeat_months: number | null
          responsible_role: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          done_by?: string | null
          due_date: string
          id?: string
          note?: string | null
          overdue_notified_at?: string | null
          remind_days?: number
          reminded_at?: string | null
          repeat_months?: number | null
          responsible_role?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          done_by?: string | null
          due_date?: string
          id?: string
          note?: string | null
          overdue_notified_at?: string | null
          remind_days?: number
          reminded_at?: string | null
          repeat_months?: number | null
          responsible_role?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_deadlines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_deadlines_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_deadlines_responsible_role_fkey"
            columns: ["responsible_role"]
            isOneToOne: false
            referencedRelation: "role_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      consent_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string | null
          label: string
          sort_order: number
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string | null
          label: string
          sort_order?: number
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string | null
          label?: string
          sort_order?: number
          text?: string
        }
        Relationships: []
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
      contribution_categories: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          key: string
          label: string
          removed_from: number | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          removed_from?: number | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          removed_from?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      contribution_rates: {
        Row: {
          amount: number
          category: string
          id: string
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          amount: number
          category?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          amount?: number
          category?: string
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
      document_categories: {
        Row: {
          created_at: string
          key: string
          label: string
          required_permission: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          key: string
          label: string
          required_permission?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          key?: string
          label?: string
          required_permission?: string | null
          sort_order?: number
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
        Relationships: [
          {
            foreignKeyName: "documents_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      donation_receipts: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          donor_address: string
          donor_name: string
          donor_user_id: string | null
          id: string
          issued_by: string | null
          issued_on: string
          kind: string
          number: string
          snapshot: Json
          total: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          donor_address: string
          donor_name: string
          donor_user_id?: string | null
          id?: string
          issued_by?: string | null
          issued_on: string
          kind: string
          number: string
          snapshot: Json
          total: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          donor_address?: string
          donor_name?: string
          donor_user_id?: string | null
          id?: string
          issued_by?: string | null
          issued_on?: string
          kind?: string
          number?: string
          snapshot?: Json
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "donation_receipts_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_receipts_donor_user_id_fkey"
            columns: ["donor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_receipts_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          contribution_id: string | null
          created_at: string
          created_by: string | null
          donor_address: string | null
          donor_name: string | null
          donor_user_id: string | null
          id: string
          kind: string
          note: string | null
          receipt_id: string | null
          received_on: string
          updated_at: string
          waiver: boolean
        }
        Insert: {
          amount: number
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          donor_address?: string | null
          donor_name?: string | null
          donor_user_id?: string | null
          id?: string
          kind?: string
          note?: string | null
          receipt_id?: string | null
          received_on: string
          updated_at?: string
          waiver?: boolean
        }
        Update: {
          amount?: number
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          donor_address?: string | null
          donor_name?: string | null
          donor_user_id?: string | null
          id?: string
          kind?: string
          note?: string | null
          receipt_id?: string | null
          received_on?: string
          updated_at?: string
          waiver?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "donations_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: true
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_donor_user_id_fkey"
            columns: ["donor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "donation_receipts"
            referencedColumns: ["id"]
          },
        ]
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
      expense_claims: {
        Row: {
          amount: number
          category: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          event_id: string | null
          id: string
          note: string | null
          paid_at: string | null
          receipt_path: string | null
          spent_on: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          event_id?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          receipt_path?: string | null
          spent_on: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          event_id?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          receipt_path?: string | null
          spent_on?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role: string
        }
        Insert: {
          can_reply?: boolean
          can_start?: boolean
          can_view?: boolean
          category_id: string
          is_moderator?: boolean
          role: string
        }
        Update: {
          can_reply?: boolean
          can_start?: boolean
          can_view?: boolean
          category_id?: string
          is_moderator?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_category_roles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_category_roles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "role_catalog"
            referencedColumns: ["key"]
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
          breite: number | null
          created_at: string
          created_by: string
          epoch: string
          fassungen: number[]
          hoehe: number | null
          id: string
          show_subtitle: boolean
          storage_path: string
        }
        Insert: {
          alt_text?: string
          breite?: number | null
          created_at?: string
          created_by: string
          epoch?: string
          fassungen?: number[]
          hoehe?: number | null
          id?: string
          show_subtitle?: boolean
          storage_path: string
        }
        Update: {
          alt_text?: string
          breite?: number | null
          created_at?: string
          created_by?: string
          epoch?: string
          fassungen?: number[]
          hoehe?: number | null
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
      inventory_items: {
        Row: {
          category: string
          condition: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          note: string | null
          owner_id: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          category?: string
          condition?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          note?: string | null
          owner_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          note?: string | null
          owner_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_loans: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string | null
          from_date: string
          handed_out_at: string | null
          id: string
          item_id: string
          note: string | null
          overdue_notified_at: string | null
          quantity: number
          returned_at: string | null
          status: string
          until_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          from_date: string
          handed_out_at?: string | null
          id?: string
          item_id: string
          note?: string | null
          overdue_notified_at?: string | null
          quantity?: number
          returned_at?: string | null
          status?: string
          until_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          from_date?: string
          handed_out_at?: string | null
          id?: string
          item_id?: string
          note?: string | null
          overdue_notified_at?: string | null
          quantity?: number
          returned_at?: string | null
          status?: string
          until_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_loans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_loans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_loans_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_cards: {
        Row: {
          area: number
          as_of: string | null
          body: string | null
          grade: string
          grade_note: string | null
          id: string
          keywords: string[]
          level: string | null
          presentation_id: string
          roles: string[]
          statement: string
          status: string
          topics: string[]
          updated_at: string
          valid_for: string | null
        }
        Insert: {
          area: number
          as_of?: string | null
          body?: string | null
          grade: string
          grade_note?: string | null
          id: string
          keywords?: string[]
          level?: string | null
          presentation_id: string
          roles?: string[]
          statement: string
          status?: string
          topics?: string[]
          updated_at?: string
          valid_for?: string | null
        }
        Update: {
          area?: number
          as_of?: string | null
          body?: string | null
          grade?: string
          grade_note?: string | null
          id?: string
          keywords?: string[]
          level?: string | null
          presentation_id?: string
          roles?: string[]
          statement?: string
          status?: string
          topics?: string[]
          updated_at?: string
          valid_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_cards_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "library_presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      library_findings: {
        Row: {
          card_id: string
          id: string
          page: string | null
          page_image: string | null
          pdf_page: number | null
          plate_id: string | null
          pointer_image: string | null
          position: number
          quote: string | null
          quote_note: string | null
          source_id: string | null
        }
        Insert: {
          card_id: string
          id?: string
          page?: string | null
          page_image?: string | null
          pdf_page?: number | null
          plate_id?: string | null
          pointer_image?: string | null
          position?: number
          quote?: string | null
          quote_note?: string | null
          source_id?: string | null
        }
        Update: {
          card_id?: string
          id?: string
          page?: string | null
          page_image?: string | null
          pdf_page?: number | null
          plate_id?: string | null
          pointer_image?: string | null
          position?: number
          quote?: string | null
          quote_note?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_findings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "library_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_findings_plate_id_fkey"
            columns: ["plate_id"]
            isOneToOne: false
            referencedRelation: "library_plates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_findings_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "library_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      library_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          entry_id: string
          id: number
          new_row: Json | null
          old_row: Json | null
          operation: string
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          entry_id: string
          id?: number
          new_row?: Json | null
          old_row?: Json | null
          operation: string
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          entry_id?: string
          id?: number
          new_row?: Json | null
          old_row?: Json | null
          operation?: string
          table_name?: string
        }
        Relationships: []
      }
      library_images: {
        Row: {
          etag: string | null
          height: number | null
          item_id: string
          modified_at: string | null
          path: string
          size: number | null
          width: number | null
        }
        Insert: {
          etag?: string | null
          height?: number | null
          item_id: string
          modified_at?: string | null
          path: string
          size?: number | null
          width?: number | null
        }
        Update: {
          etag?: string | null
          height?: number | null
          item_id?: string
          modified_at?: string | null
          path?: string
          size?: number | null
          width?: number | null
        }
        Relationships: []
      }
      library_pages: {
        Row: {
          body: string | null
          frequent: string[]
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          frequent?: string[]
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          frequent?: string[]
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_plates: {
        Row: {
          as_of: string | null
          body: string | null
          dating: string | null
          dating_origin: string | null
          file: string | null
          id: string
          not_readable: string | null
          object: string | null
          presentation_id: string
          readable: string | null
          reproduction: string | null
          rights: string | null
          rights_status: string
          shows: Json
          situation: string | null
          title: string
          unit: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          as_of?: string | null
          body?: string | null
          dating?: string | null
          dating_origin?: string | null
          file?: string | null
          id: string
          not_readable?: string | null
          object?: string | null
          presentation_id: string
          readable?: string | null
          reproduction?: string | null
          rights?: string | null
          rights_status: string
          shows?: Json
          situation?: string | null
          title: string
          unit?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          as_of?: string | null
          body?: string | null
          dating?: string | null
          dating_origin?: string | null
          file?: string | null
          id?: string
          not_readable?: string | null
          object?: string | null
          presentation_id?: string
          readable?: string | null
          reproduction?: string | null
          rights?: string | null
          rights_status?: string
          shows?: Json
          situation?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_plates_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "library_presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      library_presentations: {
        Row: {
          areas: Json
          as_of: string | null
          body: string | null
          chapters: Json
          epoch: string | null
          id: string
          image: string | null
          levels: string[]
          period: string | null
          roles: Json
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          areas?: Json
          as_of?: string | null
          body?: string | null
          chapters?: Json
          epoch?: string | null
          id: string
          image?: string | null
          levels?: string[]
          period?: string | null
          roles?: Json
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          areas?: Json
          as_of?: string | null
          body?: string | null
          chapters?: Json
          epoch?: string | null
          id?: string
          image?: string | null
          levels?: string[]
          period?: string | null
          roles?: Json
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_settings: {
        Row: {
          folder: string
          id: boolean
          site_url: string | null
          updated_at: string
        }
        Insert: {
          folder?: string
          id?: boolean
          site_url?: string | null
          updated_at?: string
        }
        Update: {
          folder?: string
          id?: boolean
          site_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      library_sources: {
        Row: {
          body: string | null
          collection_source_id: string | null
          evaluated: string | null
          id: string
          kind: string | null
          level: string | null
          note: string | null
          original: string | null
          place_publisher: string | null
          public_source_id: string | null
          rights: string | null
          rights_status: string
          title: string
          title_page: string | null
          updated_at: string
          year: string | null
        }
        Insert: {
          body?: string | null
          collection_source_id?: string | null
          evaluated?: string | null
          id: string
          kind?: string | null
          level?: string | null
          note?: string | null
          original?: string | null
          place_publisher?: string | null
          public_source_id?: string | null
          rights?: string | null
          rights_status: string
          title: string
          title_page?: string | null
          updated_at?: string
          year?: string | null
        }
        Update: {
          body?: string | null
          collection_source_id?: string | null
          evaluated?: string | null
          id?: string
          kind?: string | null
          level?: string | null
          note?: string | null
          original?: string | null
          place_publisher?: string | null
          public_source_id?: string | null
          rights?: string | null
          rights_status?: string
          title?: string
          title_page?: string | null
          updated_at?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_sources_collection_source_id_fkey"
            columns: ["collection_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_sources_public_source_id_fkey"
            columns: ["public_source_id"]
            isOneToOne: false
            referencedRelation: "epoch_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      library_topics: {
        Row: {
          as_of: string
          body: string | null
          cards: string[]
          chapter: number
          frame: Json | null
          grp: string | null
          id: string
          keywords: string[]
          parent_id: string | null
          plates: string[]
          presentation_id: string
          roles: string[]
          sort_order: number
          summary: string | null
          title: string
          tree: Json | null
          updated_at: string
        }
        Insert: {
          as_of: string
          body?: string | null
          cards?: string[]
          chapter: number
          frame?: Json | null
          grp?: string | null
          id: string
          keywords?: string[]
          parent_id?: string | null
          plates?: string[]
          presentation_id: string
          roles?: string[]
          sort_order?: number
          summary?: string | null
          title: string
          tree?: Json | null
          updated_at?: string
        }
        Update: {
          as_of?: string
          body?: string | null
          cards?: string[]
          chapter?: number
          frame?: Json | null
          grp?: string | null
          id?: string
          keywords?: string[]
          parent_id?: string | null
          plates?: string[]
          presentation_id?: string
          roles?: string[]
          sort_order?: number
          summary?: string | null
          title?: string
          tree?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_topics_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "library_presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_templates: {
        Row: {
          body: string
          button_label: string
          defaults: Json
          description: string | null
          eyebrow: string
          footnote: string
          heading: string
          key: string
          label: string
          placeholders: string[]
          sort_order: number
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          button_label?: string
          defaults: Json
          description?: string | null
          eyebrow?: string
          footnote?: string
          heading?: string
          key: string
          label: string
          placeholders?: string[]
          sort_order?: number
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          button_label?: string
          defaults?: Json
          description?: string | null
          eyebrow?: string
          footnote?: string
          heading?: string
          key?: string
          label?: string
          placeholders?: string[]
          sort_order?: number
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      member_certificates: {
        Row: {
          created_at: string
          expired_notified_at: string | null
          id: string
          issued_on: string | null
          note: string | null
          reminded_at: string | null
          type_id: string
          updated_at: string
          user_id: string
          valid_until: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          expired_notified_at?: string | null
          id?: string
          issued_on?: string | null
          note?: string | null
          reminded_at?: string | null
          type_id: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          expired_notified_at?: string | null
          id?: string
          issued_on?: string | null
          note?: string | null
          reminded_at?: string | null
          type_id?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_certificates_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "certificate_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_certificates_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_consent_log: {
        Row: {
          decided_at: string
          decided_by: string | null
          granted: boolean
          guardian_name: string | null
          id: string
          type_id: string
          user_id: string
        }
        Insert: {
          decided_at?: string
          decided_by?: string | null
          granted: boolean
          guardian_name?: string | null
          id?: string
          type_id: string
          user_id: string
        }
        Update: {
          decided_at?: string
          decided_by?: string | null
          granted?: boolean
          guardian_name?: string | null
          id?: string
          type_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_consent_log_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_consent_log_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "consent_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_consent_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_consents: {
        Row: {
          decided_at: string
          decided_by: string | null
          granted: boolean
          guardian_name: string | null
          type_id: string
          user_id: string
        }
        Insert: {
          decided_at?: string
          decided_by?: string | null
          granted: boolean
          guardian_name?: string | null
          type_id: string
          user_id: string
        }
        Update: {
          decided_at?: string
          decided_by?: string | null
          granted?: boolean
          guardian_name?: string | null
          type_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_consents_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_consents_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "consent_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          relation: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          relation?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          relation?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          show_name: boolean
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
          show_name?: boolean
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
          show_name?: boolean
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
          birthdate: string | null
          city: string | null
          contribution_interval: string
          created_at: string
          created_user_id: string | null
          data_processing_accepted: boolean
          email: string
          extra: Json
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
          birthdate?: string | null
          city?: string | null
          contribution_interval?: string
          created_at?: string
          created_user_id?: string | null
          data_processing_accepted?: boolean
          email: string
          extra?: Json
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
          birthdate?: string | null
          city?: string | null
          contribution_interval?: string
          created_at?: string
          created_user_id?: string | null
          data_processing_accepted?: boolean
          email?: string
          extra?: Json
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
      onboarding_help: {
        Row: {
          defaults: Json | null
          key: string
          text: string
          title: string | null
        }
        Insert: {
          defaults?: Json | null
          key: string
          text: string
          title?: string | null
        }
        Update: {
          defaults?: Json | null
          key?: string
          text?: string
          title?: string | null
        }
        Relationships: []
      }
      onboarding_steps: {
        Row: {
          anchor: string | null
          defaults: Json | null
          icon: string
          is_active: boolean
          key: string
          module: string | null
          permission: string | null
          route: string | null
          sort_order: number
          task: string | null
          text: string
          tip: string | null
          title: string
          tour: string
        }
        Insert: {
          anchor?: string | null
          defaults?: Json | null
          icon?: string
          is_active?: boolean
          key: string
          module?: string | null
          permission?: string | null
          route?: string | null
          sort_order?: number
          task?: string | null
          text: string
          tip?: string | null
          title: string
          tour?: string
        }
        Update: {
          anchor?: string | null
          defaults?: Json | null
          icon?: string
          is_active?: boolean
          key?: string
          module?: string | null
          permission?: string | null
          route?: string | null
          sort_order?: number
          task?: string | null
          text?: string
          tip?: string | null
          title?: string
          tour?: string
        }
        Relationships: []
      }
      pdf_texts: {
        Row: {
          body: string
          defaults: Json
          description: string | null
          key: string
          label: string
          placeholders: string[]
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          defaults: Json
          description?: string | null
          key: string
          label: string
          placeholders?: string[]
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          defaults?: Json
          description?: string | null
          key?: string
          label?: string
          placeholders?: string[]
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
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
      profile_fields: {
        Row: {
          block_key: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          module: string | null
          options: Json
          required: boolean
          settings: Json
          sort_order: number
          type: string
        }
        Insert: {
          block_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          module?: string | null
          options?: Json
          required?: boolean
          settings?: Json
          sort_order?: number
          type: string
        }
        Update: {
          block_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          module?: string | null
          options?: Json
          required?: boolean
          settings?: Json
          sort_order?: number
          type?: string
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
          extra: Json
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
          extra?: Json
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
          extra?: Json
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
      resolutions: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          decided_on: string
          document_id: string | null
          election_id: string | null
          id: string
          note: string | null
          number: string | null
          outcome: string
          result: string | null
          superseded_by: string | null
          text: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          decided_on: string
          document_id?: string | null
          election_id?: string | null
          id?: string
          note?: string | null
          number?: string | null
          outcome?: string
          result?: string | null
          superseded_by?: string | null
          text: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          decided_on?: string
          document_id?: string | null
          election_id?: string | null
          id?: string
          note?: string | null
          number?: string | null
          outcome?: string
          result?: string | null
          superseded_by?: string | null
          text?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_catalog: {
        Row: {
          description: string | null
          is_board: boolean
          is_leadership: boolean
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
          is_leadership?: boolean
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
          is_leadership?: boolean
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
          role: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission: string
          role: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "role_catalog"
            referencedColumns: ["key"]
          },
        ]
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
          breite: number | null
          fassungen: number[]
          hoehe: number | null
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
          breite?: number | null
          fassungen?: number[]
          hoehe?: number | null
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
          breite?: number | null
          fassungen?: number[]
          hoehe?: number | null
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
          area: string
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
          area?: string
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
          area?: string
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
          seo_title: string | null
          seo_type: string
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
          seo_title?: string | null
          seo_type?: string
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
          seo_title?: string | null
          seo_type?: string
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
      source_pages: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          doc: unknown
          file_key: string
          page: number
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          doc?: unknown
          file_key: string
          page: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          doc?: unknown
          file_key?: string
          page?: number
        }
        Relationships: []
      }
      sources: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          drive_item_id: string | null
          epoch: string
          file_missing: boolean
          file_name: string | null
          file_path: string | null
          file_size: number | null
          folder_id: string | null
          id: string
          mime_type: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          drive_item_id?: string | null
          epoch: string
          file_missing?: boolean
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          drive_item_id?: string | null
          epoch?: string
          file_missing?: boolean
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
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
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "role_catalog"
            referencedColumns: ["key"]
          },
        ]
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
      volunteer_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string | null
          paid_on: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string | null
          paid_on: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          paid_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      anfrage_absender: { Args: never; Returns: string }
      anfrage_erlaubt: {
        Args: {
          _absender?: string
          _art: string
          _fenster: string
          _hoechstens: number
        }
        Returns: boolean
      }
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
      cancel_donation_receipt: {
        Args: { _reason: string; _receipt_id: string }
        Returns: undefined
      }
      cast_votes: {
        Args: { _election_id: string; _voter_id: string; _votes: Json }
        Returns: undefined
      }
      certificate_reminders: { Args: never; Returns: number }
      club_deadline_reminders: { Args: never; Returns: number }
      contribution_category_offered: {
        Args: { _is_active: boolean; _removed_from: number; _year?: number }
        Returns: boolean
      }
      contribution_category_status: {
        Args: never
        Returns: {
          deletable_from: number
          description: string
          former_members: number
          is_active: boolean
          key: string
          label: string
          last_data_year: number
          members: number
          offered: boolean
          removed_from: number
          sort_order: number
        }[]
      }
      count_members: { Args: never; Returns: number }
      ensure_event_thread: { Args: { _event_id: string }; Returns: string }
      event_attendee_care: {
        Args: { _event_id: string }
        Returns: {
          contacts: Json
          display_name: string
          is_minor: boolean
          no_photo_consent: boolean
          user_id: string
        }[]
      }
      event_attendee_certificates: {
        Args: { _event_id: string }
        Returns: {
          label: string
          user_id: string
          valid_until: string
          verified: boolean
        }[]
      }
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
      get_contribution_rate: {
        Args: { _category: string; _year?: number }
        Returns: number
      }
      get_current_contribution_rate: { Args: never; Returns: number }
      get_current_statutes_path: { Args: never; Returns: string }
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
          name: string
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
      has_leadership_role: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_voted: {
        Args: { _election_id: string; _user_id: string }
        Returns: boolean
      }
      import_paid_contributions: { Args: { _year: number }; Returns: number }
      inventory_available: {
        Args: {
          _except?: string
          _from: string
          _item_id: string
          _until: string
        }
        Returns: number
      }
      inventory_reminders: { Args: never; Returns: number }
      is_member: { Args: { _user_id: string }; Returns: boolean }
      issue_donation_receipt: {
        Args: { _donation_ids: string[]; _issued_on?: string }
        Returns: string
      }
      library_fold: { Args: { _t: string }; Returns: string }
      library_fold_lower: { Args: { _t: string }; Returns: string }
      library_import: {
        Args: { _art: string; _d: Json; _text?: string }
        Returns: string
      }
      library_list: { Args: { _j: Json }; Returns: string[] }
      library_query: { Args: { _q: string }; Returns: unknown }
      library_reader: { Args: { _user_id: string }; Returns: boolean }
      library_search: {
        Args: { _q: string }
        Returns: {
          id: string
          kind: string
          presentation_id: string
          rank: number
          summary: string
          title: string
        }[]
      }
      library_section: {
        Args: { _text: string; _titel: string }
        Returns: string
      }
      library_value: { Args: { _feld: string; _wert: string }; Returns: string }
      mark_notifications_read: { Args: { _ids?: string[] }; Returns: number }
      module_enabled: { Args: { _key: string }; Returns: boolean }
      module_status: {
        Args: never
        Returns: {
          active: boolean
          description: string
          enabled: boolean
          key: string
          kind: string
          label: string
          requires: string
          sort_order: number
        }[]
      }
      onboarding_completed_tasks: { Args: never; Returns: string[] }
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
          board_members: string
          color_accent_text: string
          color_dark: string
          color_muted: string
          color_primary: string
          color_surface: string
          favicon_path: string
          font_body: string
          font_headings: string
          footer_legal_label: string
          footer_navigation_label: string
          hosting_address: string
          hosting_provider: string
          logo_in_header: boolean
          logo_path: string
          org_city: string
          org_country: string
          org_email: string
          org_form: string
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
          setup_done_at: string
          statutes_link: boolean
          vat_id: string
          website_url: string
        }[]
      }
      public_contribution_settings: {
        Args: never
        Returns: {
          model: string
          options: Json
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
      remove_contribution_category: { Args: { _key: string }; Returns: Json }
      restore_contribution_category: {
        Args: { _key: string }
        Returns: undefined
      }
      role_status: {
        Args: never
        Returns: {
          description: string
          is_board: boolean
          is_default: boolean
          is_leadership: boolean
          is_system: boolean
          key: string
          label: string
          max_holders: number
          member_count: number
          permission_count: number
          public_listed: boolean
          sort_order: number
        }[]
      }
      seo_organization_pages: {
        Args: never
        Returns: {
          id: string
          slug: string
          title: string
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
      setup_needed: { Args: never; Returns: boolean }
      setup_status: { Args: never; Returns: Json }
      source_text_files: {
        Args: never
        Returns: {
          file_key: string
          pages: number
        }[]
      }
      source_text_fold: { Args: { _t: string }; Returns: string }
      source_text_query: { Args: { _q: string }; Returns: unknown }
      source_text_save: {
        Args: { _file_key: string; _pages: string[] }
        Returns: number
      }
      source_text_search: {
        Args: { _max?: number; _q: string }
        Returns: {
          epoch: string
          folder_id: string
          page: number
          rank: number
          snippet: string
          source_id: string
          title: string
        }[]
      }
      statutes_options: {
        Args: never
        Returns: {
          created_at: string
          id: string
          title: string
        }[]
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
      forum_category_status: ["vorgeschlagen", "aktiv", "archiviert"],
      forum_post_kind: ["beitrag", "umfrage", "mitbringliste"],
      forum_watch_level: ["beobachten", "verfolgen", "stumm"],
    },
  },
} as const
