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
      admin_alerts: {
        Row: {
          context: Json
          created_at: string
          id: string
          message: string | null
          resolved_at: string | null
          severity: string
          source: string
          title: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          severity?: string
          source: string
          title: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string
          title?: string
        }
        Relationships: []
      }
      ai_sample_generations: {
        Row: {
          brief: string | null
          company: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          fonts: Json | null
          id: string
          image_url: string | null
          is_refinement: boolean
          metadata: Json
          palette: Json | null
          parent_id: string | null
          phone: string | null
          preview_slug: string | null
          source: string
          storage_path: string | null
          visitor_id: string | null
        }
        Insert: {
          brief?: string | null
          company?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          fonts?: Json | null
          id?: string
          image_url?: string | null
          is_refinement?: boolean
          metadata?: Json
          palette?: Json | null
          parent_id?: string | null
          phone?: string | null
          preview_slug?: string | null
          source?: string
          storage_path?: string | null
          visitor_id?: string | null
        }
        Update: {
          brief?: string | null
          company?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          fonts?: Json | null
          id?: string
          image_url?: string | null
          is_refinement?: boolean
          metadata?: Json
          palette?: Json | null
          parent_id?: string | null
          phone?: string | null
          preview_slug?: string | null
          source?: string
          storage_path?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_sample_generations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ai_sample_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          bot_paused: boolean
          client_id: string
          contact_id: string | null
          created_at: string
          id: string
          manual_handoff_at: string | null
          updated_at: string
        }
        Insert: {
          bot_paused?: boolean
          client_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          manual_handoff_at?: string | null
          updated_at?: string
        }
        Update: {
          bot_paused?: boolean
          client_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          manual_handoff_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          brand_colours: string | null
          company: string | null
          content_notes: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          notes: string | null
          page_count: number | null
          requirements: string | null
          updated_at: string
        }
        Insert: {
          brand_colours?: string | null
          company?: string | null
          content_notes?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          notes?: string | null
          page_count?: number | null
          requirements?: string | null
          updated_at?: string
        }
        Update: {
          brand_colours?: string | null
          company?: string | null
          content_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          notes?: string | null
          page_count?: number | null
          requirements?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_events: {
        Row: {
          callback_at: string | null
          completed_at: string | null
          contact_id: string
          created_at: string
          created_by_email: string | null
          created_by_user_id: string | null
          description: string | null
          event_type: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          callback_at?: string | null
          completed_at?: string | null
          contact_id: string
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          description?: string | null
          event_type?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          callback_at?: string | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          description?: string | null
          event_type?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inquiries: {
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
      contact_persons: {
        Row: {
          contact_id: string
          created_at: string
          created_by_email: string | null
          created_by_user_id: string | null
          email: string | null
          id: string
          job_title: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          email?: string | null
          id?: string
          job_title?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          email?: string | null
          id?: string
          job_title?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_persons_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          actual_website_url: string | null
          contact_name: string | null
          created_at: string
          created_by_email: string | null
          created_by_user_id: string | null
          email: string | null
          id: string
          industry: string
          lead_score: number | null
          lead_score_reason: string | null
          location: string | null
          media: Json
          name: string
          notes: string | null
          phone: string | null
          social_url: string | null
          source: string
          source_platform: string | null
          source_url: string | null
          status: string
          updated_at: string
          website: string | null
          website_status: string
        }
        Insert: {
          actual_website_url?: string | null
          contact_name?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          email?: string | null
          id?: string
          industry?: string
          lead_score?: number | null
          lead_score_reason?: string | null
          location?: string | null
          media?: Json
          name: string
          notes?: string | null
          phone?: string | null
          social_url?: string | null
          source?: string
          source_platform?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          website_status?: string
        }
        Update: {
          actual_website_url?: string | null
          contact_name?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          email?: string | null
          id?: string
          industry?: string
          lead_score?: number | null
          lead_score_reason?: string | null
          location?: string | null
          media?: Json
          name?: string
          notes?: string | null
          phone?: string | null
          social_url?: string | null
          source?: string
          source_platform?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          website_status?: string
        }
        Relationships: []
      }
      custom_payment_links: {
        Row: {
          amount_gbp: number
          client_email: string | null
          created_at: string
          created_by_email: string | null
          created_by_user_id: string | null
          currency: string
          description: string
          id: string
          internal_note: string | null
          mode: string
          paid_at: string | null
          paid_session_id: string | null
          quantity: number
          status: string
          stripe_payment_link_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          amount_gbp: number
          client_email?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          currency?: string
          description: string
          id?: string
          internal_note?: string | null
          mode?: string
          paid_at?: string | null
          paid_session_id?: string | null
          quantity?: number
          status?: string
          stripe_payment_link_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          amount_gbp?: number
          client_email?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          currency?: string
          description?: string
          id?: string
          internal_note?: string | null
          mode?: string
          paid_at?: string | null
          paid_session_id?: string | null
          quantity?: number
          status?: string
          stripe_payment_link_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      customer_hidden_visions: {
        Row: {
          created_at: string
          slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_lead_sources: {
        Row: {
          created_at: string
          email: string
          label: string | null
          source_key: string
        }
        Insert: {
          created_at?: string
          email: string
          label?: string | null
          source_key: string
        }
        Update: {
          created_at?: string
          email?: string
          label?: string | null
          source_key?: string
        }
        Relationships: []
      }
      domain_registrations: {
        Row: {
          attempts: number
          created_at: string
          domain: string
          error: string | null
          expires_at: string | null
          id: string
          idempotency_key: string | null
          registrar: string
          registrar_response: Json | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          domain: string
          error?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          registrar?: string
          registrar_response?: Json | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          domain?: string
          error?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          registrar?: string
          registrar_response?: Json | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      edit_requests: {
        Row: {
          attachments: Json
          created_at: string
          customer_email: string | null
          id: string
          package_name: string
          request_details: string
          request_number: number
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          customer_email?: string | null
          id?: string
          package_name: string
          request_details: string
          request_number: number
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          customer_email?: string | null
          id?: string
          package_name?: string
          request_details?: string
          request_number?: number
          session_id?: string
          status?: string
          updated_at?: string
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
      lead_search_history: {
        Row: {
          created_at: string
          id: string
          location: string | null
          outcome: string
          reason: string | null
          source_url: string
          trade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          outcome?: string
          reason?: string | null
          source_url: string
          trade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          outcome?: string
          reason?: string | null
          source_url?: string
          trade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lets_talk_leads: {
        Row: {
          attachment_urls: string[] | null
          created_at: string
          delivered_at: string | null
          delivered_domain: string | null
          email: string | null
          id: string
          name: string
          package_name: string | null
          paid_at: string | null
          paid_session_id: string | null
          phone: string | null
          request_details: Json | null
          source: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          created_at?: string
          delivered_at?: string | null
          delivered_domain?: string | null
          email?: string | null
          id?: string
          name: string
          package_name?: string | null
          paid_at?: string | null
          paid_session_id?: string | null
          phone?: string | null
          request_details?: Json | null
          source?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          created_at?: string
          delivered_at?: string | null
          delivered_domain?: string | null
          email?: string | null
          id?: string
          name?: string
          package_name?: string | null
          paid_at?: string | null
          paid_session_id?: string | null
          phone?: string | null
          request_details?: Json | null
          source?: string | null
        }
        Relationships: []
      }
      login_handoffs: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id: string
          token?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string | null
        }
        Relationships: []
      }
      login_link_requests: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number
          full_url: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          full_url?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          full_url?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          job_type: string
          payload: Json
          progress: number
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          job_type: string
          payload?: Json
          progress?: number
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          job_type?: string
          payload?: Json
          progress?: number
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_requirements: {
        Row: {
          attachments: Json
          colours_styles: string
          created_at: string
          customer_email: string | null
          extra_notes: string | null
          id: string
          images_content_socials: string
          pages_details: string
          reference_links: string | null
          session_id: string
          site_contents: string
          site_name: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          colours_styles: string
          created_at?: string
          customer_email?: string | null
          extra_notes?: string | null
          id?: string
          images_content_socials: string
          pages_details: string
          reference_links?: string | null
          session_id: string
          site_contents: string
          site_name: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          colours_styles?: string
          created_at?: string
          customer_email?: string | null
          extra_notes?: string | null
          id?: string
          images_content_socials?: string
          pages_details?: string
          reference_links?: string | null
          session_id?: string
          site_contents?: string
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_status: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_broadcasts: {
        Row: {
          body: string
          completed_at: string | null
          created_at: string
          created_by_email: string | null
          created_by_user_id: string | null
          delivered_count: number
          failed_count: number
          filters: Json
          id: string
          recipient_count: number
          reply_count: number
          scheduled_for: string | null
          sender_id: string | null
          sent_count: number
          started_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body: string
          completed_at?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          delivered_count?: number
          failed_count?: number
          filters?: Json
          id?: string
          recipient_count?: number
          reply_count?: number
          scheduled_for?: string | null
          sender_id?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          completed_at?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          delivered_count?: number
          failed_count?: number
          filters?: Json
          id?: string
          recipient_count?: number
          reply_count?: number
          scheduled_for?: string | null
          sender_id?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_inbound_replies: {
        Row: {
          body: string
          contact_id: string | null
          created_at: string
          from_phone: string
          handled: boolean
          handled_at: string | null
          handled_by: string | null
          id: string
          message_id: string | null
          to_phone: string | null
        }
        Insert: {
          body: string
          contact_id?: string | null
          created_at?: string
          from_phone: string
          handled?: boolean
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message_id?: string | null
          to_phone?: string | null
        }
        Update: {
          body?: string
          contact_id?: string | null
          created_at?: string
          from_phone?: string
          handled?: boolean
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message_id?: string | null
          to_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_inbound_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "sms_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          body: string
          broadcast_id: string | null
          contact_id: string | null
          contact_person_id: string | null
          created_at: string
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          from_phone: string | null
          id: string
          price: number | null
          price_unit: string | null
          segments: number | null
          sent_at: string | null
          status: string
          to_phone: string | null
          twilio_sid: string | null
          updated_at: string
        }
        Insert: {
          body: string
          broadcast_id?: string | null
          contact_id?: string | null
          contact_person_id?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          from_phone?: string | null
          id?: string
          price?: number | null
          price_unit?: string | null
          segments?: number | null
          sent_at?: string | null
          status?: string
          to_phone?: string | null
          twilio_sid?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          broadcast_id?: string | null
          contact_id?: string | null
          contact_person_id?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          from_phone?: string | null
          id?: string
          price?: number | null
          price_unit?: string | null
          segments?: number | null
          sent_at?: string | null
          status?: string
          to_phone?: string | null
          twilio_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "sms_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_opt_outs: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          phone: string
          reason: string
          source: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          phone: string
          reason?: string
          source?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          phone?: string
          reason?: string
          source?: string
        }
        Relationships: []
      }
      sms_settings: {
        Row: {
          enforce_quiet_hours: boolean
          footer: string
          id: number
          quiet_hours_end: number
          quiet_hours_start: number
          rate_per_second: number
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          enforce_quiet_hours?: boolean
          footer?: string
          id?: number
          quiet_hours_end?: number
          quiet_hours_start?: number
          rate_per_second?: number
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          enforce_quiet_hours?: boolean
          footer?: string
          id?: number
          quiet_hours_end?: number
          quiet_hours_start?: number
          rate_per_second?: number
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stripe_checkout_sessions: {
        Row: {
          amount_total: number | null
          auth_expires_at: string | null
          cancel_reason: string | null
          canceled_at: string | null
          capture_status: string | null
          captured_at: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_id: string | null
          delivered_at: string | null
          delivered_domain: string | null
          dispute_amount: number | null
          dispute_id: string | null
          dispute_reason: string | null
          dispute_status: string | null
          disputed_at: string | null
          domain: string | null
          domain_status: string | null
          domain_top_up_gbp: number | null
          id: string
          metadata: Json
          mode: string | null
          order_code: string | null
          order_status: string
          payment_intent_id: string | null
          payment_status: string | null
          refund_reason: string | null
          refunded_amount: number | null
          refunded_at: string | null
          requirements_token: string | null
          session_id: string
          status: string | null
          stripe_event_id: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_total?: number | null
          auth_expires_at?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          capture_status?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivered_domain?: string | null
          dispute_amount?: number | null
          dispute_id?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          disputed_at?: string | null
          domain?: string | null
          domain_status?: string | null
          domain_top_up_gbp?: number | null
          id?: string
          metadata?: Json
          mode?: string | null
          order_code?: string | null
          order_status?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          refund_reason?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          requirements_token?: string | null
          session_id: string
          status?: string | null
          stripe_event_id: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_total?: number | null
          auth_expires_at?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          capture_status?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivered_domain?: string | null
          dispute_amount?: number | null
          dispute_id?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          disputed_at?: string | null
          domain?: string | null
          domain_status?: string | null
          domain_top_up_gbp?: number | null
          id?: string
          metadata?: Json
          mode?: string | null
          order_code?: string | null
          order_status?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          refund_reason?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          requirements_token?: string | null
          session_id?: string
          status?: string | null
          stripe_event_id?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_checkout_sessions_stripe_event_fk"
            columns: ["stripe_event_id"]
            isOneToOne: false
            referencedRelation: "stripe_events"
            referencedColumns: ["stripe_event_id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          checkout_session_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          stripe_event_id: string
        }
        Insert: {
          checkout_session_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          stripe_event_id: string
        }
        Update: {
          checkout_session_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          stripe_event_id?: string
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
      vision_previews: {
        Row: {
          brief: string | null
          client_email: string | null
          comparison_image_path: string | null
          created_at: string
          created_by_email: string | null
          created_by_user_id: string | null
          fonts: Json | null
          id: string
          image_path: string
          palette: Json | null
          sent_at: string | null
          slug: string
          title: string | null
          updated_at: string
        }
        Insert: {
          brief?: string | null
          client_email?: string | null
          comparison_image_path?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          fonts?: Json | null
          id?: string
          image_path: string
          palette?: Json | null
          sent_at?: string | null
          slug: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          brief?: string | null
          client_email?: string | null
          comparison_image_path?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_user_id?: string | null
          fonts?: Json | null
          id?: string
          image_path?: string
          palette?: Json | null
          sent_at?: string | null
          slug?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      visitor_falloffs: {
        Row: {
          as_domain: string | null
          as_name: string | null
          as_route: string | null
          asn: string | null
          billing: string | null
          browser_language: string | null
          buy_clicked_at: string | null
          carrier_mcc: string | null
          carrier_mnc: string | null
          carrier_name: string | null
          checkout_session_id: string | null
          checkout_started_at: string | null
          company_domain: string | null
          company_name: string | null
          company_type: string | null
          consent_status: string
          created_at: string
          customer_email: string | null
          enriched_at: string | null
          enrichment_error: string | null
          enrichment_source: string | null
          enrichment_status: string
          event_count: number
          first_page: string | null
          id: string
          ip_address: string | null
          ip_city: string | null
          ip_country: string | null
          ip_hostname: string | null
          ip_location: string | null
          ip_postal: string | null
          ip_region: string | null
          ip_timezone: string | null
          last_page: string | null
          last_seen_at: string
          max_scroll_percent: number
          metadata: Json
          package_name: string | null
          portfolio_opened_at: string | null
          portfolio_pages_viewed: number
          portfolio_project_opened: string | null
          portfolio_project_opened_at: string | null
          price_id: string | null
          pricing_opened_at: string | null
          privacy_hosting: boolean | null
          privacy_proxy: boolean | null
          privacy_relay: boolean | null
          privacy_tor: boolean | null
          privacy_vpn: boolean | null
          referrer: string | null
          screen_size: string | null
          session_id: string
          timezone: string | null
          updated_at: string
          user_agent: string | null
          viewport_size: string | null
          visitor_id: string
        }
        Insert: {
          as_domain?: string | null
          as_name?: string | null
          as_route?: string | null
          asn?: string | null
          billing?: string | null
          browser_language?: string | null
          buy_clicked_at?: string | null
          carrier_mcc?: string | null
          carrier_mnc?: string | null
          carrier_name?: string | null
          checkout_session_id?: string | null
          checkout_started_at?: string | null
          company_domain?: string | null
          company_name?: string | null
          company_type?: string | null
          consent_status?: string
          created_at?: string
          customer_email?: string | null
          enriched_at?: string | null
          enrichment_error?: string | null
          enrichment_source?: string | null
          enrichment_status?: string
          event_count?: number
          first_page?: string | null
          id?: string
          ip_address?: string | null
          ip_city?: string | null
          ip_country?: string | null
          ip_hostname?: string | null
          ip_location?: string | null
          ip_postal?: string | null
          ip_region?: string | null
          ip_timezone?: string | null
          last_page?: string | null
          last_seen_at?: string
          max_scroll_percent?: number
          metadata?: Json
          package_name?: string | null
          portfolio_opened_at?: string | null
          portfolio_pages_viewed?: number
          portfolio_project_opened?: string | null
          portfolio_project_opened_at?: string | null
          price_id?: string | null
          pricing_opened_at?: string | null
          privacy_hosting?: boolean | null
          privacy_proxy?: boolean | null
          privacy_relay?: boolean | null
          privacy_tor?: boolean | null
          privacy_vpn?: boolean | null
          referrer?: string | null
          screen_size?: string | null
          session_id: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          viewport_size?: string | null
          visitor_id: string
        }
        Update: {
          as_domain?: string | null
          as_name?: string | null
          as_route?: string | null
          asn?: string | null
          billing?: string | null
          browser_language?: string | null
          buy_clicked_at?: string | null
          carrier_mcc?: string | null
          carrier_mnc?: string | null
          carrier_name?: string | null
          checkout_session_id?: string | null
          checkout_started_at?: string | null
          company_domain?: string | null
          company_name?: string | null
          company_type?: string | null
          consent_status?: string
          created_at?: string
          customer_email?: string | null
          enriched_at?: string | null
          enrichment_error?: string | null
          enrichment_source?: string | null
          enrichment_status?: string
          event_count?: number
          first_page?: string | null
          id?: string
          ip_address?: string | null
          ip_city?: string | null
          ip_country?: string | null
          ip_hostname?: string | null
          ip_location?: string | null
          ip_postal?: string | null
          ip_region?: string | null
          ip_timezone?: string | null
          last_page?: string | null
          last_seen_at?: string
          max_scroll_percent?: number
          metadata?: Json
          package_name?: string | null
          portfolio_opened_at?: string | null
          portfolio_pages_viewed?: number
          portfolio_project_opened?: string | null
          portfolio_project_opened_at?: string | null
          price_id?: string | null
          pricing_opened_at?: string | null
          privacy_hosting?: boolean | null
          privacy_proxy?: boolean | null
          privacy_relay?: boolean | null
          privacy_tor?: boolean | null
          privacy_vpn?: boolean | null
          referrer?: string | null
          screen_size?: string | null
          session_id?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          viewport_size?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_login_handoff: { Args: { _sid: string }; Returns: Json }
      customer_fetch_portal: { Args: never; Returns: Json }
      customer_lead_source_for: { Args: { _user_id: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_admin_role_for_email: {
        Args: { _email: string }
        Returns: undefined
      }
      ensure_order_public_reference: {
        Args: { _session_id: string }
        Returns: Json
      }
      fetch_chat_history: { Args: { _client_id: string }; Returns: Json }
      generate_order_code: { Args: never; Returns: string }
      get_vision_preview_by_slug: {
        Args: { _slug: string }
        Returns: {
          brief: string
          comparison_image_path: string
          created_at: string
          fonts: Json
          image_path: string
          palette: Json
          slug: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_manual_order_to_stripe: {
        Args: { _real_session_id: string }
        Returns: string
      }
      merge_contacts: {
        Args: { duplicate_ids: string[]; survivor_id: string }
        Returns: Json
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
      portal_add_contact_person: {
        Args: {
          _contact_id: string
          _email?: string
          _job_title?: string
          _name: string
          _phone?: string
        }
        Returns: Json
      }
      portal_close_chat_case: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      portal_complete_callback: {
        Args: { _event_id: string }
        Returns: undefined
      }
      portal_create_contact:
        | {
            Args: {
              _email?: string
              _location?: string
              _name: string
              _notes?: string
              _phone?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _email?: string
              _industry?: string
              _location?: string
              _name: string
              _notes?: string
              _phone?: string
              _website?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _contact_name?: string
              _email?: string
              _industry?: string
              _location?: string
              _name: string
              _notes?: string
              _phone?: string
              _website?: string
            }
            Returns: Json
          }
      portal_create_contact_event:
        | {
            Args: {
              _access_code: string
              _callback_at?: string
              _contact_id: string
              _description?: string
              _title: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _callback_at?: string
              _contact_id: string
              _description?: string
              _title: string
            }
            Returns: Json
          }
      portal_create_manual_order: {
        Args: {
          _amount_pence?: number
          _billing?: string
          _custom_label?: string
          _customer_email: string
          _customer_name?: string
          _mark_paid?: boolean
          _notes?: string
          _package_name?: string
        }
        Returns: Json
      }
      portal_delete_contact_person: {
        Args: { _person_id: string }
        Returns: undefined
      }
      portal_fetch_messages: {
        Args: { _conversation_id: string }
        Returns: Json
      }
      portal_fetch_section: {
        Args: { _limit?: number; _offset?: number; _section: string }
        Returns: Json
      }
      portal_fetch_snapshot: { Args: { _limit?: number }; Returns: Json }
      portal_mark_order_delivered:
        | {
            Args: {
              _access_code: string
              _delivered_domain: string
              _session_id: string
            }
            Returns: undefined
          }
        | {
            Args: { _delivered_domain: string; _session_id: string }
            Returns: undefined
          }
      portal_mark_order_undelivered:
        | {
            Args: { _access_code: string; _session_id: string }
            Returns: undefined
          }
        | { Args: { _session_id: string }; Returns: undefined }
      portal_mark_sample_delivered: {
        Args: { _delivered_domain: string; _sample_id: string }
        Returns: undefined
      }
      portal_mark_sample_undelivered: {
        Args: { _sample_id: string }
        Returns: undefined
      }
      portal_require_admin: { Args: never; Returns: undefined }
      portal_search_customers: { Args: { _q: string }; Returns: Json }
      portal_send_chat_reply: {
        Args: { _content: string; _conversation_id: string }
        Returns: undefined
      }
      portal_update_contact:
        | {
            Args: {
              _contact_id: string
              _email?: string
              _location?: string
              _name: string
              _notes?: string
              _phone?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _contact_id: string
              _email?: string
              _industry?: string
              _location?: string
              _name: string
              _notes?: string
              _phone?: string
              _website?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _contact_id: string
              _contact_name?: string
              _email?: string
              _industry?: string
              _location?: string
              _name: string
              _notes?: string
              _phone?: string
              _website?: string
            }
            Returns: undefined
          }
      portal_update_contact_media: {
        Args: { _contact_id: string; _media: Json }
        Returns: undefined
      }
      portal_update_contact_status: {
        Args: { _contact_id: string; _status: string }
        Returns: undefined
      }
      portal_update_edit_request_status: {
        Args: { _request_id: string; _status: string }
        Returns: undefined
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
