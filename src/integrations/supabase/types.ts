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
      adjustment_note_items: {
        Row: {
          adjustment_note_id: string
          amount: number | null
          created_at: string
          description: string
          external_product_id: string | null
          gl_account_id: string | null
          id: string
          metadata: Json | null
          product_id: string | null
          quantity: number | null
          sku: string | null
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          adjustment_note_id: string
          amount?: number | null
          created_at?: string
          description: string
          external_product_id?: string | null
          gl_account_id?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          sku?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id: string
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          adjustment_note_id?: string
          amount?: number | null
          created_at?: string
          description?: string
          external_product_id?: string | null
          gl_account_id?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          sku?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_note_items_adjustment_note_id_fkey"
            columns: ["adjustment_note_id"]
            isOneToOne: false
            referencedRelation: "adjustment_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_adjustment_note_id_fkey"
            columns: ["adjustment_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_adjustment_note_id_fkey"
            columns: ["adjustment_note_id"]
            isOneToOne: false
            referencedRelation: "debit_notes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_adjustment_note_id_fkey"
            columns: ["adjustment_note_id"]
            isOneToOne: false
            referencedRelation: "vendor_credit_notes_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_external_product_id_fkey"
            columns: ["external_product_id"]
            isOneToOne: false
            referencedRelation: "external_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "adjustment_note_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      adjustment_notes: {
        Row: {
          applied_amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          direction: string
          discount_amount: number | null
          due_date: string | null
          exchange_rate: number | null
          gl_account_id: string | null
          id: string
          metadata: Json | null
          note_date: string
          note_number: string
          note_type: string
          notes: string | null
          original_bill_id: string | null
          original_invoice_id: string | null
          original_order_id: string | null
          party_address: string | null
          party_email: string | null
          party_id: string | null
          party_name: string | null
          party_tax_code: string | null
          reason: string | null
          reference_number: string | null
          remaining_amount: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string
          terms: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          applied_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          direction: string
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          gl_account_id?: string | null
          id?: string
          metadata?: Json | null
          note_date?: string
          note_number: string
          note_type: string
          notes?: string | null
          original_bill_id?: string | null
          original_invoice_id?: string | null
          original_order_id?: string | null
          party_address?: string | null
          party_email?: string | null
          party_id?: string | null
          party_name?: string | null
          party_tax_code?: string | null
          reason?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id: string
          terms?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          applied_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          direction?: string
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          gl_account_id?: string | null
          id?: string
          metadata?: Json | null
          note_date?: string
          note_number?: string
          note_type?: string
          notes?: string | null
          original_bill_id?: string | null
          original_invoice_id?: string | null
          original_order_id?: string | null
          party_address?: string | null
          party_email?: string | null
          party_id?: string | null
          party_name?: string | null
          party_tax_code?: string | null
          reason?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string
          terms?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_notes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_advisor_config: {
        Row: {
          allow_multiple_options: boolean | null
          allow_questions: boolean | null
          created_at: string | null
          default_response: string | null
          id: string
          max_actions_per_response: number | null
          min_confidence_to_speak: number | null
          min_samples_to_speak: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_multiple_options?: boolean | null
          allow_questions?: boolean | null
          created_at?: string | null
          default_response?: string | null
          id?: string
          max_actions_per_response?: number | null
          min_confidence_to_speak?: number | null
          min_samples_to_speak?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_multiple_options?: boolean | null
          allow_questions?: boolean | null
          created_at?: string | null
          default_response?: string | null
          id?: string
          max_actions_per_response?: number | null
          min_confidence_to_speak?: number | null
          min_samples_to_speak?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_advisor_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_advisor_responses: {
        Row: {
          action_target: string | null
          action_verb: string | null
          actioned_at: string | null
          alert_id: string | null
          based_on_pattern_id: string | null
          based_on_samples: number | null
          confidence_score: number
          created_at: string | null
          decision_type: string | null
          id: string
          is_silent: boolean | null
          metric_code: string | null
          outcome_measured: boolean | null
          recommendation: string | null
          surfaced_at: string | null
          tenant_id: string
        }
        Insert: {
          action_target?: string | null
          action_verb?: string | null
          actioned_at?: string | null
          alert_id?: string | null
          based_on_pattern_id?: string | null
          based_on_samples?: number | null
          confidence_score: number
          created_at?: string | null
          decision_type?: string | null
          id?: string
          is_silent?: boolean | null
          metric_code?: string | null
          outcome_measured?: boolean | null
          recommendation?: string | null
          surfaced_at?: string | null
          tenant_id: string
        }
        Update: {
          action_target?: string | null
          action_verb?: string | null
          actioned_at?: string | null
          alert_id?: string | null
          based_on_pattern_id?: string | null
          based_on_samples?: number | null
          confidence_score?: number
          created_at?: string | null
          decision_type?: string | null
          id?: string
          is_silent?: boolean | null
          metric_code?: string | null
          outcome_measured?: boolean | null
          recommendation?: string | null
          surfaced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_advisor_responses_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "early_warning_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_responses_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "v_active_alerts_hierarchy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_responses_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "v_alerts_pending_escalation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_responses_based_on_pattern_id_fkey"
            columns: ["based_on_pattern_id"]
            isOneToOne: false
            referencedRelation: "decision_learning_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string
          estimated_cost: number | null
          function_name: string
          id: string
          model: string
          prompt_tokens: number
          tenant_id: string | null
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          estimated_cost?: number | null
          function_name: string
          id?: string
          model: string
          prompt_tokens?: number
          tenant_id?: string | null
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          estimated_cost?: number | null
          function_name?: string
          id?: string
          model?: string
          prompt_tokens?: number
          tenant_id?: string | null
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_calculations_log: {
        Row: {
          calculated_at: string
          calculation_type: string
          id: string
          input_values: Json
          is_triggered: boolean | null
          object_id: string | null
          output_value: number | null
          rule_id: string | null
          tenant_id: string
          threshold_value: number | null
        }
        Insert: {
          calculated_at?: string
          calculation_type: string
          id?: string
          input_values: Json
          is_triggered?: boolean | null
          object_id?: string | null
          output_value?: number | null
          rule_id?: string | null
          tenant_id: string
          threshold_value?: number | null
        }
        Update: {
          calculated_at?: string
          calculation_type?: string
          id?: string
          input_values?: Json
          is_triggered?: boolean | null
          object_id?: string | null
          output_value?: number | null
          rule_id?: string | null
          tenant_id?: string
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_calculations_log_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "alert_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_calculations_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "intelligent_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_calculations_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_data_sources: {
        Row: {
          connector_integration_id: string | null
          created_at: string
          error_message: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          next_sync_at: string | null
          source_config: Json | null
          source_name: string
          source_type: string
          sync_frequency_minutes: number | null
          sync_status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          connector_integration_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          source_config?: Json | null
          source_name: string
          source_type: string
          sync_frequency_minutes?: number | null
          sync_status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          connector_integration_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          source_config?: Json | null
          source_name?: string
          source_type?: string
          sync_frequency_minutes?: number | null
          sync_status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_data_sources_connector_integration_id_fkey"
            columns: ["connector_integration_id"]
            isOneToOne: false
            referencedRelation: "connector_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_data_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_digest_configs: {
        Row: {
          created_at: string
          daily_enabled: boolean
          daily_time: string
          id: string
          include_resolved: boolean
          include_summary: boolean
          tenant_id: string
          updated_at: string
          weekly_day: number
          weekly_enabled: boolean
          weekly_time: string
        }
        Insert: {
          created_at?: string
          daily_enabled?: boolean
          daily_time?: string
          id?: string
          include_resolved?: boolean
          include_summary?: boolean
          tenant_id: string
          updated_at?: string
          weekly_day?: number
          weekly_enabled?: boolean
          weekly_time?: string
        }
        Update: {
          created_at?: string
          daily_enabled?: boolean
          daily_time?: string
          id?: string
          include_resolved?: boolean
          include_summary?: boolean
          tenant_id?: string
          updated_at?: string
          weekly_day?: number
          weekly_enabled?: boolean
          weekly_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_digest_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_escalation_rules: {
        Row: {
          created_at: string
          escalate_after_minutes: number
          escalate_to_role: string
          id: string
          is_active: boolean
          name: string
          notify_channels: Json
          severity: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalate_after_minutes?: number
          escalate_to_role?: string
          id?: string
          is_active?: boolean
          name: string
          notify_channels?: Json
          severity?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalate_after_minutes?: number
          escalate_to_role?: string
          id?: string
          is_active?: boolean
          name?: string
          notify_channels?: Json
          severity?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_hierarchy_rules: {
        Row: {
          child_metric_code: string
          collapse_threshold: number | null
          created_at: string | null
          hierarchy_level: number
          id: string
          parent_metric_code: string
          root_cause_template: string | null
        }
        Insert: {
          child_metric_code: string
          collapse_threshold?: number | null
          created_at?: string | null
          hierarchy_level: number
          id?: string
          parent_metric_code: string
          root_cause_template?: string | null
        }
        Update: {
          child_metric_code?: string
          collapse_threshold?: number | null
          created_at?: string | null
          hierarchy_level?: number
          id?: string
          parent_metric_code?: string
          root_cause_template?: string | null
        }
        Relationships: []
      }
      alert_instances: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_priority: string | null
          action_url: string | null
          alert_config_id: string | null
          alert_object_id: string | null
          alert_type: string
          assigned_at: string | null
          assigned_to: string | null
          auto_action_available: boolean | null
          calculation_details: Json | null
          category: string
          change_percent: number | null
          created_at: string
          current_value: number | null
          data_source_id: string | null
          deadline_at: string | null
          external_object_id: string | null
          id: string
          impact_amount: number | null
          impact_currency: string | null
          impact_description: string | null
          linked_decision_card_id: string | null
          message: string | null
          metadata: Json | null
          metric_name: string | null
          notification_channels: Json | null
          notification_sent: boolean | null
          object_name: string | null
          object_type: string | null
          priority: number | null
          related_alerts: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_decision: boolean | null
          sent_at: string | null
          sent_to: Json | null
          severity: string
          snoozed_until: string | null
          status: string | null
          suggested_action: string | null
          tenant_id: string
          threshold_operator: string | null
          threshold_value: number | null
          time_to_resolve_hours: number | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_priority?: string | null
          action_url?: string | null
          alert_config_id?: string | null
          alert_object_id?: string | null
          alert_type: string
          assigned_at?: string | null
          assigned_to?: string | null
          auto_action_available?: boolean | null
          calculation_details?: Json | null
          category: string
          change_percent?: number | null
          created_at?: string
          current_value?: number | null
          data_source_id?: string | null
          deadline_at?: string | null
          external_object_id?: string | null
          id?: string
          impact_amount?: number | null
          impact_currency?: string | null
          impact_description?: string | null
          linked_decision_card_id?: string | null
          message?: string | null
          metadata?: Json | null
          metric_name?: string | null
          notification_channels?: Json | null
          notification_sent?: boolean | null
          object_name?: string | null
          object_type?: string | null
          priority?: number | null
          related_alerts?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_decision?: boolean | null
          sent_at?: string | null
          sent_to?: Json | null
          severity?: string
          snoozed_until?: string | null
          status?: string | null
          suggested_action?: string | null
          tenant_id: string
          threshold_operator?: string | null
          threshold_value?: number | null
          time_to_resolve_hours?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_priority?: string | null
          action_url?: string | null
          alert_config_id?: string | null
          alert_object_id?: string | null
          alert_type?: string
          assigned_at?: string | null
          assigned_to?: string | null
          auto_action_available?: boolean | null
          calculation_details?: Json | null
          category?: string
          change_percent?: number | null
          created_at?: string
          current_value?: number | null
          data_source_id?: string | null
          deadline_at?: string | null
          external_object_id?: string | null
          id?: string
          impact_amount?: number | null
          impact_currency?: string | null
          impact_description?: string | null
          linked_decision_card_id?: string | null
          message?: string | null
          metadata?: Json | null
          metric_name?: string | null
          notification_channels?: Json | null
          notification_sent?: boolean | null
          object_name?: string | null
          object_type?: string | null
          priority?: number | null
          related_alerts?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_decision?: boolean | null
          sent_at?: string | null
          sent_to?: Json | null
          severity?: string
          snoozed_until?: string | null
          status?: string | null
          suggested_action?: string | null
          tenant_id?: string
          threshold_operator?: string | null
          threshold_value?: number | null
          time_to_resolve_hours?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_instances_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "extended_alert_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_instances_alert_object_id_fkey"
            columns: ["alert_object_id"]
            isOneToOne: false
            referencedRelation: "alert_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_instances_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "alert_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notification_logs: {
        Row: {
          alert_instance_id: string
          channel: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          recipient: string
          sent_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          alert_instance_id: string
          channel: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient: string
          sent_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          alert_instance_id?: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notification_logs_alert_instance_id_fkey"
            columns: ["alert_instance_id"]
            isOneToOne: false
            referencedRelation: "alert_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_object_metrics: {
        Row: {
          alert_object_id: string
          change_percent: number | null
          comparison_value: number | null
          created_at: string
          id: string
          is_threshold_breached: boolean | null
          metric_name: string
          metric_period: string | null
          metric_unit: string | null
          metric_value: number | null
          recorded_at: string
          tenant_id: string
          threshold_config_id: string | null
        }
        Insert: {
          alert_object_id: string
          change_percent?: number | null
          comparison_value?: number | null
          created_at?: string
          id?: string
          is_threshold_breached?: boolean | null
          metric_name: string
          metric_period?: string | null
          metric_unit?: string | null
          metric_value?: number | null
          recorded_at?: string
          tenant_id: string
          threshold_config_id?: string | null
        }
        Update: {
          alert_object_id?: string
          change_percent?: number | null
          comparison_value?: number | null
          created_at?: string
          id?: string
          is_threshold_breached?: boolean | null
          metric_name?: string
          metric_period?: string | null
          metric_unit?: string | null
          metric_value?: number | null
          recorded_at?: string
          tenant_id?: string
          threshold_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_object_metrics_alert_object_id_fkey"
            columns: ["alert_object_id"]
            isOneToOne: false
            referencedRelation: "alert_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_object_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_object_metrics_threshold_config_id_fkey"
            columns: ["threshold_config_id"]
            isOneToOne: false
            referencedRelation: "extended_alert_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_objects: {
        Row: {
          address: string | null
          alert_status: string | null
          avg_daily_sales: number | null
          created_at: string
          current_metrics: Json | null
          data_source_id: string | null
          days_of_stock: number | null
          external_id: string | null
          id: string
          is_monitored: boolean | null
          last_alert_at: string | null
          last_sale_date: string | null
          lead_time_days: number | null
          manager_name: string | null
          metadata: Json | null
          object_category: string | null
          object_data: Json | null
          object_name: string
          object_type: string
          open_hours: string | null
          phone: string | null
          previous_metrics: Json | null
          reorder_point: number | null
          safety_stock: number | null
          sales_velocity: number | null
          stockout_risk_days: number | null
          synced_at: string | null
          tenant_id: string
          threshold_overrides: Json | null
          trend_direction: string | null
          trend_percent: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          alert_status?: string | null
          avg_daily_sales?: number | null
          created_at?: string
          current_metrics?: Json | null
          data_source_id?: string | null
          days_of_stock?: number | null
          external_id?: string | null
          id?: string
          is_monitored?: boolean | null
          last_alert_at?: string | null
          last_sale_date?: string | null
          lead_time_days?: number | null
          manager_name?: string | null
          metadata?: Json | null
          object_category?: string | null
          object_data?: Json | null
          object_name: string
          object_type: string
          open_hours?: string | null
          phone?: string | null
          previous_metrics?: Json | null
          reorder_point?: number | null
          safety_stock?: number | null
          sales_velocity?: number | null
          stockout_risk_days?: number | null
          synced_at?: string | null
          tenant_id: string
          threshold_overrides?: Json | null
          trend_direction?: string | null
          trend_percent?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          alert_status?: string | null
          avg_daily_sales?: number | null
          created_at?: string
          current_metrics?: Json | null
          data_source_id?: string | null
          days_of_stock?: number | null
          external_id?: string | null
          id?: string
          is_monitored?: boolean | null
          last_alert_at?: string | null
          last_sale_date?: string | null
          lead_time_days?: number | null
          manager_name?: string | null
          metadata?: Json | null
          object_category?: string | null
          object_data?: Json | null
          object_name?: string
          object_type?: string
          open_hours?: string | null
          phone?: string | null
          previous_metrics?: Json | null
          reorder_point?: number | null
          safety_stock?: number | null
          sales_velocity?: number | null
          stockout_risk_days?: number | null
          synced_at?: string | null
          tenant_id?: string
          threshold_overrides?: Json | null
          trend_direction?: string | null
          trend_percent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_objects_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "alert_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_objects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rule_recipients: {
        Row: {
          created_at: string | null
          id: string
          notify_on_critical: boolean | null
          notify_on_info: boolean | null
          notify_on_warning: boolean | null
          recipient_id: string
          rule_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notify_on_critical?: boolean | null
          notify_on_info?: boolean | null
          notify_on_warning?: boolean | null
          recipient_id: string
          rule_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notify_on_critical?: boolean | null
          notify_on_info?: boolean | null
          notify_on_warning?: boolean | null
          recipient_id?: string
          rule_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rule_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "notification_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rule_recipients_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "intelligent_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rule_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_settings: {
        Row: {
          alert_configs: Json
          created_at: string
          email_address: string | null
          id: string
          notification_email: boolean | null
          notification_push: boolean | null
          notification_slack: boolean | null
          notify_daily_summary: boolean | null
          notify_immediately: boolean | null
          notify_weekly_summary: boolean | null
          slack_webhook: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alert_configs?: Json
          created_at?: string
          email_address?: string | null
          id?: string
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_slack?: boolean | null
          notify_daily_summary?: boolean | null
          notify_immediately?: boolean | null
          notify_weekly_summary?: boolean | null
          slack_webhook?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alert_configs?: Json
          created_at?: string
          email_address?: string | null
          id?: string
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_slack?: boolean | null
          notify_daily_summary?: boolean | null
          notify_immediately?: boolean | null
          notify_weekly_summary?: boolean | null
          slack_webhook?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          severity: string | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          severity?: string | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          severity?: string | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          requests_count: number | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          requests_count?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          requests_count?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_decisions: {
        Row: {
          approval_request_id: string
          comment: string | null
          decided_at: string
          decided_by: string
          decision: string
          id: string
          tenant_id: string
        }
        Insert: {
          approval_request_id: string
          comment?: string | null
          decided_at?: string
          decided_by: string
          decision: string
          id?: string
          tenant_id: string
        }
        Update: {
          approval_request_id?: string
          comment?: string | null
          decided_at?: string
          decided_by?: string
          decision?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "mv_audit_approval_evidence"
            referencedColumns: ["approval_request_id"]
          },
          {
            foreignKeyName: "approval_decisions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          action: string
          created_at: string
          current_approvals: number
          expires_at: string | null
          id: string
          policy_id: string
          requested_by: string
          required_approvals: number
          resolved_at: string | null
          resource_data: Json | null
          resource_id: string | null
          resource_type: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          current_approvals?: number
          expires_at?: string | null
          id?: string
          policy_id: string
          requested_by: string
          required_approvals?: number
          resolved_at?: string | null
          resource_data?: Json | null
          resource_id?: string | null
          resource_type: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          current_approvals?: number
          expires_at?: string | null
          id?: string
          policy_id?: string
          requested_by?: string
          required_approvals?: number
          resolved_at?: string | null
          resource_data?: Json | null
          resource_id?: string | null
          resource_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "enterprise_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          actor_service_id: string | null
          actor_type: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          decision_context: string | null
          evidence_hash: string | null
          id: string
          ip_address: string | null
          reason_code: string | null
          reason_detail: string | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          actor_service_id?: string | null
          actor_type: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          decision_context?: string | null
          evidence_hash?: string | null
          id?: string
          ip_address?: string | null
          reason_code?: string | null
          reason_detail?: string | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          actor_service_id?: string | null
          actor_type?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          decision_context?: string | null
          evidence_hash?: string | null
          id?: string
          ip_address?: string | null
          reason_code?: string | null
          reason_detail?: string | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          download_url: string | null
          expires_at: string | null
          export_type: string
          file_hash: string | null
          filters: Json | null
          id: string
          period_end: string
          period_start: string
          record_count: number
          requested_by: string
          status: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          download_url?: string | null
          expires_at?: string | null
          export_type: string
          file_hash?: string | null
          filters?: Json | null
          id?: string
          period_end: string
          period_start: string
          record_count?: number
          requested_by: string
          status?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          download_url?: string | null
          expires_at?: string | null
          export_type?: string
          file_hash?: string | null
          filters?: Json | null
          id?: string
          period_end?: string
          period_start?: string
          record_count?: number
          requested_by?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_exports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auditor_access: {
        Row: {
          access_scope: string[]
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          notes: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          access_scope?: string[]
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          access_scope?: string[]
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditor_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_decision_card_states: {
        Row: {
          auto_card_id: string
          card_snapshot: Json | null
          comment: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          dismiss_reason: string | null
          id: string
          snoozed_until: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_card_id: string
          card_snapshot?: Json | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          dismiss_reason?: string | null
          id?: string
          snoozed_until?: string | null
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_card_id?: string
          card_snapshot?: Json | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          dismiss_reason?: string | null
          id?: string
          snoozed_until?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string | null
          account_number: string
          bank_name: string
          created_at: string
          currency: string | null
          current_balance: number | null
          id: string
          last_sync_at: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          account_name?: string | null
          account_number: string
          bank_name: string
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          id?: string
          last_sync_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string
          bank_name?: string
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          id?: string
          last_sync_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connection_configs: {
        Row: {
          bank_code: string
          bank_name: string
          connection_type: string
          created_at: string
          created_by: string | null
          credentials_encrypted: string | null
          id: string
          is_configured: boolean | null
          last_sync_at: string | null
          status: string
          tenant_id: string
          transaction_count: number | null
          updated_at: string
        }
        Insert: {
          bank_code: string
          bank_name: string
          connection_type?: string
          created_at?: string
          created_by?: string | null
          credentials_encrypted?: string | null
          id?: string
          is_configured?: boolean | null
          last_sync_at?: string | null
          status?: string
          tenant_id: string
          transaction_count?: number | null
          updated_at?: string
        }
        Update: {
          bank_code?: string
          bank_name?: string
          connection_type?: string
          created_at?: string
          created_by?: string | null
          credentials_encrypted?: string | null
          id?: string
          is_configured?: boolean | null
          last_sync_at?: string | null
          status?: string
          tenant_id?: string
          transaction_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_connection_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_covenants: {
        Row: {
          compliance_margin: number | null
          covenant_name: string
          covenant_type: string
          created_at: string
          current_value: number | null
          id: string
          is_active: boolean | null
          last_measured_at: string | null
          lender_name: string
          measurement_frequency: string | null
          next_measurement_date: string | null
          notes: string | null
          status: string | null
          tenant_id: string
          threshold_operator: string
          threshold_value: number
          updated_at: string
          waiver_end_date: string | null
          waiver_notes: string | null
          warning_threshold: number | null
        }
        Insert: {
          compliance_margin?: number | null
          covenant_name: string
          covenant_type: string
          created_at?: string
          current_value?: number | null
          id?: string
          is_active?: boolean | null
          last_measured_at?: string | null
          lender_name: string
          measurement_frequency?: string | null
          next_measurement_date?: string | null
          notes?: string | null
          status?: string | null
          tenant_id: string
          threshold_operator?: string
          threshold_value: number
          updated_at?: string
          waiver_end_date?: string | null
          waiver_notes?: string | null
          warning_threshold?: number | null
        }
        Update: {
          compliance_margin?: number | null
          covenant_name?: string
          covenant_type?: string
          created_at?: string
          current_value?: number | null
          id?: string
          is_active?: boolean | null
          last_measured_at?: string | null
          lender_name?: string
          measurement_frequency?: string | null
          next_measurement_date?: string | null
          notes?: string | null
          status?: string | null
          tenant_id?: string
          threshold_operator?: string
          threshold_value?: number
          updated_at?: string
          waiver_end_date?: string | null
          waiver_notes?: string | null
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_covenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          description: string | null
          id: string
          match_status: string | null
          matched_invoice_id: string | null
          reference: string | null
          tenant_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          match_status?: string | null
          matched_invoice_id?: string | null
          reference?: string | null
          tenant_id?: string | null
          transaction_date: string
          transaction_type: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          match_status?: string | null
          matched_invoice_id?: string | null
          reference?: string | null
          tenant_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "cash_position"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "bank_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bigquery_configs: {
        Row: {
          cache_ttl_minutes: number | null
          channels: Json
          created_at: string
          custom_mappings: Json | null
          dataset_prefix: string
          id: string
          is_active: boolean | null
          project_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cache_ttl_minutes?: number | null
          channels?: Json
          created_at?: string
          custom_mappings?: Json | null
          dataset_prefix?: string
          id?: string
          is_active?: boolean | null
          project_id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cache_ttl_minutes?: number | null
          channels?: Json
          created_at?: string
          custom_mappings?: Json | null
          dataset_prefix?: string
          id?: string
          is_active?: boolean | null
          project_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bigquery_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bigquery_data_models: {
        Row: {
          bigquery_dataset: string
          bigquery_table: string
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean | null
          last_sync_at: string | null
          mapping_config: Json | null
          model_label: string
          model_name: string
          primary_key_field: string
          sync_frequency_hours: number | null
          target_table: string | null
          tenant_id: string
          timestamp_field: string | null
          updated_at: string
        }
        Insert: {
          bigquery_dataset: string
          bigquery_table: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          mapping_config?: Json | null
          model_label: string
          model_name: string
          primary_key_field: string
          sync_frequency_hours?: number | null
          target_table?: string | null
          tenant_id: string
          timestamp_field?: string | null
          updated_at?: string
        }
        Update: {
          bigquery_dataset?: string
          bigquery_table?: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          mapping_config?: Json | null
          model_label?: string
          model_name?: string
          primary_key_field?: string
          sync_frequency_hours?: number | null
          target_table?: string | null
          tenant_id?: string
          timestamp_field?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bigquery_data_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bigquery_query_cache: {
        Row: {
          cached_at: string
          date_range_end: string | null
          date_range_start: string | null
          expires_at: string
          id: string
          is_valid: boolean | null
          query_hash: string
          query_type: string
          result_data: Json
          tenant_id: string
        }
        Insert: {
          cached_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          expires_at: string
          id?: string
          is_valid?: boolean | null
          query_hash: string
          query_type: string
          result_data: Json
          tenant_id: string
        }
        Update: {
          cached_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          expires_at?: string
          id?: string
          is_valid?: boolean | null
          query_hash?: string
          query_type?: string
          result_data?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bigquery_query_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bigquery_sync_watermarks: {
        Row: {
          channel: string | null
          created_at: string
          data_model: string
          dataset_id: string
          error_message: string | null
          id: string
          last_record_id: string | null
          last_record_timestamp: string | null
          last_sync_at: string | null
          sync_status: string | null
          table_id: string
          tenant_id: string
          total_records_synced: number | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          data_model: string
          dataset_id: string
          error_message?: string | null
          id?: string
          last_record_id?: string | null
          last_record_timestamp?: string | null
          last_sync_at?: string | null
          sync_status?: string | null
          table_id: string
          tenant_id: string
          total_records_synced?: number | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          data_model?: string
          dataset_id?: string
          error_message?: string | null
          id?: string
          last_record_id?: string | null
          last_record_timestamp?: string | null
          last_sync_at?: string | null
          sync_status?: string | null
          table_id?: string
          tenant_id?: string
          total_records_synced?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bigquery_sync_watermarks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          description: string
          gl_account_id: string | null
          id: string
          product_id: string | null
          quantity: number
          tenant_id: string
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          amount?: number
          bill_id: string
          created_at?: string
          description: string
          gl_account_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          tenant_id: string
          unit_price?: number
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          description?: string
          gl_account_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          tenant_id?: string
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bill_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bill_date: string
          bill_number: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          credit_note_amount: number | null
          currency_code: string | null
          discount_amount: number | null
          due_date: string
          exchange_rate: number | null
          expense_category: string | null
          gl_account_id: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number | null
          payment_term_id: string | null
          payment_terms: number | null
          received_date: string | null
          status: string
          subtotal: number
          tenant_id: string
          total_amount: number
          total_amount_base: number | null
          updated_at: string
          vat_amount: number
          vendor_bill_number: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bill_date?: string
          bill_number: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_amount?: number | null
          currency_code?: string | null
          discount_amount?: number | null
          due_date: string
          exchange_rate?: number | null
          expense_category?: string | null
          gl_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_term_id?: string | null
          payment_terms?: number | null
          received_date?: string | null
          status?: string
          subtotal?: number
          tenant_id: string
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
          vendor_bill_number?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bill_date?: string
          bill_number?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_amount?: number | null
          currency_code?: string | null
          discount_amount?: number | null
          due_date?: string
          exchange_rate?: number | null
          expense_category?: string | null
          gl_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_term_id?: string | null
          payment_terms?: number | null
          received_date?: string | null
          status?: string
          subtotal?: number
          tenant_id?: string
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
          vendor_bill_number?: string | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bills_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_payment_term_id_fkey"
            columns: ["payment_term_id"]
            isOneToOne: false
            referencedRelation: "payment_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      bluecore_scores: {
        Row: {
          calculated_at: string
          components: Json | null
          created_at: string
          id: string
          previous_score: number | null
          primary_driver: string | null
          recommendation: string | null
          score_grade: string
          score_type: string
          score_value: number
          tenant_id: string
          trend: string | null
          trend_percent: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          calculated_at?: string
          components?: Json | null
          created_at?: string
          id?: string
          previous_score?: number | null
          primary_driver?: string | null
          recommendation?: string | null
          score_grade: string
          score_type: string
          score_value: number
          tenant_id: string
          trend?: string | null
          trend_percent?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          calculated_at?: string
          components?: Json | null
          created_at?: string
          id?: string
          previous_score?: number | null
          primary_driver?: string | null
          recommendation?: string | null
          score_grade?: string
          score_type?: string
          score_value?: number
          tenant_id?: string
          trend?: string | null
          trend_percent?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bluecore_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      board_meeting_snapshots: {
        Row: {
          action_items: Json | null
          attendees: Json | null
          created_at: string
          created_by: string | null
          decisions: Json | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          meeting_date: string
          meeting_title: string | null
          snapshot: Json
          status: string
          tenant_id: string
        }
        Insert: {
          action_items?: Json | null
          attendees?: Json | null
          created_at?: string
          created_by?: string | null
          decisions?: Json | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          meeting_date: string
          meeting_title?: string | null
          snapshot: Json
          status?: string
          tenant_id: string
        }
        Update: {
          action_items?: Json | null
          attendees?: Json | null
          created_at?: string
          created_by?: string | null
          decisions?: Json | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          meeting_date?: string
          meeting_title?: string | null
          snapshot?: Json
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      board_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          ar_aging_analysis: Json | null
          cash_flow_analysis: Json | null
          created_at: string
          executive_summary: string | null
          financial_highlights: Json | null
          generated_at: string
          id: string
          key_metrics: Json | null
          recommendations: string[] | null
          report_period: string
          report_title: string
          report_type: string
          risk_assessment: Json | null
          status: string
          strategic_initiatives: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          ar_aging_analysis?: Json | null
          cash_flow_analysis?: Json | null
          created_at?: string
          executive_summary?: string | null
          financial_highlights?: Json | null
          generated_at?: string
          id?: string
          key_metrics?: Json | null
          recommendations?: string[] | null
          report_period: string
          report_title: string
          report_type: string
          risk_assessment?: Json | null
          status?: string
          strategic_initiatives?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          ar_aging_analysis?: Json | null
          cash_flow_analysis?: Json | null
          created_at?: string
          executive_summary?: string | null
          financial_highlights?: Json | null
          generated_at?: string
          id?: string
          key_metrics?: Json | null
          recommendations?: string[] | null
          report_period?: string
          report_title?: string
          report_type?: string
          risk_assessment?: Json | null
          status?: string
          strategic_initiatives?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      board_scenarios: {
        Row: {
          assumptions: Json
          baseline_snapshot: Json | null
          comparison_notes: string | null
          control_impacts: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean | null
          projected_outcomes: Json
          risk_breaches: Json
          scenario_name: string
          scenario_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assumptions: Json
          baseline_snapshot?: Json | null
          comparison_notes?: string | null
          control_impacts?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          projected_outcomes: Json
          risk_breaches?: Json
          scenario_name: string
          scenario_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          baseline_snapshot?: Json | null
          comparison_notes?: string | null
          control_impacts?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          projected_outcomes?: Json
          risk_breaches?: Json
          scenario_name?: string
          scenario_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_scenarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      board_simulation_results: {
        Row: {
          baseline_metrics: Json | null
          created_at: string
          delta_metrics: Json | null
          id: string
          period_month: string
          risk_breaches: Json | null
          simulated_metrics: Json
          simulation_id: string
          tenant_id: string
          truth_level: string
        }
        Insert: {
          baseline_metrics?: Json | null
          created_at?: string
          delta_metrics?: Json | null
          id?: string
          period_month: string
          risk_breaches?: Json | null
          simulated_metrics: Json
          simulation_id: string
          tenant_id: string
          truth_level?: string
        }
        Update: {
          baseline_metrics?: Json | null
          created_at?: string
          delta_metrics?: Json | null
          id?: string
          period_month?: string
          risk_breaches?: Json | null
          simulated_metrics?: Json
          simulation_id?: string
          tenant_id?: string
          truth_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_simulation_results_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "board_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      board_simulations: {
        Row: {
          assumptions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          simulation_type: string
          status: string
          tenant_id: string
          truth_level: string
          updated_at: string
        }
        Insert: {
          assumptions: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          simulation_type?: string
          status?: string
          tenant_id: string
          truth_level?: string
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          simulation_type?: string
          status?: string
          tenant_id?: string
          truth_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          actual_amount: number | null
          approved_at: string | null
          approved_by: string | null
          budget_type: string
          budgeted_amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          notes: string | null
          period_month: number | null
          period_quarter: number | null
          period_type: string
          period_year: number
          start_date: string
          status: string
          subcategory: string | null
          tenant_id: string
          updated_at: string
          variance_amount: number | null
          variance_percent: number | null
        }
        Insert: {
          actual_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          budget_type?: string
          budgeted_amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          notes?: string | null
          period_month?: number | null
          period_quarter?: number | null
          period_type?: string
          period_year: number
          start_date: string
          status?: string
          subcategory?: string | null
          tenant_id: string
          updated_at?: string
          variance_amount?: number | null
          variance_percent?: number | null
        }
        Update: {
          actual_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          budget_type?: string
          budgeted_amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          period_month?: number | null
          period_quarter?: number | null
          period_type?: string
          period_year?: number
          start_date?: string
          status?: string
          subcategory?: string | null
          tenant_id?: string
          updated_at?: string
          variance_amount?: number | null
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capex_projects: {
        Row: {
          actual_roi: number | null
          approved_at: string | null
          approved_by: string | null
          budget: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          expected_roi: number | null
          id: string
          name: string
          notes: string | null
          payback_months: number | null
          spent: number
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_roi?: number | null
          approved_at?: string | null
          approved_by?: string | null
          budget?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          expected_roi?: number | null
          id?: string
          name: string
          notes?: string | null
          payback_months?: number | null
          spent?: number
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_roi?: number | null
          approved_at?: string | null
          approved_by?: string | null
          budget?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          expected_roi?: number | null
          id?: string
          name?: string
          notes?: string | null
          payback_months?: number | null
          spent?: number
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capex_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_performance: {
        Row: {
          avg_cost_per_shipment: number | null
          avg_delivery_days: number | null
          carrier_code: string
          created_at: string | null
          delay_rate: number | null
          delayed_count: number | null
          delivered_count: number | null
          failed_count: number | null
          failure_rate: number | null
          id: string
          on_time_rate: number | null
          performance_date: string
          tenant_id: string
          total_shipments: number | null
        }
        Insert: {
          avg_cost_per_shipment?: number | null
          avg_delivery_days?: number | null
          carrier_code: string
          created_at?: string | null
          delay_rate?: number | null
          delayed_count?: number | null
          delivered_count?: number | null
          failed_count?: number | null
          failure_rate?: number | null
          id?: string
          on_time_rate?: number | null
          performance_date: string
          tenant_id: string
          total_shipments?: number | null
        }
        Update: {
          avg_cost_per_shipment?: number | null
          avg_delivery_days?: number | null
          carrier_code?: string
          created_at?: string | null
          delay_rate?: number | null
          delayed_count?: number | null
          delivered_count?: number | null
          failed_count?: number | null
          failure_rate?: number | null
          id?: string
          on_time_rate?: number | null
          performance_date?: string
          tenant_id?: string
          total_shipments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_performance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_daily: {
        Row: {
          avg_daily_expenses: number | null
          cash_runway_days: number | null
          closing_balance: number | null
          created_at: string | null
          flow_date: string
          id: string
          inflow_cod: number | null
          inflow_other: number | null
          inflow_platform: number | null
          inflow_sales: number | null
          net_cash_flow: number | null
          notes: string | null
          opening_balance: number | null
          outflow_inventory: number | null
          outflow_marketing: number | null
          outflow_other: number | null
          outflow_rent: number | null
          outflow_salary: number | null
          outflow_shipping: number | null
          tenant_id: string
          total_inflow: number | null
          total_outflow: number | null
          updated_at: string | null
        }
        Insert: {
          avg_daily_expenses?: number | null
          cash_runway_days?: number | null
          closing_balance?: number | null
          created_at?: string | null
          flow_date: string
          id?: string
          inflow_cod?: number | null
          inflow_other?: number | null
          inflow_platform?: number | null
          inflow_sales?: number | null
          net_cash_flow?: number | null
          notes?: string | null
          opening_balance?: number | null
          outflow_inventory?: number | null
          outflow_marketing?: number | null
          outflow_other?: number | null
          outflow_rent?: number | null
          outflow_salary?: number | null
          outflow_shipping?: number | null
          tenant_id: string
          total_inflow?: number | null
          total_outflow?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_daily_expenses?: number | null
          cash_runway_days?: number | null
          closing_balance?: number | null
          created_at?: string | null
          flow_date?: string
          id?: string
          inflow_cod?: number | null
          inflow_other?: number | null
          inflow_platform?: number | null
          inflow_sales?: number | null
          net_cash_flow?: number | null
          notes?: string | null
          opening_balance?: number | null
          outflow_inventory?: number | null
          outflow_marketing?: number | null
          outflow_other?: number | null
          outflow_rent?: number | null
          outflow_salary?: number | null
          outflow_shipping?: number | null
          tenant_id?: string
          total_inflow?: number | null
          total_outflow?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_direct: {
        Row: {
          cash_for_asset_purchases: number | null
          cash_for_dividends: number | null
          cash_for_interest_paid: number | null
          cash_for_investments: number | null
          cash_for_loan_repayments: number | null
          cash_for_other_operating: number | null
          cash_for_rent: number | null
          cash_for_taxes: number | null
          cash_for_utilities: number | null
          cash_from_asset_sales: number | null
          cash_from_customers: number | null
          cash_from_equity: number | null
          cash_from_interest_received: number | null
          cash_from_loans: number | null
          cash_from_other_operating: number | null
          cash_to_employees: number | null
          cash_to_suppliers: number | null
          closing_cash_balance: number | null
          created_at: string
          created_by: string | null
          id: string
          is_actual: boolean | null
          net_cash_financing: number | null
          net_cash_investing: number | null
          net_cash_operating: number | null
          notes: string | null
          opening_cash_balance: number | null
          period_end: string
          period_start: string
          period_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cash_for_asset_purchases?: number | null
          cash_for_dividends?: number | null
          cash_for_interest_paid?: number | null
          cash_for_investments?: number | null
          cash_for_loan_repayments?: number | null
          cash_for_other_operating?: number | null
          cash_for_rent?: number | null
          cash_for_taxes?: number | null
          cash_for_utilities?: number | null
          cash_from_asset_sales?: number | null
          cash_from_customers?: number | null
          cash_from_equity?: number | null
          cash_from_interest_received?: number | null
          cash_from_loans?: number | null
          cash_from_other_operating?: number | null
          cash_to_employees?: number | null
          cash_to_suppliers?: number | null
          closing_cash_balance?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_actual?: boolean | null
          net_cash_financing?: number | null
          net_cash_investing?: number | null
          net_cash_operating?: number | null
          notes?: string | null
          opening_cash_balance?: number | null
          period_end: string
          period_start: string
          period_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cash_for_asset_purchases?: number | null
          cash_for_dividends?: number | null
          cash_for_interest_paid?: number | null
          cash_for_investments?: number | null
          cash_for_loan_repayments?: number | null
          cash_for_other_operating?: number | null
          cash_for_rent?: number | null
          cash_for_taxes?: number | null
          cash_for_utilities?: number | null
          cash_from_asset_sales?: number | null
          cash_from_customers?: number | null
          cash_from_equity?: number | null
          cash_from_interest_received?: number | null
          cash_from_loans?: number | null
          cash_from_other_operating?: number | null
          cash_to_employees?: number | null
          cash_to_suppliers?: number | null
          closing_cash_balance?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_actual?: boolean | null
          net_cash_financing?: number | null
          net_cash_investing?: number | null
          net_cash_operating?: number | null
          notes?: string | null
          opening_cash_balance?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_direct_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_forecasts: {
        Row: {
          closing_balance: number
          created_at: string
          forecast_date: string
          forecast_type: string | null
          id: string
          inflows: number | null
          notes: string | null
          opening_balance: number
          outflows: number | null
          tenant_id: string | null
        }
        Insert: {
          closing_balance: number
          created_at?: string
          forecast_date: string
          forecast_type?: string | null
          id?: string
          inflows?: number | null
          notes?: string | null
          opening_balance: number
          outflows?: number | null
          tenant_id?: string | null
        }
        Update: {
          closing_balance?: number
          created_at?: string
          forecast_date?: string
          forecast_type?: string | null
          id?: string
          inflows?: number | null
          notes?: string | null
          opening_balance?: number
          outflows?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      central_metric_facts: {
        Row: {
          cost: number
          created_at: string
          grain_id: string
          grain_name: string | null
          grain_type: string
          id: string
          margin_percent: number
          order_count: number
          period_end: string
          period_start: string
          profit: number
          profit_rank: number | null
          quantity: number
          revenue: number
          revenue_rank: number | null
          snapshot_id: string | null
          tenant_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          grain_id: string
          grain_name?: string | null
          grain_type: string
          id?: string
          margin_percent?: number
          order_count?: number
          period_end: string
          period_start: string
          profit?: number
          profit_rank?: number | null
          quantity?: number
          revenue?: number
          revenue_rank?: number | null
          snapshot_id?: string | null
          tenant_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          grain_id?: string
          grain_name?: string | null
          grain_type?: string
          id?: string
          margin_percent?: number
          order_count?: number
          period_end?: string
          period_start?: string
          profit?: number
          profit_rank?: number | null
          quantity?: number
          revenue?: number
          revenue_rank?: number | null
          snapshot_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "central_metric_facts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "central_metrics_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "central_metric_facts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_latest_central_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "central_metric_facts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      central_metric_facts_summary: {
        Row: {
          avg_margin_percent: number | null
          created_at: string
          grain_type: string
          id: string
          period_end: string | null
          period_start: string | null
          tenant_id: string
          total_cost: number | null
          total_items: number | null
          total_orders: number | null
          total_profit: number | null
          total_quantity: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          avg_margin_percent?: number | null
          created_at?: string
          grain_type: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          tenant_id: string
          total_cost?: number | null
          total_items?: number | null
          total_orders?: number | null
          total_profit?: number | null
          total_quantity?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          avg_margin_percent?: number | null
          created_at?: string
          grain_type?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          tenant_id?: string
          total_cost?: number | null
          total_items?: number | null
          total_orders?: number | null
          total_profit?: number | null
          total_quantity?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "central_metric_facts_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      central_metrics_snapshots: {
        Row: {
          ar_aging_30d: number
          ar_aging_60d: number
          ar_aging_90d: number
          ar_aging_current: number
          avg_order_value: number
          cac: number
          cash_7d_forecast: number
          cash_runway_months: number
          cash_today: number
          ccc: number
          computation_duration_ms: number | null
          computed_by: string | null
          contribution_margin: number
          contribution_margin_percent: number
          created_at: string
          dio: number
          dpo: number
          dso: number
          ebitda: number
          ebitda_margin_percent: number
          gross_margin_percent: number
          gross_profit: number
          id: string
          ltv: number
          ltv_cac_ratio: number
          marketing_roas: number
          net_revenue: number
          overdue_ap: number
          overdue_ar: number
          period_end: string
          period_start: string
          repeat_customer_rate: number
          slow_moving_inventory: number
          snapshot_at: string
          tenant_id: string
          total_ap: number
          total_ar: number
          total_customers: number
          total_inventory_value: number
          total_marketing_spend: number
          total_orders: number
        }
        Insert: {
          ar_aging_30d?: number
          ar_aging_60d?: number
          ar_aging_90d?: number
          ar_aging_current?: number
          avg_order_value?: number
          cac?: number
          cash_7d_forecast?: number
          cash_runway_months?: number
          cash_today?: number
          ccc?: number
          computation_duration_ms?: number | null
          computed_by?: string | null
          contribution_margin?: number
          contribution_margin_percent?: number
          created_at?: string
          dio?: number
          dpo?: number
          dso?: number
          ebitda?: number
          ebitda_margin_percent?: number
          gross_margin_percent?: number
          gross_profit?: number
          id?: string
          ltv?: number
          ltv_cac_ratio?: number
          marketing_roas?: number
          net_revenue?: number
          overdue_ap?: number
          overdue_ar?: number
          period_end: string
          period_start: string
          repeat_customer_rate?: number
          slow_moving_inventory?: number
          snapshot_at?: string
          tenant_id: string
          total_ap?: number
          total_ar?: number
          total_customers?: number
          total_inventory_value?: number
          total_marketing_spend?: number
          total_orders?: number
        }
        Update: {
          ar_aging_30d?: number
          ar_aging_60d?: number
          ar_aging_90d?: number
          ar_aging_current?: number
          avg_order_value?: number
          cac?: number
          cash_7d_forecast?: number
          cash_runway_months?: number
          cash_today?: number
          ccc?: number
          computation_duration_ms?: number | null
          computed_by?: string | null
          contribution_margin?: number
          contribution_margin_percent?: number
          created_at?: string
          dio?: number
          dpo?: number
          dso?: number
          ebitda?: number
          ebitda_margin_percent?: number
          gross_margin_percent?: number
          gross_profit?: number
          id?: string
          ltv?: number
          ltv_cac_ratio?: number
          marketing_roas?: number
          net_revenue?: number
          overdue_ap?: number
          overdue_ar?: number
          period_end?: string
          period_start?: string
          repeat_customer_rate?: number
          slow_moving_inventory?: number
          snapshot_at?: string
          tenant_id?: string
          total_ap?: number
          total_ar?: number
          total_customers?: number
          total_inventory_value?: number
          total_marketing_spend?: number
          total_orders?: number
        }
        Relationships: [
          {
            foreignKeyName: "central_metrics_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_analytics: {
        Row: {
          analytics_date: string
          avg_order_value: number | null
          bounce_rate: number | null
          channel: string
          conversion_rate: number | null
          created_at: string | null
          gross_margin: number | null
          id: string
          marketing_cost: number | null
          platform_fee: number | null
          prev_aov: number | null
          prev_platform_fee: number | null
          prev_revenue: number | null
          prev_shop_score: number | null
          response_rate: number | null
          revenue: number | null
          sessions: number | null
          shipping_cost: number | null
          shop_rating: number | null
          shop_score: number | null
          tenant_id: string
          total_cogs: number | null
          total_orders: number | null
          unique_visitors: number | null
          updated_at: string | null
        }
        Insert: {
          analytics_date: string
          avg_order_value?: number | null
          bounce_rate?: number | null
          channel: string
          conversion_rate?: number | null
          created_at?: string | null
          gross_margin?: number | null
          id?: string
          marketing_cost?: number | null
          platform_fee?: number | null
          prev_aov?: number | null
          prev_platform_fee?: number | null
          prev_revenue?: number | null
          prev_shop_score?: number | null
          response_rate?: number | null
          revenue?: number | null
          sessions?: number | null
          shipping_cost?: number | null
          shop_rating?: number | null
          shop_score?: number | null
          tenant_id: string
          total_cogs?: number | null
          total_orders?: number | null
          unique_visitors?: number | null
          updated_at?: string | null
        }
        Update: {
          analytics_date?: string
          avg_order_value?: number | null
          bounce_rate?: number | null
          channel?: string
          conversion_rate?: number | null
          created_at?: string | null
          gross_margin?: number | null
          id?: string
          marketing_cost?: number | null
          platform_fee?: number | null
          prev_aov?: number | null
          prev_platform_fee?: number | null
          prev_revenue?: number | null
          prev_shop_score?: number | null
          response_rate?: number | null
          revenue?: number | null
          sessions?: number | null
          shipping_cost?: number | null
          shop_rating?: number | null
          shop_score?: number | null
          tenant_id?: string
          total_cogs?: number | null
          total_orders?: number | null
          unique_visitors?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_analytics_cache: {
        Row: {
          avg_order_value: number | null
          calculated_at: string | null
          cancelled_orders: number | null
          channel_metrics: Json | null
          created_at: string | null
          daily_summary: Json | null
          data_end_date: string | null
          data_start_date: string | null
          fee_breakdown: Json | null
          gross_profit: number | null
          gross_revenue: number | null
          id: string
          net_revenue: number | null
          returned_orders: number | null
          status_breakdown: Json | null
          tenant_id: string
          total_cogs: number | null
          total_fees: number | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          avg_order_value?: number | null
          calculated_at?: string | null
          cancelled_orders?: number | null
          channel_metrics?: Json | null
          created_at?: string | null
          daily_summary?: Json | null
          data_end_date?: string | null
          data_start_date?: string | null
          fee_breakdown?: Json | null
          gross_profit?: number | null
          gross_revenue?: number | null
          id?: string
          net_revenue?: number | null
          returned_orders?: number | null
          status_breakdown?: Json | null
          tenant_id: string
          total_cogs?: number | null
          total_fees?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_order_value?: number | null
          calculated_at?: string | null
          cancelled_orders?: number | null
          channel_metrics?: Json | null
          created_at?: string | null
          daily_summary?: Json | null
          data_end_date?: string | null
          data_start_date?: string | null
          fee_breakdown?: Json | null
          gross_profit?: number | null
          gross_revenue?: number | null
          id?: string
          net_revenue?: number | null
          returned_orders?: number | null
          status_breakdown?: Json | null
          tenant_id?: string
          total_cogs?: number | null
          total_fees?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_analytics_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_budgets: {
        Row: {
          budget_amount: number | null
          channel: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          max_cpa: number | null
          min_contribution_margin: number | null
          month: number
          notes: string | null
          revenue_target: number | null
          target_ctr: number | null
          target_cvr: number | null
          target_roas: number | null
          tenant_id: string
          updated_at: string
          year: number
        }
        Insert: {
          budget_amount?: number | null
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_cpa?: number | null
          min_contribution_margin?: number | null
          month?: number
          notes?: string | null
          revenue_target?: number | null
          target_ctr?: number | null
          target_cvr?: number | null
          target_roas?: number | null
          tenant_id: string
          updated_at?: string
          year?: number
        }
        Update: {
          budget_amount?: number | null
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_cpa?: number | null
          min_contribution_margin?: number | null
          month?: number
          notes?: string | null
          revenue_target?: number | null
          target_ctr?: number | null
          target_cvr?: number | null
          target_roas?: number | null
          tenant_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_fees: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          external_order_id: string | null
          fee_category: string | null
          fee_date: string
          fee_type: string
          id: string
          integration_id: string
          period_end: string | null
          period_start: string | null
          raw_data: Json | null
          reference_id: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_order_id?: string | null
          fee_category?: string | null
          fee_date: string
          fee_type: string
          id?: string
          integration_id: string
          period_end?: string | null
          period_start?: string | null
          raw_data?: Json | null
          reference_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_order_id?: string | null
          fee_category?: string | null
          fee_date?: string
          fee_type?: string
          id?: string
          integration_id?: string
          period_end?: string | null
          period_start?: string | null
          raw_data?: Json | null
          reference_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_fees_external_order_id_fkey"
            columns: ["external_order_id"]
            isOneToOne: false
            referencedRelation: "external_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_fees_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "connector_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_settlements: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          created_at: string | null
          fee_breakdown: Json | null
          gross_sales: number | null
          id: string
          integration_id: string
          is_reconciled: boolean | null
          net_amount: number | null
          order_ids: Json | null
          payout_date: string | null
          period_end: string
          period_start: string
          raw_data: Json | null
          reconciled_at: string | null
          reconciled_by: string | null
          settlement_id: string
          settlement_number: string | null
          status: Database["public"]["Enums"]["settlement_status"] | null
          tenant_id: string
          total_adjustments: number | null
          total_commission: number | null
          total_fees: number | null
          total_orders: number | null
          total_payment_fee: number | null
          total_refunds: number | null
          total_service_fee: number | null
          total_shipping_fee: number | null
          transaction_id: string | null
          updated_at: string | null
          variance_amount: number | null
          variance_notes: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string | null
          fee_breakdown?: Json | null
          gross_sales?: number | null
          id?: string
          integration_id: string
          is_reconciled?: boolean | null
          net_amount?: number | null
          order_ids?: Json | null
          payout_date?: string | null
          period_end: string
          period_start: string
          raw_data?: Json | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          settlement_id: string
          settlement_number?: string | null
          status?: Database["public"]["Enums"]["settlement_status"] | null
          tenant_id: string
          total_adjustments?: number | null
          total_commission?: number | null
          total_fees?: number | null
          total_orders?: number | null
          total_payment_fee?: number | null
          total_refunds?: number | null
          total_service_fee?: number | null
          total_shipping_fee?: number | null
          transaction_id?: string | null
          updated_at?: string | null
          variance_amount?: number | null
          variance_notes?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string | null
          fee_breakdown?: Json | null
          gross_sales?: number | null
          id?: string
          integration_id?: string
          is_reconciled?: boolean | null
          net_amount?: number | null
          order_ids?: Json | null
          payout_date?: string | null
          period_end?: string
          period_start?: string
          raw_data?: Json | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          settlement_id?: string
          settlement_number?: string | null
          status?: Database["public"]["Enums"]["settlement_status"] | null
          tenant_id?: string
          total_adjustments?: number | null
          total_commission?: number | null
          total_fees?: number | null
          total_orders?: number | null
          total_payment_fee?: number | null
          total_refunds?: number | null
          total_service_fee?: number | null
          total_shipping_fee?: number | null
          transaction_id?: string | null
          updated_at?: string | null
          variance_amount?: number | null
          variance_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_settlements_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "connector_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel: string
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_read: boolean | null
          is_responded: boolean | null
          message_content: string | null
          message_type: string
          received_at: string | null
          responded_at: string | null
          response_time_minutes: number | null
          tenant_id: string
        }
        Insert: {
          channel: string
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_read?: boolean | null
          is_responded?: boolean | null
          message_content?: string | null
          message_type: string
          received_at?: string | null
          responded_at?: string | null
          response_time_minutes?: number | null
          tenant_id: string
        }
        Update: {
          channel?: string
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_read?: boolean | null
          is_responded?: boolean | null
          message_content?: string | null
          message_type?: string
          received_at?: string | null
          responded_at?: string | null
          response_time_minutes?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      confidence_calibration_stats: {
        Row: {
          confidence_band: string
          confirmed_correct: number
          empirical_success_rate: number
          id: string
          last_computed_at: string
          rejected: number
          signal_signature: string
          suggestion_type: string
          tenant_id: string
          timed_out: number
          total_suggestions: number
        }
        Insert: {
          confidence_band: string
          confirmed_correct?: number
          empirical_success_rate?: number
          id?: string
          last_computed_at?: string
          rejected?: number
          signal_signature: string
          suggestion_type: string
          tenant_id: string
          timed_out?: number
          total_suggestions?: number
        }
        Update: {
          confidence_band?: string
          confirmed_correct?: number
          empirical_success_rate?: number
          id?: string
          last_computed_at?: string
          rejected?: number
          signal_signature?: string
          suggestion_type?: string
          tenant_id?: string
          timed_out?: number
          total_suggestions?: number
        }
        Relationships: [
          {
            foreignKeyName: "confidence_calibration_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_integrations: {
        Row: {
          connector_name: string
          connector_type: Database["public"]["Enums"]["connector_type"]
          created_at: string | null
          created_by: string | null
          credentials: Json | null
          error_message: string | null
          id: string
          last_sync_at: string | null
          next_sync_at: string | null
          settings: Json | null
          shop_id: string | null
          shop_name: string | null
          status: string | null
          sync_frequency_minutes: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          connector_name: string
          connector_type: Database["public"]["Enums"]["connector_type"]
          created_at?: string | null
          created_by?: string | null
          credentials?: Json | null
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          settings?: Json | null
          shop_id?: string | null
          shop_name?: string | null
          status?: string | null
          sync_frequency_minutes?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          connector_name?: string
          connector_type?: Database["public"]["Enums"]["connector_type"]
          created_at?: string | null
          created_by?: string | null
          credentials?: Json | null
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          settings?: Json | null
          shop_id?: string | null
          shop_name?: string | null
          status?: string | null
          sync_frequency_minutes?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connector_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          budget_amount: number | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          parent_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          parent_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      covenant_measurements: {
        Row: {
          calculation_details: Json | null
          covenant_id: string
          created_at: string
          denominator_value: number | null
          id: string
          measured_by: string | null
          measured_value: number
          measurement_date: string
          notes: string | null
          numerator_value: number | null
          status: string
          tenant_id: string
        }
        Insert: {
          calculation_details?: Json | null
          covenant_id: string
          created_at?: string
          denominator_value?: number | null
          id?: string
          measured_by?: string | null
          measured_value: number
          measurement_date: string
          notes?: string | null
          numerator_value?: number | null
          status: string
          tenant_id: string
        }
        Update: {
          calculation_details?: Json | null
          covenant_id?: string
          created_at?: string
          denominator_value?: number | null
          id?: string
          measured_by?: string | null
          measured_value?: number
          measurement_date?: string
          notes?: string | null
          numerator_value?: number | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "covenant_measurements_covenant_id_fkey"
            columns: ["covenant_id"]
            isOneToOne: false
            referencedRelation: "bank_covenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covenant_measurements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_domain_alert_rules: {
        Row: {
          alert_message_template: string
          alert_title_template: string
          check_frequency_minutes: number | null
          condition_logic: string | null
          conditions: Json
          cooldown_minutes: number | null
          created_at: string | null
          description: string | null
          id: string
          impact_formula: string | null
          impact_unit: string | null
          is_enabled: boolean | null
          last_checked_at: string | null
          rule_code: string
          rule_name: string
          severity: string | null
          suggested_action: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          alert_message_template: string
          alert_title_template: string
          check_frequency_minutes?: number | null
          condition_logic?: string | null
          conditions?: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact_formula?: string | null
          impact_unit?: string | null
          is_enabled?: boolean | null
          last_checked_at?: string | null
          rule_code: string
          rule_name: string
          severity?: string | null
          suggested_action?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          alert_message_template?: string
          alert_title_template?: string
          check_frequency_minutes?: number | null
          condition_logic?: string | null
          conditions?: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact_formula?: string | null
          impact_unit?: string | null
          is_enabled?: boolean | null
          last_checked_at?: string | null
          rule_code?: string
          rule_name?: string
          severity?: string | null
          suggested_action?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_domain_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_places: number | null
          id: string
          is_active: boolean
          is_base: boolean | null
          name: string
          symbol: string | null
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_places?: number | null
          id?: string
          is_active?: boolean
          is_base?: boolean | null
          name: string
          symbol?: string | null
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_places?: number | null
          id?: string
          is_active?: boolean
          is_base?: boolean | null
          name?: string
          symbol?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "currencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          acquisition_cost: number | null
          address: string | null
          city: string | null
          clv_value: number | null
          country: string | null
          created_at: string
          credit_limit: number | null
          currency_code: string | null
          customer_type: string | null
          district: string | null
          email: string | null
          external_customer_id: string | null
          gl_receivable_account_id: string | null
          id: string
          last_order_date: string | null
          name: string
          notes: string | null
          payment_term_id: string | null
          payment_terms: number | null
          phone: string | null
          prev_clv_value: number | null
          province: string | null
          status: string | null
          tax_code: string | null
          tenant_id: string | null
          total_orders: number | null
          updated_at: string
          ward: string | null
        }
        Insert: {
          acquisition_cost?: number | null
          address?: string | null
          city?: string | null
          clv_value?: number | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          currency_code?: string | null
          customer_type?: string | null
          district?: string | null
          email?: string | null
          external_customer_id?: string | null
          gl_receivable_account_id?: string | null
          id?: string
          last_order_date?: string | null
          name: string
          notes?: string | null
          payment_term_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          prev_clv_value?: number | null
          province?: string | null
          status?: string | null
          tax_code?: string | null
          tenant_id?: string | null
          total_orders?: number | null
          updated_at?: string
          ward?: string | null
        }
        Update: {
          acquisition_cost?: number | null
          address?: string | null
          city?: string | null
          clv_value?: number | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          currency_code?: string | null
          customer_type?: string | null
          district?: string | null
          email?: string | null
          external_customer_id?: string | null
          gl_receivable_account_id?: string | null
          id?: string
          last_order_date?: string | null
          name?: string
          notes?: string | null
          payment_term_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          prev_clv_value?: number | null
          province?: string | null
          status?: string | null
          tax_code?: string | null
          tenant_id?: string | null
          total_orders?: number | null
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_gl_receivable_account_id_fkey"
            columns: ["gl_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_gl_receivable_account_id_fkey"
            columns: ["gl_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "customers_payment_term_id_fkey"
            columns: ["payment_term_id"]
            isOneToOne: false
            referencedRelation: "payment_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_kpi_cache: {
        Row: {
          auto_match_rate: number | null
          calculated_at: string | null
          cash_7d: number | null
          cash_flow: number | null
          cash_today: number | null
          ccc: number | null
          contract_revenue: number | null
          created_at: string | null
          daily_cogs: number | null
          daily_purchases: number | null
          daily_sales: number | null
          date_range_end: string | null
          date_range_start: string | null
          days_in_period: number | null
          depreciation: number | null
          dio: number | null
          dpo: number | null
          dso: number | null
          ebitda: number | null
          ebitda_margin: number | null
          gross_margin: number | null
          gross_profit: number | null
          id: string
          interest_expense: number | null
          inventory: number | null
          invoice_count: number | null
          invoice_revenue: number | null
          matched_transaction_count: number | null
          net_profit: number | null
          net_profit_margin: number | null
          net_revenue: number | null
          operating_margin: number | null
          order_revenue: number | null
          overdue_ar: number | null
          overdue_invoice_count: number | null
          tax_expense: number | null
          tenant_id: string
          total_ap: number | null
          total_ar: number | null
          total_cogs: number | null
          total_opex: number | null
          total_revenue: number | null
          transaction_count: number | null
          updated_at: string | null
          working_capital: number | null
        }
        Insert: {
          auto_match_rate?: number | null
          calculated_at?: string | null
          cash_7d?: number | null
          cash_flow?: number | null
          cash_today?: number | null
          ccc?: number | null
          contract_revenue?: number | null
          created_at?: string | null
          daily_cogs?: number | null
          daily_purchases?: number | null
          daily_sales?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          days_in_period?: number | null
          depreciation?: number | null
          dio?: number | null
          dpo?: number | null
          dso?: number | null
          ebitda?: number | null
          ebitda_margin?: number | null
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          interest_expense?: number | null
          inventory?: number | null
          invoice_count?: number | null
          invoice_revenue?: number | null
          matched_transaction_count?: number | null
          net_profit?: number | null
          net_profit_margin?: number | null
          net_revenue?: number | null
          operating_margin?: number | null
          order_revenue?: number | null
          overdue_ar?: number | null
          overdue_invoice_count?: number | null
          tax_expense?: number | null
          tenant_id: string
          total_ap?: number | null
          total_ar?: number | null
          total_cogs?: number | null
          total_opex?: number | null
          total_revenue?: number | null
          transaction_count?: number | null
          updated_at?: string | null
          working_capital?: number | null
        }
        Update: {
          auto_match_rate?: number | null
          calculated_at?: string | null
          cash_7d?: number | null
          cash_flow?: number | null
          cash_today?: number | null
          ccc?: number | null
          contract_revenue?: number | null
          created_at?: string | null
          daily_cogs?: number | null
          daily_purchases?: number | null
          daily_sales?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          days_in_period?: number | null
          depreciation?: number | null
          dio?: number | null
          dpo?: number | null
          dso?: number | null
          ebitda?: number | null
          ebitda_margin?: number | null
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          interest_expense?: number | null
          inventory?: number | null
          invoice_count?: number | null
          invoice_revenue?: number | null
          matched_transaction_count?: number | null
          net_profit?: number | null
          net_profit_margin?: number | null
          net_revenue?: number | null
          operating_margin?: number | null
          order_revenue?: number | null
          overdue_ar?: number | null
          overdue_invoice_count?: number | null
          tax_expense?: number | null
          tenant_id?: string
          total_ap?: number | null
          total_ar?: number | null
          total_cogs?: number | null
          total_opex?: number | null
          total_revenue?: number | null
          transaction_count?: number | null
          updated_at?: string | null
          working_capital?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_kpi_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_analyses: {
        Row: {
          ai_insights: string | null
          analysis_type: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          impact: string | null
          parameters: Json
          priority: string | null
          recommendation: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          results: Json
          status: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_insights?: string | null
          analysis_type: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          impact?: string | null
          parameters?: Json
          priority?: string | null
          recommendation?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          results?: Json
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_insights?: string | null
          analysis_type?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          impact?: string | null
          parameters?: Json
          priority?: string | null
          recommendation?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          results?: Json
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_analyses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_audit_log: {
        Row: {
          action_label: string | null
          action_parameters: Json | null
          action_type: string
          auto_card_id: string | null
          baseline_metrics: Json | null
          card_id: string | null
          card_snapshot: Json | null
          card_type: string
          comment: string | null
          created_at: string
          decided_at: string
          decided_by: string | null
          decision_status: string | null
          dismiss_reason: string | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          expected_impact_amount: number | null
          expected_outcome: string | null
          follow_up_date: string | null
          follow_up_status: string | null
          id: string
          impact_amount: number | null
          impact_currency: string | null
          measurement_config: Json | null
          outcome_notes: string | null
          outcome_recorded_at: string | null
          outcome_tracking_key: string | null
          outcome_value: number | null
          selected_action_label: string | null
          selected_action_type: string | null
          snoozed_until: string | null
          tenant_id: string
        }
        Insert: {
          action_label?: string | null
          action_parameters?: Json | null
          action_type: string
          auto_card_id?: string | null
          baseline_metrics?: Json | null
          card_id?: string | null
          card_snapshot?: Json | null
          card_type: string
          comment?: string | null
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          decision_status?: string | null
          dismiss_reason?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          expected_impact_amount?: number | null
          expected_outcome?: string | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          id?: string
          impact_amount?: number | null
          impact_currency?: string | null
          measurement_config?: Json | null
          outcome_notes?: string | null
          outcome_recorded_at?: string | null
          outcome_tracking_key?: string | null
          outcome_value?: number | null
          selected_action_label?: string | null
          selected_action_type?: string | null
          snoozed_until?: string | null
          tenant_id: string
        }
        Update: {
          action_label?: string | null
          action_parameters?: Json | null
          action_type?: string
          auto_card_id?: string | null
          baseline_metrics?: Json | null
          card_id?: string | null
          card_snapshot?: Json | null
          card_type?: string
          comment?: string | null
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          decision_status?: string | null
          dismiss_reason?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          expected_impact_amount?: number | null
          expected_outcome?: string | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          id?: string
          impact_amount?: number | null
          impact_currency?: string | null
          measurement_config?: Json | null
          outcome_notes?: string | null
          outcome_recorded_at?: string | null
          outcome_tracking_key?: string | null
          outcome_value?: number | null
          selected_action_label?: string | null
          selected_action_type?: string | null
          snoozed_until?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_card_actions: {
        Row: {
          action_type: string
          card_id: string
          created_at: string
          display_order: number | null
          expected_outcome: string | null
          id: string
          is_recommended: boolean | null
          label: string
          parameters: Json | null
          risk_note: string | null
          tenant_id: string
        }
        Insert: {
          action_type: string
          card_id: string
          created_at?: string
          display_order?: number | null
          expected_outcome?: string | null
          id?: string
          is_recommended?: boolean | null
          label: string
          parameters?: Json | null
          risk_note?: string | null
          tenant_id: string
        }
        Update: {
          action_type?: string
          card_id?: string
          created_at?: string
          display_order?: number | null
          expected_outcome?: string | null
          id?: string
          is_recommended?: boolean | null
          label?: string
          parameters?: Json | null
          risk_note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_card_actions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "decision_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_card_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_card_decisions: {
        Row: {
          action_label: string | null
          action_type: string
          card_id: string
          comment: string | null
          decided_at: string
          decided_by: string | null
          dismiss_reason: string | null
          id: string
          outcome_notes: string | null
          outcome_recorded_at: string | null
          outcome_tracking_key: string | null
          outcome_value: number | null
          parameters: Json | null
          tenant_id: string
        }
        Insert: {
          action_label?: string | null
          action_type: string
          card_id: string
          comment?: string | null
          decided_at?: string
          decided_by?: string | null
          dismiss_reason?: string | null
          id?: string
          outcome_notes?: string | null
          outcome_recorded_at?: string | null
          outcome_tracking_key?: string | null
          outcome_value?: number | null
          parameters?: Json | null
          tenant_id: string
        }
        Update: {
          action_label?: string | null
          action_type?: string
          card_id?: string
          comment?: string | null
          decided_at?: string
          decided_by?: string | null
          dismiss_reason?: string | null
          id?: string
          outcome_notes?: string | null
          outcome_recorded_at?: string | null
          outcome_tracking_key?: string | null
          outcome_value?: number | null
          parameters?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_card_decisions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "decision_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_card_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_card_facts: {
        Row: {
          card_id: string
          created_at: string
          display_order: number | null
          fact_key: string
          id: string
          is_primary: boolean | null
          label: string
          numeric_value: number | null
          tenant_id: string
          trend: string | null
          unit: string | null
          value: string
        }
        Insert: {
          card_id: string
          created_at?: string
          display_order?: number | null
          fact_key: string
          id?: string
          is_primary?: boolean | null
          label: string
          numeric_value?: number | null
          tenant_id: string
          trend?: string | null
          unit?: string | null
          value: string
        }
        Update: {
          card_id?: string
          created_at?: string
          display_order?: number | null
          fact_key?: string
          id?: string
          is_primary?: boolean | null
          label?: string
          numeric_value?: number | null
          tenant_id?: string
          trend?: string | null
          unit?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_card_facts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "decision_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_card_facts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_cards: {
        Row: {
          analysis_metadata: Json | null
          assigned_at: string | null
          auto_card_id: string | null
          card_source: string | null
          card_type: string
          confidence: string | null
          created_at: string
          deadline_at: string
          entity_id: string | null
          entity_label: string
          entity_type: string
          id: string
          impact_amount: number | null
          impact_currency: string | null
          impact_description: string | null
          impact_window_days: number | null
          owner_role: string
          owner_user_id: string | null
          priority: string
          question: string
          rule_version: number | null
          severity_score: number | null
          snooze_count: number | null
          snoozed_until: string | null
          source_modules: string[] | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          vertical: string | null
        }
        Insert: {
          analysis_metadata?: Json | null
          assigned_at?: string | null
          auto_card_id?: string | null
          card_source?: string | null
          card_type: string
          confidence?: string | null
          created_at?: string
          deadline_at: string
          entity_id?: string | null
          entity_label: string
          entity_type: string
          id?: string
          impact_amount?: number | null
          impact_currency?: string | null
          impact_description?: string | null
          impact_window_days?: number | null
          owner_role: string
          owner_user_id?: string | null
          priority?: string
          question: string
          rule_version?: number | null
          severity_score?: number | null
          snooze_count?: number | null
          snoozed_until?: string | null
          source_modules?: string[] | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          analysis_metadata?: Json | null
          assigned_at?: string | null
          auto_card_id?: string | null
          card_source?: string | null
          card_type?: string
          confidence?: string | null
          created_at?: string
          deadline_at?: string
          entity_id?: string | null
          entity_label?: string
          entity_type?: string
          id?: string
          impact_amount?: number | null
          impact_currency?: string | null
          impact_description?: string | null
          impact_window_days?: number | null
          owner_role?: string
          owner_user_id?: string | null
          priority?: string
          question?: string
          rule_version?: number | null
          severity_score?: number | null
          snooze_count?: number | null
          snoozed_until?: string | null
          source_modules?: string[] | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_insight_queue: {
        Row: {
          confidence_score: number
          created_at: string | null
          current_alert_id: string | null
          dismissed: boolean | null
          expires_at: string | null
          id: string
          insight_text: string
          insight_type: string
          pattern_id: string | null
          surfaced: boolean | null
          surfaced_at: string | null
          tenant_id: string
          trigger_condition: Json | null
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          current_alert_id?: string | null
          dismissed?: boolean | null
          expires_at?: string | null
          id?: string
          insight_text: string
          insight_type: string
          pattern_id?: string | null
          surfaced?: boolean | null
          surfaced_at?: string | null
          tenant_id: string
          trigger_condition?: Json | null
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          current_alert_id?: string | null
          dismissed?: boolean | null
          expires_at?: string | null
          id?: string
          insight_text?: string
          insight_type?: string
          pattern_id?: string | null
          surfaced?: boolean | null
          surfaced_at?: string | null
          tenant_id?: string
          trigger_condition?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_insight_queue_current_alert_id_fkey"
            columns: ["current_alert_id"]
            isOneToOne: false
            referencedRelation: "early_warning_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_insight_queue_current_alert_id_fkey"
            columns: ["current_alert_id"]
            isOneToOne: false
            referencedRelation: "v_active_alerts_hierarchy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_insight_queue_current_alert_id_fkey"
            columns: ["current_alert_id"]
            isOneToOne: false
            referencedRelation: "v_alerts_pending_escalation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_insight_queue_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "decision_learning_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_insight_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_learning_patterns: {
        Row: {
          avg_financial_delta: number | null
          avg_resolution_hours_by_role: Json | null
          best_performing_role: string | null
          confidence_score: number | null
          created_at: string | null
          decision_type: string
          delay_penalty_per_day: number | null
          failure_count: number | null
          id: string
          insight_applicable_when: string | null
          insight_text: string | null
          last_calculated_at: string | null
          metric_code: string
          optimal_action_window_hours: number | null
          pattern_code: string
          sample_count: number | null
          success_count: number | null
          success_rate_by_role: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          avg_financial_delta?: number | null
          avg_resolution_hours_by_role?: Json | null
          best_performing_role?: string | null
          confidence_score?: number | null
          created_at?: string | null
          decision_type: string
          delay_penalty_per_day?: number | null
          failure_count?: number | null
          id?: string
          insight_applicable_when?: string | null
          insight_text?: string | null
          last_calculated_at?: string | null
          metric_code: string
          optimal_action_window_hours?: number | null
          pattern_code: string
          sample_count?: number | null
          success_count?: number | null
          success_rate_by_role?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          avg_financial_delta?: number | null
          avg_resolution_hours_by_role?: Json | null
          best_performing_role?: string | null
          confidence_score?: number | null
          created_at?: string | null
          decision_type?: string
          delay_penalty_per_day?: number | null
          failure_count?: number | null
          id?: string
          insight_applicable_when?: string | null
          insight_text?: string | null
          last_calculated_at?: string | null
          metric_code?: string
          optimal_action_window_hours?: number | null
          pattern_code?: string
          sample_count?: number | null
          success_count?: number | null
          success_rate_by_role?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_learning_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_outcome_records: {
        Row: {
          action_speed: string | null
          action_taken: string | null
          alert_id: string | null
          context_snapshot: Json | null
          created_at: string | null
          decided_by_role: string
          decided_by_user_id: string | null
          decision_date: string
          decision_id: string | null
          decision_type: string
          dimension_key: string | null
          exposure_before: number | null
          financial_delta_14d: number | null
          financial_delta_30d: number | null
          financial_delta_7d: number | null
          id: string
          metric_after_14d: number | null
          metric_after_30d: number | null
          metric_after_7d: number | null
          metric_before: number | null
          metric_code: string
          outcome_confidence: number | null
          outcome_measured_at: string | null
          outcome_verdict: string | null
          side_effects_detected: Json | null
          tenant_id: string
          unintended_impact_score: number | null
          updated_at: string | null
        }
        Insert: {
          action_speed?: string | null
          action_taken?: string | null
          alert_id?: string | null
          context_snapshot?: Json | null
          created_at?: string | null
          decided_by_role: string
          decided_by_user_id?: string | null
          decision_date: string
          decision_id?: string | null
          decision_type: string
          dimension_key?: string | null
          exposure_before?: number | null
          financial_delta_14d?: number | null
          financial_delta_30d?: number | null
          financial_delta_7d?: number | null
          id?: string
          metric_after_14d?: number | null
          metric_after_30d?: number | null
          metric_after_7d?: number | null
          metric_before?: number | null
          metric_code: string
          outcome_confidence?: number | null
          outcome_measured_at?: string | null
          outcome_verdict?: string | null
          side_effects_detected?: Json | null
          tenant_id: string
          unintended_impact_score?: number | null
          updated_at?: string | null
        }
        Update: {
          action_speed?: string | null
          action_taken?: string | null
          alert_id?: string | null
          context_snapshot?: Json | null
          created_at?: string | null
          decided_by_role?: string
          decided_by_user_id?: string | null
          decision_date?: string
          decision_id?: string | null
          decision_type?: string
          dimension_key?: string | null
          exposure_before?: number | null
          financial_delta_14d?: number | null
          financial_delta_30d?: number | null
          financial_delta_7d?: number | null
          id?: string
          metric_after_14d?: number | null
          metric_after_30d?: number | null
          metric_after_7d?: number | null
          metric_before?: number | null
          metric_code?: string
          outcome_confidence?: number | null
          outcome_measured_at?: string | null
          outcome_verdict?: string | null
          side_effects_detected?: Json | null
          tenant_id?: string
          unintended_impact_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_outcome_records_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "early_warning_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcome_records_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "v_active_alerts_hierarchy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcome_records_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "v_alerts_pending_escalation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcome_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_outcomes: {
        Row: {
          actual_impact_amount: number | null
          baseline_metrics: Json | null
          created_at: string
          current_metrics: Json | null
          decision_audit_id: string
          id: string
          impact_variance: number | null
          impact_variance_percent: number | null
          is_auto_measured: boolean | null
          lessons_learned: string | null
          measured_at: string
          measured_by: string | null
          measurement_timestamp: string | null
          outcome_details: string | null
          outcome_status: string
          outcome_summary: string
          supporting_metrics: Json | null
          tenant_id: string
          updated_at: string
          would_repeat: boolean | null
        }
        Insert: {
          actual_impact_amount?: number | null
          baseline_metrics?: Json | null
          created_at?: string
          current_metrics?: Json | null
          decision_audit_id: string
          id?: string
          impact_variance?: number | null
          impact_variance_percent?: number | null
          is_auto_measured?: boolean | null
          lessons_learned?: string | null
          measured_at?: string
          measured_by?: string | null
          measurement_timestamp?: string | null
          outcome_details?: string | null
          outcome_status: string
          outcome_summary: string
          supporting_metrics?: Json | null
          tenant_id: string
          updated_at?: string
          would_repeat?: boolean | null
        }
        Update: {
          actual_impact_amount?: number | null
          baseline_metrics?: Json | null
          created_at?: string
          current_metrics?: Json | null
          decision_audit_id?: string
          id?: string
          impact_variance?: number | null
          impact_variance_percent?: number | null
          is_auto_measured?: boolean | null
          lessons_learned?: string | null
          measured_at?: string
          measured_by?: string | null
          measurement_timestamp?: string | null
          outcome_details?: string | null
          outcome_status?: string
          outcome_summary?: string
          supporting_metrics?: Json | null
          tenant_id?: string
          updated_at?: string
          would_repeat?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_outcomes_decision_audit_id_fkey"
            columns: ["decision_audit_id"]
            isOneToOne: false
            referencedRelation: "decision_audit_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcomes_decision_audit_id_fkey"
            columns: ["decision_audit_id"]
            isOneToOne: false
            referencedRelation: "decisions_pending_followup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcomes_decision_audit_id_fkey"
            columns: ["decision_audit_id"]
            isOneToOne: false
            referencedRelation: "unified_decision_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_snapshots: {
        Row: {
          as_of: string
          authority: string
          calculation_hash: string | null
          confidence: number
          created_at: string
          created_by: string | null
          currency: string
          derived_from: Json
          dimensions: Json
          entity_id: string | null
          entity_type: string
          id: string
          metric_code: string
          metric_version: number
          supersedes_id: string | null
          tenant_id: string
          truth_level: string
          value: number
        }
        Insert: {
          as_of?: string
          authority: string
          calculation_hash?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          derived_from?: Json
          dimensions?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metric_code: string
          metric_version?: number
          supersedes_id?: string | null
          tenant_id: string
          truth_level: string
          value: number
        }
        Update: {
          as_of?: string
          authority?: string
          calculation_hash?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          derived_from?: Json
          dimensions?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          metric_code?: string
          metric_version?: number
          supersedes_id?: string | null
          tenant_id?: string
          truth_level?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "decision_snapshots_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "decision_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_snapshots_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "v_decision_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_threshold_configs: {
        Row: {
          ar_aging_90_critical_percent: number
          ar_overdue_critical_percent: number
          ar_overdue_warning_percent: number
          ccc_critical_days: number
          ccc_warning_days: number
          channel_fee_critical_percent: number
          channel_fee_warning_percent: number
          cm_critical_percent: number
          cm_good_percent: number
          cm_warning_percent: number
          created_at: string
          customer_risk_critical_days: number
          customer_risk_high_days: number
          customer_risk_medium_days: number
          dso_critical_days: number
          dso_warning_days: number
          gross_margin_critical_percent: number
          gross_margin_warning_percent: number
          id: string
          impact_approval_threshold: number
          inventory_critical_days: number
          inventory_warning_days: number
          ltv_cac_critical: number
          ltv_cac_good: number
          ltv_cac_warning: number
          roas_critical: number
          roas_good: number
          roas_warning: number
          runway_critical_months: number
          runway_warning_months: number
          sku_critical_margin_percent: number
          sku_review_margin_percent: number
          sku_stop_margin_percent: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ar_aging_90_critical_percent?: number
          ar_overdue_critical_percent?: number
          ar_overdue_warning_percent?: number
          ccc_critical_days?: number
          ccc_warning_days?: number
          channel_fee_critical_percent?: number
          channel_fee_warning_percent?: number
          cm_critical_percent?: number
          cm_good_percent?: number
          cm_warning_percent?: number
          created_at?: string
          customer_risk_critical_days?: number
          customer_risk_high_days?: number
          customer_risk_medium_days?: number
          dso_critical_days?: number
          dso_warning_days?: number
          gross_margin_critical_percent?: number
          gross_margin_warning_percent?: number
          id?: string
          impact_approval_threshold?: number
          inventory_critical_days?: number
          inventory_warning_days?: number
          ltv_cac_critical?: number
          ltv_cac_good?: number
          ltv_cac_warning?: number
          roas_critical?: number
          roas_good?: number
          roas_warning?: number
          runway_critical_months?: number
          runway_warning_months?: number
          sku_critical_margin_percent?: number
          sku_review_margin_percent?: number
          sku_stop_margin_percent?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ar_aging_90_critical_percent?: number
          ar_overdue_critical_percent?: number
          ar_overdue_warning_percent?: number
          ccc_critical_days?: number
          ccc_warning_days?: number
          channel_fee_critical_percent?: number
          channel_fee_warning_percent?: number
          cm_critical_percent?: number
          cm_good_percent?: number
          cm_warning_percent?: number
          created_at?: string
          customer_risk_critical_days?: number
          customer_risk_high_days?: number
          customer_risk_medium_days?: number
          dso_critical_days?: number
          dso_warning_days?: number
          gross_margin_critical_percent?: number
          gross_margin_warning_percent?: number
          id?: string
          impact_approval_threshold?: number
          inventory_critical_days?: number
          inventory_warning_days?: number
          ltv_cac_critical?: number
          ltv_cac_good?: number
          ltv_cac_warning?: number
          roas_critical?: number
          roas_good?: number
          roas_warning?: number
          runway_critical_months?: number
          runway_warning_months?: number
          sku_critical_margin_percent?: number
          sku_review_margin_percent?: number
          sku_stop_margin_percent?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_threshold_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      depreciation_schedules: {
        Row: {
          accumulated_amount: number
          created_at: string
          depreciation_amount: number
          fixed_asset_id: string
          id: string
          is_posted: boolean | null
          journal_entry_id: string | null
          period_date: string
          remaining_value: number
          tenant_id: string
        }
        Insert: {
          accumulated_amount: number
          created_at?: string
          depreciation_amount: number
          fixed_asset_id: string
          id?: string
          is_posted?: boolean | null
          journal_entry_id?: string | null
          period_date: string
          remaining_value: number
          tenant_id: string
        }
        Update: {
          accumulated_amount?: number
          created_at?: string
          depreciation_amount?: number
          fixed_asset_id?: string
          id?: string
          is_posted?: boolean | null
          journal_entry_id?: string | null
          period_date?: string
          remaining_value?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_schedules_fixed_asset_id_fkey"
            columns: ["fixed_asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_schedules_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      early_warning_alerts: {
        Row: {
          acceleration: number | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_url: string | null
          alert_class: string
          breach_threshold: number | null
          child_count: number | null
          confidence_factors: Json | null
          confidence_level: string
          confidence_score: number | null
          created_at: string | null
          current_owner_role: string | null
          current_value: number
          days_to_breach: number | null
          decision_deadline: string | null
          decision_framing: Json | null
          dimension_key: string | null
          escalated_at: string | null
          escalated_from_role: string | null
          escalation_history: Json | null
          escalation_level: number | null
          escalation_reason: string | null
          estimated_breach_date: string | null
          expires_at: string | null
          exposure_amount: number | null
          exposure_currency: string | null
          hierarchy_level: number | null
          id: string
          impact_description: string | null
          is_parent: boolean | null
          last_action_at: string | null
          message: string | null
          metadata: Json | null
          metric_code: string
          parent_alert_id: string | null
          priority: number | null
          r_squared: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause_explanation: string | null
          root_cause_metric: string | null
          rule_id: string | null
          severity: string | null
          slope: number | null
          status: string | null
          suggested_action: string | null
          suppressed_children: Json | null
          tenant_id: string
          title: string
          trajectory: Json
          updated_at: string | null
        }
        Insert: {
          acceleration?: number | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_url?: string | null
          alert_class: string
          breach_threshold?: number | null
          child_count?: number | null
          confidence_factors?: Json | null
          confidence_level: string
          confidence_score?: number | null
          created_at?: string | null
          current_owner_role?: string | null
          current_value: number
          days_to_breach?: number | null
          decision_deadline?: string | null
          decision_framing?: Json | null
          dimension_key?: string | null
          escalated_at?: string | null
          escalated_from_role?: string | null
          escalation_history?: Json | null
          escalation_level?: number | null
          escalation_reason?: string | null
          estimated_breach_date?: string | null
          expires_at?: string | null
          exposure_amount?: number | null
          exposure_currency?: string | null
          hierarchy_level?: number | null
          id?: string
          impact_description?: string | null
          is_parent?: boolean | null
          last_action_at?: string | null
          message?: string | null
          metadata?: Json | null
          metric_code: string
          parent_alert_id?: string | null
          priority?: number | null
          r_squared?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause_explanation?: string | null
          root_cause_metric?: string | null
          rule_id?: string | null
          severity?: string | null
          slope?: number | null
          status?: string | null
          suggested_action?: string | null
          suppressed_children?: Json | null
          tenant_id: string
          title: string
          trajectory: Json
          updated_at?: string | null
        }
        Update: {
          acceleration?: number | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_url?: string | null
          alert_class?: string
          breach_threshold?: number | null
          child_count?: number | null
          confidence_factors?: Json | null
          confidence_level?: string
          confidence_score?: number | null
          created_at?: string | null
          current_owner_role?: string | null
          current_value?: number
          days_to_breach?: number | null
          decision_deadline?: string | null
          decision_framing?: Json | null
          dimension_key?: string | null
          escalated_at?: string | null
          escalated_from_role?: string | null
          escalation_history?: Json | null
          escalation_level?: number | null
          escalation_reason?: string | null
          estimated_breach_date?: string | null
          expires_at?: string | null
          exposure_amount?: number | null
          exposure_currency?: string | null
          hierarchy_level?: number | null
          id?: string
          impact_description?: string | null
          is_parent?: boolean | null
          last_action_at?: string | null
          message?: string | null
          metadata?: Json | null
          metric_code?: string
          parent_alert_id?: string | null
          priority?: number | null
          r_squared?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause_explanation?: string | null
          root_cause_metric?: string | null
          rule_id?: string | null
          severity?: string | null
          slope?: number | null
          status?: string | null
          suggested_action?: string | null
          suppressed_children?: Json | null
          tenant_id?: string
          title?: string
          trajectory?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "early_warning_alerts_parent_alert_id_fkey"
            columns: ["parent_alert_id"]
            isOneToOne: false
            referencedRelation: "early_warning_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_warning_alerts_parent_alert_id_fkey"
            columns: ["parent_alert_id"]
            isOneToOne: false
            referencedRelation: "v_active_alerts_hierarchy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_warning_alerts_parent_alert_id_fkey"
            columns: ["parent_alert_id"]
            isOneToOne: false
            referencedRelation: "v_alerts_pending_escalation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_warning_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "predictive_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_warning_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_policies: {
        Row: {
          approver_roles: string[]
          condition: Json
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          policy_name: string
          policy_type: string
          priority: number
          required_approvals: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approver_roles?: string[]
          condition: Json
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          policy_name: string
          policy_type: string
          priority?: number
          required_approvals?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approver_roles?: string[]
          condition?: Json
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          policy_name?: string
          policy_type?: string
          priority?: number
          required_approvals?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_events: {
        Row: {
          alert_id: string
          escalated_at: string | null
          escalation_reason: string
          exposure_at_escalation: number | null
          from_role: string
          hours_elapsed: number | null
          id: string
          notification_channel: string | null
          notified_at: string | null
          policy_id: string | null
          tenant_id: string
          to_role: string
        }
        Insert: {
          alert_id: string
          escalated_at?: string | null
          escalation_reason: string
          exposure_at_escalation?: number | null
          from_role: string
          hours_elapsed?: number | null
          id?: string
          notification_channel?: string | null
          notified_at?: string | null
          policy_id?: string | null
          tenant_id: string
          to_role: string
        }
        Update: {
          alert_id?: string
          escalated_at?: string | null
          escalation_reason?: string
          exposure_at_escalation?: number | null
          from_role?: string
          hours_elapsed?: number | null
          id?: string
          notification_channel?: string | null
          notified_at?: string | null
          policy_id?: string | null
          tenant_id?: string
          to_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "early_warning_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "v_active_alerts_hierarchy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "v_alerts_pending_escalation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "escalation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_policies: {
        Row: {
          applies_to_hierarchy_levels: number[] | null
          created_at: string | null
          from_role: string
          id: string
          is_enabled: boolean | null
          min_exposure_amount: number | null
          no_decision_threshold_hours: number | null
          policy_name: string
          tenant_id: string
          to_role: string
          unacknowledged_threshold_hours: number | null
          updated_at: string | null
        }
        Insert: {
          applies_to_hierarchy_levels?: number[] | null
          created_at?: string | null
          from_role: string
          id?: string
          is_enabled?: boolean | null
          min_exposure_amount?: number | null
          no_decision_threshold_hours?: number | null
          policy_name: string
          tenant_id: string
          to_role: string
          unacknowledged_threshold_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          applies_to_hierarchy_levels?: number[] | null
          created_at?: string | null
          from_role?: string
          id?: string
          is_enabled?: boolean | null
          min_exposure_amount?: number | null
          no_decision_threshold_hours?: number | null
          policy_name?: string
          tenant_id?: string
          to_role?: string
          unacknowledged_threshold_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_pipelines: {
        Row: {
          config: Json | null
          created_at: string
          created_by: string | null
          destination: string
          enabled: boolean | null
          error_message: string | null
          id: string
          last_run_at: string | null
          name: string
          records_processed: number | null
          schedule: string | null
          source: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          destination: string
          enabled?: boolean | null
          error_message?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          records_processed?: number | null
          schedule?: string | null
          source: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          destination?: string
          enabled?: boolean | null
          error_message?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          records_processed?: number | null
          schedule?: string | null
          source?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etl_pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_transform_rules: {
        Row: {
          config: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          rule_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rule_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rule_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etl_transform_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exceptions_queue: {
        Row: {
          assigned_to: string | null
          created_at: string
          currency: string
          description: string
          detected_at: string
          evidence: Json
          exception_type: string
          id: string
          impact_amount: number
          last_seen_at: string
          payload: Json
          ref_id: string
          ref_type: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          snoozed_until: string | null
          status: string
          tenant_id: string
          title: string
          triage_notes: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          currency?: string
          description: string
          detected_at?: string
          evidence?: Json
          exception_type: string
          id?: string
          impact_amount?: number
          last_seen_at?: string
          payload?: Json
          ref_id: string
          ref_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          snoozed_until?: string | null
          status?: string
          tenant_id: string
          title: string
          triage_notes?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          currency?: string
          description?: string
          detected_at?: string
          evidence?: Json
          exception_type?: string
          id?: string
          impact_amount?: number
          last_seen_at?: string
          payload?: Json
          ref_id?: string
          ref_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          snoozed_until?: string | null
          status?: string
          tenant_id?: string
          title?: string
          triage_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string
          effective_date: string
          from_currency_id: string
          id: string
          rate: number
          tenant_id: string
          to_currency_id: string
        }
        Insert: {
          created_at?: string
          effective_date: string
          from_currency_id: string
          id?: string
          rate: number
          tenant_id: string
          to_currency_id: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          from_currency_id?: string
          id?: string
          rate?: number
          tenant_id?: string
          to_currency_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_id_fkey"
            columns: ["from_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_id_fkey"
            columns: ["to_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          amount_base: number | null
          category: Database["public"]["Enums"]["expense_category"]
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          description: string
          exchange_rate: number | null
          expense_date: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          payment_method: string | null
          recurring_period: string | null
          reference_number: string | null
          subcategory: string | null
          tax_code_id: string | null
          tenant_id: string | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          amount_base?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description: string
          exchange_rate?: number | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          payment_method?: string | null
          recurring_period?: string | null
          reference_number?: string | null
          subcategory?: string | null
          tax_code_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          amount_base?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string
          exchange_rate?: number | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          payment_method?: string | null
          recurring_period?: string | null
          reference_number?: string | null
          subcategory?: string | null
          tax_code_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      extended_alert_configs: {
        Row: {
          alert_type: string
          category: string
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          notify_email: boolean | null
          notify_immediately: boolean | null
          notify_in_daily_digest: boolean | null
          notify_push: boolean | null
          notify_slack: boolean | null
          notify_sms: boolean | null
          recipient_role: string
          severity: string
          tenant_id: string
          threshold_operator: string | null
          threshold_unit: string | null
          threshold_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          category: string
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          notify_email?: boolean | null
          notify_immediately?: boolean | null
          notify_in_daily_digest?: boolean | null
          notify_push?: boolean | null
          notify_slack?: boolean | null
          notify_sms?: boolean | null
          recipient_role?: string
          severity?: string
          tenant_id: string
          threshold_operator?: string | null
          threshold_unit?: string | null
          threshold_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          notify_email?: boolean | null
          notify_immediately?: boolean | null
          notify_in_daily_digest?: boolean | null
          notify_push?: boolean | null
          notify_slack?: boolean | null
          notify_sms?: boolean | null
          recipient_role?: string
          severity?: string
          tenant_id?: string
          threshold_operator?: string | null
          threshold_unit?: string | null
          threshold_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extended_alert_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_inventory: {
        Row: {
          available_quantity: number | null
          created_at: string | null
          external_product_id: string | null
          id: string
          incoming_quantity: number | null
          integration_id: string
          last_movement_at: string | null
          last_synced_at: string | null
          reserved_quantity: number | null
          tenant_id: string
          total_value: number | null
          unit_cost: number | null
          updated_at: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Insert: {
          available_quantity?: number | null
          created_at?: string | null
          external_product_id?: string | null
          id?: string
          incoming_quantity?: number | null
          integration_id: string
          last_movement_at?: string | null
          last_synced_at?: string | null
          reserved_quantity?: number | null
          tenant_id: string
          total_value?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
          warehouse_name?: string | null
        }
        Update: {
          available_quantity?: number | null
          created_at?: string | null
          external_product_id?: string | null
          id?: string
          incoming_quantity?: number | null
          integration_id?: string
          last_movement_at?: string | null
          last_synced_at?: string | null
          reserved_quantity?: number | null
          tenant_id?: string
          total_value?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
          warehouse_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_inventory_external_product_id_fkey"
            columns: ["external_product_id"]
            isOneToOne: false
            referencedRelation: "external_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_inventory_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "connector_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_order_items: {
        Row: {
          category: string | null
          created_at: string | null
          discount_amount: number | null
          external_order_id: string
          gross_profit: number | null
          id: string
          is_returned: boolean | null
          item_id: string | null
          item_status: string | null
          margin_percent: number | null
          original_price: number | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          raw_data: Json | null
          return_quantity: number | null
          sku: string | null
          tenant_id: string
          total_amount: number | null
          total_cogs: number | null
          unit_cogs: number | null
          unit_price: number | null
          variation_id: string | null
          variation_name: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          discount_amount?: number | null
          external_order_id: string
          gross_profit?: number | null
          id?: string
          is_returned?: boolean | null
          item_id?: string | null
          item_status?: string | null
          margin_percent?: number | null
          original_price?: number | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          raw_data?: Json | null
          return_quantity?: number | null
          sku?: string | null
          tenant_id: string
          total_amount?: number | null
          total_cogs?: number | null
          unit_cogs?: number | null
          unit_price?: number | null
          variation_id?: string | null
          variation_name?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          discount_amount?: number | null
          external_order_id?: string
          gross_profit?: number | null
          id?: string
          is_returned?: boolean | null
          item_id?: string | null
          item_status?: string | null
          margin_percent?: number | null
          original_price?: number | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          raw_data?: Json | null
          return_quantity?: number | null
          sku?: string | null
          tenant_id?: string
          total_amount?: number | null
          total_cogs?: number | null
          unit_cogs?: number | null
          unit_price?: number | null
          variation_id?: string | null
          variation_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_order_items_external_order_id_fkey"
            columns: ["external_order_id"]
            isOneToOne: false
            referencedRelation: "external_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_orders: {
        Row: {
          actual_shipping_fee: number | null
          buyer_id: string | null
          buyer_note: string | null
          buyer_username: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          channel: string
          commission_fee: number | null
          cost_of_goods: number | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          district_name: string | null
          external_order_id: string
          fulfillment_status: string | null
          gross_profit: number | null
          id: string
          integration_id: string
          internal_invoice_id: string | null
          internal_order_id: string | null
          item_count: number | null
          item_discount: number | null
          items: Json
          last_synced_at: string | null
          net_profit: number | null
          net_revenue: number | null
          order_date: string
          order_discount: number | null
          order_number: string
          other_fees: number | null
          paid_at: string | null
          payment_fee: number | null
          payment_method: string | null
          payment_status: string | null
          platform_fee: number | null
          province_code: string | null
          province_name: string | null
          raw_data: Json | null
          refund_amount: number | null
          return_reason: string | null
          seller_income: number | null
          seller_note: string | null
          service_fee: number | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_carrier: string | null
          shipping_fee: number | null
          shipping_fee_discount: number | null
          shipping_fee_paid: number | null
          shop_id: string | null
          shop_name: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tenant_id: string
          total_amount: number | null
          total_fees: number | null
          total_quantity: number | null
          tracking_number: string | null
          updated_at: string | null
          voucher_discount: number | null
          voucher_platform: number | null
          voucher_seller: number | null
        }
        Insert: {
          actual_shipping_fee?: number | null
          buyer_id?: string | null
          buyer_note?: string | null
          buyer_username?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          channel: string
          commission_fee?: number | null
          cost_of_goods?: number | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          district_name?: string | null
          external_order_id: string
          fulfillment_status?: string | null
          gross_profit?: number | null
          id?: string
          integration_id: string
          internal_invoice_id?: string | null
          internal_order_id?: string | null
          item_count?: number | null
          item_discount?: number | null
          items?: Json
          last_synced_at?: string | null
          net_profit?: number | null
          net_revenue?: number | null
          order_date: string
          order_discount?: number | null
          order_number: string
          other_fees?: number | null
          paid_at?: string | null
          payment_fee?: number | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          province_code?: string | null
          province_name?: string | null
          raw_data?: Json | null
          refund_amount?: number | null
          return_reason?: string | null
          seller_income?: number | null
          seller_note?: string | null
          service_fee?: number | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_fee?: number | null
          shipping_fee_discount?: number | null
          shipping_fee_paid?: number | null
          shop_id?: string | null
          shop_name?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tenant_id: string
          total_amount?: number | null
          total_fees?: number | null
          total_quantity?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          voucher_discount?: number | null
          voucher_platform?: number | null
          voucher_seller?: number | null
        }
        Update: {
          actual_shipping_fee?: number | null
          buyer_id?: string | null
          buyer_note?: string | null
          buyer_username?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          channel?: string
          commission_fee?: number | null
          cost_of_goods?: number | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          district_name?: string | null
          external_order_id?: string
          fulfillment_status?: string | null
          gross_profit?: number | null
          id?: string
          integration_id?: string
          internal_invoice_id?: string | null
          internal_order_id?: string | null
          item_count?: number | null
          item_discount?: number | null
          items?: Json
          last_synced_at?: string | null
          net_profit?: number | null
          net_revenue?: number | null
          order_date?: string
          order_discount?: number | null
          order_number?: string
          other_fees?: number | null
          paid_at?: string | null
          payment_fee?: number | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          province_code?: string | null
          province_name?: string | null
          raw_data?: Json | null
          refund_amount?: number | null
          return_reason?: string | null
          seller_income?: number | null
          seller_note?: string | null
          service_fee?: number | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_fee?: number | null
          shipping_fee_discount?: number | null
          shipping_fee_paid?: number | null
          shop_id?: string | null
          shop_name?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tenant_id?: string
          total_amount?: number | null
          total_fees?: number | null
          total_quantity?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          voucher_discount?: number | null
          voucher_platform?: number | null
          voucher_seller?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_orders_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "connector_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_orders_internal_invoice_id_fkey"
            columns: ["internal_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "external_orders_internal_invoice_id_fkey"
            columns: ["internal_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_orders_internal_invoice_id_fkey"
            columns: ["internal_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "external_orders_internal_invoice_id_fkey"
            columns: ["internal_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "external_orders_internal_order_id_fkey"
            columns: ["internal_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_products: {
        Row: {
          available_quantity: number | null
          barcode: string | null
          brand: string | null
          category: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          external_product_id: string
          external_sku: string | null
          id: string
          images: Json | null
          integration_id: string
          internal_product_id: string | null
          last_synced_at: string | null
          name: string
          parent_sku: string | null
          reserved_quantity: number | null
          selling_price: number | null
          status: string | null
          stock_quantity: number | null
          tenant_id: string
          updated_at: string | null
          variants: Json | null
          weight: number | null
        }
        Insert: {
          available_quantity?: number | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          external_product_id: string
          external_sku?: string | null
          id?: string
          images?: Json | null
          integration_id: string
          internal_product_id?: string | null
          last_synced_at?: string | null
          name: string
          parent_sku?: string | null
          reserved_quantity?: number | null
          selling_price?: number | null
          status?: string | null
          stock_quantity?: number | null
          tenant_id: string
          updated_at?: string | null
          variants?: Json | null
          weight?: number | null
        }
        Update: {
          available_quantity?: number | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          external_product_id?: string
          external_sku?: string | null
          id?: string
          images?: Json | null
          integration_id?: string
          internal_product_id?: string | null
          last_synced_at?: string | null
          name?: string
          parent_sku?: string | null
          reserved_quantity?: number | null
          selling_price?: number | null
          status?: string | null
          stock_quantity?: number | null
          tenant_id?: string
          updated_at?: string | null
          variants?: Json | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_products_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "connector_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_decisions: {
        Row: {
          created_at: string
          data_entities: Json | null
          dependencies: Json | null
          feature_name: string
          id: string
          is_live: boolean | null
          owner: string | null
          persona: string | null
          priority: string | null
          rationale: string | null
          required_tables: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          route: string
          status: string | null
          system: string
          target_version: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_entities?: Json | null
          dependencies?: Json | null
          feature_name: string
          id?: string
          is_live?: boolean | null
          owner?: string | null
          persona?: string | null
          priority?: string | null
          rationale?: string | null
          required_tables?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route: string
          status?: string | null
          system: string
          target_version?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_entities?: Json | null
          dependencies?: Json | null
          feature_name?: string
          id?: string
          is_live?: boolean | null
          owner?: string | null
          persona?: string | null
          priority?: string | null
          rationale?: string | null
          required_tables?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string
          status?: string | null
          system?: string
          target_version?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expenses_daily: {
        Row: {
          cogs_amount: number | null
          created_at: string
          day: string
          depreciation_amount: number | null
          expense_count: number | null
          id: string
          interest_amount: number | null
          logistics_amount: number | null
          marketing_amount: number | null
          other_amount: number | null
          rent_amount: number | null
          salary_amount: number | null
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
          utilities_amount: number | null
        }
        Insert: {
          cogs_amount?: number | null
          created_at?: string
          day: string
          depreciation_amount?: number | null
          expense_count?: number | null
          id?: string
          interest_amount?: number | null
          logistics_amount?: number | null
          marketing_amount?: number | null
          other_amount?: number | null
          rent_amount?: number | null
          salary_amount?: number | null
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
          utilities_amount?: number | null
        }
        Update: {
          cogs_amount?: number | null
          created_at?: string
          day?: string
          depreciation_amount?: number | null
          expense_count?: number | null
          id?: string
          interest_amount?: number | null
          logistics_amount?: number | null
          marketing_amount?: number | null
          other_amount?: number | null
          rent_amount?: number | null
          salary_amount?: number | null
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          utilities_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_monthly_summary: {
        Row: {
          ap_balance: number
          ar_balance: number
          avg_order_value: number
          cac: number
          cash_inflows: number
          cash_outflows: number
          ccc: number
          closing_cash: number
          cogs: number
          computed_at: string
          contribution_margin: number
          created_at: string
          customer_count: number
          dio: number
          dpo: number
          dso: number
          ebitda: number
          gross_margin_percent: number
          gross_profit: number
          id: string
          inventory_balance: number
          marketing_spend: number
          month_end: string
          month_start: string
          net_cash_flow: number
          net_revenue: number
          operating_expenses: number
          order_count: number
          revenue_mom_change: number | null
          revenue_yoy_change: number | null
          roas: number
          tenant_id: string
          year_month: string
        }
        Insert: {
          ap_balance?: number
          ar_balance?: number
          avg_order_value?: number
          cac?: number
          cash_inflows?: number
          cash_outflows?: number
          ccc?: number
          closing_cash?: number
          cogs?: number
          computed_at?: string
          contribution_margin?: number
          created_at?: string
          customer_count?: number
          dio?: number
          dpo?: number
          dso?: number
          ebitda?: number
          gross_margin_percent?: number
          gross_profit?: number
          id?: string
          inventory_balance?: number
          marketing_spend?: number
          month_end: string
          month_start: string
          net_cash_flow?: number
          net_revenue?: number
          operating_expenses?: number
          order_count?: number
          revenue_mom_change?: number | null
          revenue_yoy_change?: number | null
          roas?: number
          tenant_id: string
          year_month: string
        }
        Update: {
          ap_balance?: number
          ar_balance?: number
          avg_order_value?: number
          cac?: number
          cash_inflows?: number
          cash_outflows?: number
          ccc?: number
          closing_cash?: number
          cogs?: number
          computed_at?: string
          contribution_margin?: number
          created_at?: string
          customer_count?: number
          dio?: number
          dpo?: number
          dso?: number
          ebitda?: number
          gross_margin_percent?: number
          gross_profit?: number
          id?: string
          inventory_balance?: number
          marketing_spend?: number
          month_end?: string
          month_start?: string
          net_cash_flow?: number
          net_revenue?: number
          operating_expenses?: number
          order_count?: number
          revenue_mom_change?: number | null
          revenue_yoy_change?: number | null
          roas?: number
          tenant_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_monthly_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          is_closed: boolean
          period_month: number
          period_name: string
          period_year: number
          start_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean
          period_month: number
          period_name: string
          period_year: number
          start_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean
          period_month?: number
          period_name?: string
          period_year?: number
          start_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number | null
          asset_code: string
          bill_id: string | null
          category: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          current_value: number | null
          depreciation_method: string | null
          description: string | null
          disposed_date: string | null
          disposed_value: number | null
          gl_asset_account_id: string | null
          gl_depreciation_account_id: string | null
          gl_expense_account_id: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          purchase_date: string
          purchase_value: number
          residual_value: number | null
          status: string | null
          tenant_id: string
          updated_at: string
          useful_life_months: number
          vendor_id: string | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          asset_code: string
          bill_id?: string | null
          category: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          depreciation_method?: string | null
          description?: string | null
          disposed_date?: string | null
          disposed_value?: number | null
          gl_asset_account_id?: string | null
          gl_depreciation_account_id?: string | null
          gl_expense_account_id?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchase_date: string
          purchase_value: number
          residual_value?: number | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          useful_life_months: number
          vendor_id?: string | null
        }
        Update: {
          accumulated_depreciation?: number | null
          asset_code?: string
          bill_id?: string | null
          category?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          depreciation_method?: string | null
          description?: string | null
          disposed_date?: string | null
          disposed_value?: number | null
          gl_asset_account_id?: string | null
          gl_depreciation_account_id?: string | null
          gl_expense_account_id?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string
          purchase_value?: number
          residual_value?: number | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          useful_life_months?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "fixed_assets_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_gl_asset_account_id_fkey"
            columns: ["gl_asset_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_gl_asset_account_id_fkey"
            columns: ["gl_asset_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "fixed_assets_gl_depreciation_account_id_fkey"
            columns: ["gl_depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_gl_depreciation_account_id_fkey"
            columns: ["gl_depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "fixed_assets_gl_expense_account_id_fkey"
            columns: ["gl_expense_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_gl_expense_account_id_fkey"
            columns: ["gl_expense_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "fixed_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      formula_definitions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          example: string | null
          formula: string
          formula_key: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name_en: string
          name_vi: string
          tenant_id: string | null
          updated_at: string
          usage_locations: string[] | null
          variables: Json | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          example?: string | null
          formula: string
          formula_key: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name_en: string
          name_vi: string
          tenant_id?: string | null
          updated_at?: string
          usage_locations?: string[] | null
          variables?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          example?: string | null
          formula?: string
          formula_key?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name_en?: string
          name_vi?: string
          tenant_id?: string | null
          updated_at?: string
          usage_locations?: string[] | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "formula_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      formula_settings: {
        Row: {
          ar_bucket_1: number | null
          ar_bucket_2: number | null
          ar_bucket_3: number | null
          ar_bucket_4: number | null
          cash_burn_rate_critical: number | null
          cash_burn_rate_warning: number | null
          cash_reserve_percentage: number | null
          channel_commission_rates: Json | null
          corporate_tax_rate: number | null
          created_at: string
          custom_parameters: Json | null
          default_depreciation_years: number | null
          default_payment_terms_ap: number | null
          default_payment_terms_ar: number | null
          dio_calculation_days: number | null
          dpo_calculation_days: number | null
          dso_calculation_days: number | null
          financing_debt_ratio_max: number | null
          fiscal_year_days: number | null
          fiscal_year_start_month: number | null
          forecast_collection_rate: number | null
          forecast_confidence_level: number | null
          forecast_default_growth_rate: number | null
          id: string
          inventory_dead_stock_days: number | null
          inventory_holding_cost_rate: number | null
          inventory_slow_moving_days: number | null
          inventory_target_turnover: number | null
          investing_budget_percentage: number | null
          min_cash_runway_months: number | null
          minimum_operating_cash: number | null
          operating_cash_ratio_target: number | null
          promotion_max_discount_rate: number | null
          promotion_min_roi: number | null
          promotion_target_roas: number | null
          safe_cash_runway_months: number | null
          supplier_concentration_warning: number | null
          supplier_early_payment_threshold: number | null
          supplier_payment_compliance_target: number | null
          target_collection_rate: number | null
          target_dso: number | null
          target_gross_margin: number | null
          target_net_margin: number | null
          tenant_id: string
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          ar_bucket_1?: number | null
          ar_bucket_2?: number | null
          ar_bucket_3?: number | null
          ar_bucket_4?: number | null
          cash_burn_rate_critical?: number | null
          cash_burn_rate_warning?: number | null
          cash_reserve_percentage?: number | null
          channel_commission_rates?: Json | null
          corporate_tax_rate?: number | null
          created_at?: string
          custom_parameters?: Json | null
          default_depreciation_years?: number | null
          default_payment_terms_ap?: number | null
          default_payment_terms_ar?: number | null
          dio_calculation_days?: number | null
          dpo_calculation_days?: number | null
          dso_calculation_days?: number | null
          financing_debt_ratio_max?: number | null
          fiscal_year_days?: number | null
          fiscal_year_start_month?: number | null
          forecast_collection_rate?: number | null
          forecast_confidence_level?: number | null
          forecast_default_growth_rate?: number | null
          id?: string
          inventory_dead_stock_days?: number | null
          inventory_holding_cost_rate?: number | null
          inventory_slow_moving_days?: number | null
          inventory_target_turnover?: number | null
          investing_budget_percentage?: number | null
          min_cash_runway_months?: number | null
          minimum_operating_cash?: number | null
          operating_cash_ratio_target?: number | null
          promotion_max_discount_rate?: number | null
          promotion_min_roi?: number | null
          promotion_target_roas?: number | null
          safe_cash_runway_months?: number | null
          supplier_concentration_warning?: number | null
          supplier_early_payment_threshold?: number | null
          supplier_payment_compliance_target?: number | null
          target_collection_rate?: number | null
          target_dso?: number | null
          target_gross_margin?: number | null
          target_net_margin?: number | null
          tenant_id: string
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          ar_bucket_1?: number | null
          ar_bucket_2?: number | null
          ar_bucket_3?: number | null
          ar_bucket_4?: number | null
          cash_burn_rate_critical?: number | null
          cash_burn_rate_warning?: number | null
          cash_reserve_percentage?: number | null
          channel_commission_rates?: Json | null
          corporate_tax_rate?: number | null
          created_at?: string
          custom_parameters?: Json | null
          default_depreciation_years?: number | null
          default_payment_terms_ap?: number | null
          default_payment_terms_ar?: number | null
          dio_calculation_days?: number | null
          dpo_calculation_days?: number | null
          dso_calculation_days?: number | null
          financing_debt_ratio_max?: number | null
          fiscal_year_days?: number | null
          fiscal_year_start_month?: number | null
          forecast_collection_rate?: number | null
          forecast_confidence_level?: number | null
          forecast_default_growth_rate?: number | null
          id?: string
          inventory_dead_stock_days?: number | null
          inventory_holding_cost_rate?: number | null
          inventory_slow_moving_days?: number | null
          inventory_target_turnover?: number | null
          investing_budget_percentage?: number | null
          min_cash_runway_months?: number | null
          minimum_operating_cash?: number | null
          operating_cash_ratio_target?: number | null
          promotion_max_discount_rate?: number | null
          promotion_min_roi?: number | null
          promotion_target_roas?: number | null
          safe_cash_runway_months?: number | null
          supplier_concentration_warning?: number | null
          supplier_early_payment_threshold?: number | null
          supplier_payment_compliance_target?: number | null
          target_collection_rate?: number | null
          target_dso?: number | null
          target_gross_margin?: number | null
          target_net_margin?: number | null
          tenant_id?: string
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "formula_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_account_defaults: {
        Row: {
          accounts_payable_id: string | null
          accounts_receivable_id: string | null
          bank_id: string | null
          cash_id: string | null
          created_at: string
          id: string
          purchase_expense_id: string | null
          purchase_vat_id: string | null
          sales_discount_id: string | null
          sales_revenue_id: string | null
          sales_vat_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accounts_payable_id?: string | null
          accounts_receivable_id?: string | null
          bank_id?: string | null
          cash_id?: string | null
          created_at?: string
          id?: string
          purchase_expense_id?: string | null
          purchase_vat_id?: string | null
          sales_discount_id?: string | null
          sales_revenue_id?: string | null
          sales_vat_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accounts_payable_id?: string | null
          accounts_receivable_id?: string | null
          bank_id?: string | null
          cash_id?: string | null
          created_at?: string
          id?: string
          purchase_expense_id?: string | null
          purchase_vat_id?: string | null
          sales_discount_id?: string | null
          sales_revenue_id?: string | null
          sales_vat_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_account_defaults_accounts_payable_id_fkey"
            columns: ["accounts_payable_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_accounts_payable_id_fkey"
            columns: ["accounts_payable_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_accounts_receivable_id_fkey"
            columns: ["accounts_receivable_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_accounts_receivable_id_fkey"
            columns: ["accounts_receivable_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_cash_id_fkey"
            columns: ["cash_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_cash_id_fkey"
            columns: ["cash_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_purchase_expense_id_fkey"
            columns: ["purchase_expense_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_purchase_expense_id_fkey"
            columns: ["purchase_expense_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_purchase_vat_id_fkey"
            columns: ["purchase_vat_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_purchase_vat_id_fkey"
            columns: ["purchase_vat_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_sales_discount_id_fkey"
            columns: ["sales_discount_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_sales_discount_id_fkey"
            columns: ["sales_discount_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_sales_revenue_id_fkey"
            columns: ["sales_revenue_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_sales_revenue_id_fkey"
            columns: ["sales_revenue_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_sales_vat_id_fkey"
            columns: ["sales_vat_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_defaults_sales_vat_id_fkey"
            columns: ["sales_vat_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_account_defaults_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_subtype: string | null
          account_type: string
          created_at: string
          created_by: string | null
          current_balance: number
          description: string | null
          id: string
          is_active: boolean
          is_header: boolean
          is_system: boolean
          level: number
          normal_balance: string
          parent_account_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_subtype?: string | null
          account_type: string
          created_at?: string
          created_by?: string | null
          current_balance?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_header?: boolean
          is_system?: boolean
          level?: number
          normal_balance: string
          parent_account_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_subtype?: string | null
          account_type?: string
          created_at?: string
          created_by?: string | null
          current_balance?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_header?: boolean
          is_system?: boolean
          level?: number
          normal_balance?: string
          parent_account_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gl_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          file_name: string
          file_type: string
          id: string
          records_failed: number | null
          records_processed: number | null
          records_total: number | null
          source: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name: string
          file_type: string
          id?: string
          records_failed?: number | null
          records_processed?: number | null
          records_total?: number | null
          source?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name?: string
          file_type?: string
          id?: string
          records_failed?: number | null
          records_processed?: number | null
          records_total?: number | null
          source?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligent_alert_rules: {
        Row: {
          alert_group: string | null
          applicable_channels: string[] | null
          calculation_formula: string
          cooldown_hours: number | null
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean | null
          object_type: string | null
          priority: number | null
          priority_order: number | null
          rule_category: string
          rule_code: string
          rule_name: string
          severity: string
          suggested_actions: Json | null
          tenant_id: string
          threshold_config: Json
          threshold_type: string
          updated_at: string
        }
        Insert: {
          alert_group?: string | null
          applicable_channels?: string[] | null
          calculation_formula: string
          cooldown_hours?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          object_type?: string | null
          priority?: number | null
          priority_order?: number | null
          rule_category: string
          rule_code: string
          rule_name: string
          severity?: string
          suggested_actions?: Json | null
          tenant_id: string
          threshold_config?: Json
          threshold_type?: string
          updated_at?: string
        }
        Update: {
          alert_group?: string | null
          applicable_channels?: string[] | null
          calculation_formula?: string
          cooldown_hours?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          object_type?: string | null
          priority?: number | null
          priority_order?: number | null
          rule_category?: string
          rule_code?: string
          rule_name?: string
          severity?: string
          suggested_actions?: Json | null
          tenant_id?: string
          threshold_config?: Json
          threshold_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligent_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_number: string | null
          cost_price: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          manufacture_date: string | null
          product_id: string | null
          quantity: number | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          warehouse_location: string | null
        }
        Insert: {
          batch_number?: string | null
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          manufacture_date?: string | null
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Update: {
          batch_number?: string | null
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          manufacture_date?: string | null
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          last_sold_date: string | null
          notes: string | null
          product_name: string
          quantity: number
          received_date: string
          reorder_point: number | null
          sku: string
          status: string | null
          supplier_id: string | null
          tenant_id: string
          total_value: number | null
          unit_cost: number
          updated_at: string
          warehouse_location: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          last_sold_date?: string | null
          notes?: string | null
          product_name: string
          quantity?: number
          received_date: string
          reorder_point?: number | null
          sku: string
          status?: string | null
          supplier_id?: string | null
          tenant_id: string
          total_value?: number | null
          unit_cost?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          last_sold_date?: string | null
          notes?: string | null
          product_name?: string
          quantity?: number
          received_date?: string
          reorder_point?: number | null
          sku?: string
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string
          total_value?: number | null
          unit_cost?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_levels: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          location: string | null
          product_name: string | null
          quantity_on_hand: number
          sku: string
          tenant_id: string
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          location?: string | null
          product_name?: string | null
          quantity_on_hand?: number
          sku: string
          tenant_id: string
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          location?: string | null
          product_name?: string | null
          quantity_on_hand?: number
          sku?: string
          tenant_id?: string
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          account_number: string | null
          actual_return: number | null
          created_at: string
          created_by: string | null
          current_value: number
          description: string | null
          expected_return: number | null
          id: string
          institution: string | null
          investment_type: string
          maturity_date: string | null
          name: string
          notes: string | null
          principal_amount: number
          risk_level: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          actual_return?: number | null
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          expected_return?: number | null
          id?: string
          institution?: string | null
          investment_type?: string
          maturity_date?: string | null
          name: string
          notes?: string | null
          principal_amount?: number
          risk_level?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          actual_return?: number | null
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          expected_return?: number | null
          id?: string
          institution?: string | null
          investment_type?: string
          maturity_date?: string | null
          name?: string
          notes?: string | null
          principal_amount?: number
          risk_level?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_risk_disclosures: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          compliance_statement: string | null
          created_at: string
          created_by: string
          disclosure_period_end: string
          disclosure_period_start: string
          id: string
          key_risks: Json
          mitigations: Json
          published_at: string | null
          risk_appetite_version: number
          status: string
          summary: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          compliance_statement?: string | null
          created_at?: string
          created_by: string
          disclosure_period_end: string
          disclosure_period_start: string
          id?: string
          key_risks?: Json
          mitigations?: Json
          published_at?: string | null
          risk_appetite_version: number
          status?: string
          summary: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          compliance_statement?: string | null
          created_at?: string
          created_by?: string
          disclosure_period_end?: string
          disclosure_period_start?: string
          id?: string
          key_risks?: Json
          mitigations?: Json
          published_at?: string | null
          risk_appetite_version?: number
          status?: string
          summary?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_risk_disclosures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          product_id: string | null
          quantity: number
          tenant_id: string | null
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id?: string | null
          product_id?: string | null
          quantity?: number
          tenant_id?: string | null
          unit_price: number
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          product_id?: string | null
          quantity?: number
          tenant_id?: string | null
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_promotions: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_id: string | null
          promotion_type: string
          tenant_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string | null
          promotion_type: string
          tenant_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string | null
          promotion_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_promotions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_promotions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_promotions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_promotions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_promotions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          credit_note_amount: number | null
          currency_code: string | null
          customer_id: string | null
          debit_note_amount: number | null
          discount_amount: number | null
          due_date: string
          exchange_rate: number | null
          id: string
          invoice_number: string
          issue_date: string
          net_amount: number | null
          notes: string | null
          paid_amount: number | null
          payment_term_id: string | null
          status: string | null
          subtotal: number
          tenant_id: string | null
          total_amount: number
          total_amount_base: number | null
          updated_at: string
          vat_amount: number
        }
        Insert: {
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_amount?: number | null
          currency_code?: string | null
          customer_id?: string | null
          debit_note_amount?: number | null
          discount_amount?: number | null
          due_date: string
          exchange_rate?: number | null
          id?: string
          invoice_number: string
          issue_date?: string
          net_amount?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_term_id?: string | null
          status?: string | null
          subtotal?: number
          tenant_id?: string | null
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_amount?: number | null
          currency_code?: string | null
          customer_id?: string | null
          debit_note_amount?: number | null
          discount_amount?: number | null
          due_date?: string
          exchange_rate?: number | null
          id?: string
          invoice_number?: string
          issue_date?: string
          net_amount?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_term_id?: string | null
          status?: string | null
          subtotal?: number
          tenant_id?: string | null
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_term_id_fkey"
            columns: ["payment_term_id"]
            isOneToOne: false
            referencedRelation: "payment_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          id: string
          is_approved: boolean
          notes: string | null
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          source_id: string | null
          source_type: string | null
          status: string
          tenant_id: string
          total_credit: number
          total_debit: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          entry_number: string
          id?: string
          is_approved?: boolean
          notes?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          is_approved?: boolean
          notes?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          cost_center_id: string | null
          created_at: string
          credit_amount: number
          credit_amount_base: number | null
          currency_code: string | null
          debit_amount: number
          debit_amount_base: number | null
          description: string | null
          exchange_rate: number | null
          id: string
          journal_entry_id: string
          line_number: number
          tenant_id: string
        }
        Insert: {
          account_id: string
          cost_center_id?: string | null
          created_at?: string
          credit_amount?: number
          credit_amount_base?: number | null
          currency_code?: string | null
          debit_amount?: number
          debit_amount_base?: number | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id: string
          line_number?: number
          tenant_id: string
        }
        Update: {
          account_id?: string
          cost_center_id?: string | null
          created_at?: string
          credit_amount?: number
          credit_amount_base?: number | null
          currency_code?: string | null
          debit_amount?: number
          debit_amount_base?: number | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string
          line_number?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data: {
        Row: {
          category: string | null
          channel: string | null
          competitor_count: number | null
          created_at: string | null
          data_date: string
          data_source: string | null
          id: string
          market_share_change: number | null
          market_share_percent: number | null
          market_total_revenue: number | null
          notes: string | null
          our_ranking: number | null
          our_revenue: number | null
          prev_market_share_percent: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          channel?: string | null
          competitor_count?: number | null
          created_at?: string | null
          data_date: string
          data_source?: string | null
          id?: string
          market_share_change?: number | null
          market_share_percent?: number | null
          market_total_revenue?: number | null
          notes?: string | null
          our_ranking?: number | null
          our_revenue?: number | null
          prev_market_share_percent?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          channel?: string | null
          competitor_count?: number | null
          created_at?: string | null
          data_date?: string
          data_source?: string | null
          id?: string
          market_share_change?: number | null
          market_share_percent?: number | null
          market_total_revenue?: number | null
          notes?: string | null
          our_ranking?: number | null
          our_revenue?: number | null
          prev_market_share_percent?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_expenses: {
        Row: {
          amount: number
          campaign_id: string | null
          campaign_name: string | null
          channel: string
          clicks: number | null
          conversions: number | null
          created_at: string
          expense_date: string
          id: string
          impressions: number | null
          raw_data: Json | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          campaign_id?: string | null
          campaign_name?: string | null
          channel: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          expense_date: string
          id?: string
          impressions?: number | null
          raw_data?: Json | null
          tenant_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          campaign_name?: string | null
          channel?: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          expense_date?: string
          id?: string
          impressions?: number | null
          raw_data?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_trend_snapshots: {
        Row: {
          created_at: string | null
          dimension_key: string | null
          id: string
          metric_code: string
          metric_value: number
          period_date: string
          period_type: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          dimension_key?: string | null
          id?: string
          metric_code: string
          metric_value: number
          period_date: string
          period_type?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          dimension_key?: string | null
          id?: string
          metric_code?: string
          metric_value?: number
          period_date?: string
          period_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_trend_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_calibration_snapshots: {
        Row: {
          accuracy: number
          calibration_error: number
          created_at: string
          id: string
          model_version: string
          sample_size: number
          tenant_id: string
        }
        Insert: {
          accuracy: number
          calibration_error: number
          created_at?: string
          id?: string
          model_version: string
          sample_size: number
          tenant_id: string
        }
        Update: {
          accuracy?: number
          calibration_error?: number
          created_at?: string
          id?: string
          model_version?: string
          sample_size?: number
          tenant_id?: string
        }
        Relationships: []
      }
      ml_drift_events: {
        Row: {
          detected_at: string
          drift_metric: string
          drift_value: number
          id: string
          model_version: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          tenant_id: string
          threshold: number
        }
        Insert: {
          detected_at?: string
          drift_metric: string
          drift_value: number
          id?: string
          model_version: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id: string
          threshold: number
        }
        Update: {
          detected_at?: string
          drift_metric?: string
          drift_value?: number
          id?: string
          model_version?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id?: string
          threshold?: number
        }
        Relationships: []
      }
      ml_drift_signals: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          auto_action_taken: string | null
          baseline_value: number | null
          current_value: number | null
          delta: number | null
          details: Json
          detected_at: string
          drift_type: string
          id: string
          metric: string
          model_version: string
          severity: string
          tenant_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          auto_action_taken?: string | null
          baseline_value?: number | null
          current_value?: number | null
          delta?: number | null
          details: Json
          detected_at?: string
          drift_type: string
          id?: string
          metric: string
          model_version: string
          severity: string
          tenant_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          auto_action_taken?: string | null
          baseline_value?: number | null
          current_value?: number | null
          delta?: number | null
          details?: Json
          detected_at?: string
          drift_type?: string
          id?: string
          metric?: string
          model_version?: string
          severity?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_drift_signals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_performance_snapshots: {
        Row: {
          accuracy: number
          calibration_error: number
          confirmed_correct: number
          confirmed_incorrect: number
          created_at: string
          false_auto_rate: number
          guardrail_block_rate: number
          id: string
          model_version: string
          period_end: string
          period_start: string
          tenant_id: string
          total_predictions: number
          unknown_outcomes: number
        }
        Insert: {
          accuracy: number
          calibration_error: number
          confirmed_correct: number
          confirmed_incorrect: number
          created_at?: string
          false_auto_rate: number
          guardrail_block_rate: number
          id?: string
          model_version: string
          period_end: string
          period_start: string
          tenant_id: string
          total_predictions: number
          unknown_outcomes: number
        }
        Update: {
          accuracy?: number
          calibration_error?: number
          confirmed_correct?: number
          confirmed_incorrect?: number
          created_at?: string
          false_auto_rate?: number
          guardrail_block_rate?: number
          id?: string
          model_version?: string
          period_end?: string
          period_start?: string
          tenant_id?: string
          total_predictions?: number
          unknown_outcomes?: number
        }
        Relationships: [
          {
            foreignKeyName: "ml_performance_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_prediction_logs: {
        Row: {
          created_at: string
          exception_id: string
          explanation: Json
          features_hash: string
          final_confidence: number
          id: string
          model_version: string
          predicted_confidence: number
          suggestion_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          exception_id: string
          explanation: Json
          features_hash: string
          final_confidence: number
          id?: string
          model_version: string
          predicted_confidence: number
          suggestion_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          exception_id?: string
          explanation?: Json
          features_hash?: string
          final_confidence?: number
          id?: string
          model_version?: string
          predicted_confidence?: number
          suggestion_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_prediction_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_training_samples: {
        Row: {
          created_at: string
          exception_type: string
          features: Json
          id: string
          label: boolean
          outcome_source: string | null
          suggestion_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          exception_type: string
          features: Json
          id?: string
          label: boolean
          outcome_source?: string | null
          suggestion_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          exception_type?: string
          features?: Json
          id?: string
          label?: boolean
          outcome_source?: string | null
          suggestion_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_training_samples_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      monte_carlo_results: {
        Row: {
          created_at: string
          created_by: string | null
          distribution_data: Json | null
          id: string
          max_ebitda: number | null
          mean_ebitda: number | null
          min_ebitda: number | null
          p10_ebitda: number | null
          p50_ebitda: number | null
          p90_ebitda: number | null
          scenario_id: string | null
          simulation_count: number
          std_dev_ebitda: number | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          distribution_data?: Json | null
          id?: string
          max_ebitda?: number | null
          mean_ebitda?: number | null
          min_ebitda?: number | null
          p10_ebitda?: number | null
          p50_ebitda?: number | null
          p90_ebitda?: number | null
          scenario_id?: string | null
          simulation_count?: number
          std_dev_ebitda?: number | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          distribution_data?: Json | null
          id?: string
          max_ebitda?: number | null
          mean_ebitda?: number | null
          min_ebitda?: number | null
          p10_ebitda?: number | null
          p50_ebitda?: number | null
          p90_ebitda?: number | null
          scenario_id?: string | null
          simulation_count?: number
          std_dev_ebitda?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monte_carlo_results_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monte_carlo_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: string
          slack_user_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          role?: string
          slack_user_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          role?: string
          slack_user_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          alert_instance_id: string | null
          category: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string | null
          metadata: Json | null
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          alert_instance_id?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          alert_instance_id?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_instance_id_fkey"
            columns: ["alert_instance_id"]
            isOneToOne: false
            referencedRelation: "alert_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      object_calculated_metrics: {
        Row: {
          avg_daily_sales: number | null
          avg_response_time_minutes: number | null
          calculation_inputs: Json | null
          conversion_rate: number | null
          created_at: string
          current_stock: number | null
          daily_revenue: number | null
          days_of_stock: number | null
          days_since_last_sale: number | null
          dos_status: string | null
          external_id: string | null
          gross_margin_percent: number | null
          id: string
          last_calculated_at: string
          margin_status: string | null
          object_id: string | null
          object_name: string
          object_type: string
          refund_rate: number | null
          reorder_point: number | null
          return_rate: number | null
          revenue_status: string | null
          revenue_variance_percent: number | null
          sales_velocity: number | null
          stockout_risk_days: number | null
          target_progress: number | null
          target_revenue: number | null
          tenant_id: string
          trend_direction: string | null
          trend_percent: number | null
          updated_at: string
          velocity_change_percent: number | null
          velocity_status: string | null
        }
        Insert: {
          avg_daily_sales?: number | null
          avg_response_time_minutes?: number | null
          calculation_inputs?: Json | null
          conversion_rate?: number | null
          created_at?: string
          current_stock?: number | null
          daily_revenue?: number | null
          days_of_stock?: number | null
          days_since_last_sale?: number | null
          dos_status?: string | null
          external_id?: string | null
          gross_margin_percent?: number | null
          id?: string
          last_calculated_at?: string
          margin_status?: string | null
          object_id?: string | null
          object_name: string
          object_type: string
          refund_rate?: number | null
          reorder_point?: number | null
          return_rate?: number | null
          revenue_status?: string | null
          revenue_variance_percent?: number | null
          sales_velocity?: number | null
          stockout_risk_days?: number | null
          target_progress?: number | null
          target_revenue?: number | null
          tenant_id: string
          trend_direction?: string | null
          trend_percent?: number | null
          updated_at?: string
          velocity_change_percent?: number | null
          velocity_status?: string | null
        }
        Update: {
          avg_daily_sales?: number | null
          avg_response_time_minutes?: number | null
          calculation_inputs?: Json | null
          conversion_rate?: number | null
          created_at?: string
          current_stock?: number | null
          daily_revenue?: number | null
          days_of_stock?: number | null
          days_since_last_sale?: number | null
          dos_status?: string | null
          external_id?: string | null
          gross_margin_percent?: number | null
          id?: string
          last_calculated_at?: string
          margin_status?: string | null
          object_id?: string | null
          object_name?: string
          object_type?: string
          refund_rate?: number | null
          reorder_point?: number | null
          return_rate?: number | null
          revenue_status?: string | null
          revenue_variance_percent?: number | null
          sales_velocity?: number | null
          stockout_risk_days?: number | null
          target_progress?: number | null
          target_revenue?: number | null
          tenant_id?: string
          trend_direction?: string | null
          trend_percent?: number | null
          updated_at?: string
          velocity_change_percent?: number | null
          velocity_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_calculated_metrics_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "alert_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_calculated_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_auto_approval_rules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_enabled: boolean
          max_amount: number | null
          source: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          max_amount?: number | null
          source: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          max_amount?: number | null
          source?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_auto_approval_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          approved_at: string | null
          collected_at: string | null
          completed_at: string | null
          created_at: string | null
          handling_notes: string | null
          id: string
          order_id: string | null
          refund_amount: number | null
          return_created_at: string | null
          return_reason: string | null
          return_type: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          collected_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          handling_notes?: string | null
          id?: string
          order_id?: string | null
          refund_amount?: number | null
          return_created_at?: string | null
          return_reason?: string | null
          return_type?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          collected_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          handling_notes?: string | null
          id?: string
          order_id?: string | null
          refund_amount?: number | null
          return_created_at?: string | null
          return_reason?: string | null
          return_type?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          carrier_code: string | null
          cod_collected_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          delivered_at: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          notes: string | null
          order_date: string
          order_number: string
          platform_sla_days: number | null
          shipped_at: string | null
          source: string
          status: string
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          carrier_code?: string | null
          cod_collected_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          delivered_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          notes?: string | null
          order_date?: string
          order_number: string
          platform_sla_days?: number | null
          shipped_at?: string | null
          source: string
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          carrier_code?: string | null
          cod_collected_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          delivered_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          notes?: string | null
          order_date?: string
          order_number?: string
          platform_sla_days?: number | null
          shipped_at?: string | null
          source?: string
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      page_reviews: {
        Row: {
          id: string
          notes: string | null
          reviewed_status: string | null
          route: string
          system: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          notes?: string | null
          reviewed_status?: string | null
          route: string
          system: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          notes?: string | null
          reviewed_status?: string | null
          route?: string
          system?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_terms: {
        Row: {
          code: string
          created_at: string
          days: number
          discount_days: number | null
          discount_percent: number | null
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          days?: number
          discount_days?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          days?: number
          discount_days?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_terms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference_code: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_code?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_code?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_report_cache: {
        Row: {
          calculated_at: string | null
          category_data: Json | null
          cogs: number | null
          comparison_data: Json | null
          contract_revenue: number | null
          created_at: string | null
          gross_margin: number | null
          gross_profit: number | null
          gross_sales: number | null
          id: string
          income_before_tax: number | null
          income_tax: number | null
          integrated_revenue: number | null
          interest_expense: number | null
          invoice_revenue: number | null
          net_income: number | null
          net_margin: number | null
          net_sales: number | null
          operating_income: number | null
          operating_margin: number | null
          opex_depreciation: number | null
          opex_insurance: number | null
          opex_maintenance: number | null
          opex_marketing: number | null
          opex_other: number | null
          opex_professional: number | null
          opex_rent: number | null
          opex_salaries: number | null
          opex_supplies: number | null
          opex_utilities: number | null
          other_income: number | null
          period_month: number | null
          period_quarter: number | null
          period_type: string | null
          period_year: number
          sales_discounts: number | null
          sales_returns: number | null
          tenant_id: string
          total_opex: number | null
          updated_at: string | null
        }
        Insert: {
          calculated_at?: string | null
          category_data?: Json | null
          cogs?: number | null
          comparison_data?: Json | null
          contract_revenue?: number | null
          created_at?: string | null
          gross_margin?: number | null
          gross_profit?: number | null
          gross_sales?: number | null
          id?: string
          income_before_tax?: number | null
          income_tax?: number | null
          integrated_revenue?: number | null
          interest_expense?: number | null
          invoice_revenue?: number | null
          net_income?: number | null
          net_margin?: number | null
          net_sales?: number | null
          operating_income?: number | null
          operating_margin?: number | null
          opex_depreciation?: number | null
          opex_insurance?: number | null
          opex_maintenance?: number | null
          opex_marketing?: number | null
          opex_other?: number | null
          opex_professional?: number | null
          opex_rent?: number | null
          opex_salaries?: number | null
          opex_supplies?: number | null
          opex_utilities?: number | null
          other_income?: number | null
          period_month?: number | null
          period_quarter?: number | null
          period_type?: string | null
          period_year: number
          sales_discounts?: number | null
          sales_returns?: number | null
          tenant_id: string
          total_opex?: number | null
          updated_at?: string | null
        }
        Update: {
          calculated_at?: string | null
          category_data?: Json | null
          cogs?: number | null
          comparison_data?: Json | null
          contract_revenue?: number | null
          created_at?: string | null
          gross_margin?: number | null
          gross_profit?: number | null
          gross_sales?: number | null
          id?: string
          income_before_tax?: number | null
          income_tax?: number | null
          integrated_revenue?: number | null
          interest_expense?: number | null
          invoice_revenue?: number | null
          net_income?: number | null
          net_margin?: number | null
          net_sales?: number | null
          operating_income?: number | null
          operating_margin?: number | null
          opex_depreciation?: number | null
          opex_insurance?: number | null
          opex_maintenance?: number | null
          opex_marketing?: number | null
          opex_other?: number | null
          opex_professional?: number | null
          opex_rent?: number | null
          opex_salaries?: number | null
          opex_supplies?: number | null
          opex_utilities?: number | null
          other_income?: number | null
          period_month?: number | null
          period_quarter?: number | null
          period_type?: string | null
          period_year?: number
          sales_discounts?: number | null
          sales_returns?: number | null
          tenant_id?: string
          total_opex?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pl_report_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_violations: {
        Row: {
          action_required: string | null
          affected_products: string[] | null
          channel: string
          created_at: string | null
          deadline: string | null
          description: string | null
          detected_at: string | null
          id: string
          penalty_amount: number | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          violation_code: string | null
          violation_type: string
        }
        Insert: {
          action_required?: string | null
          affected_products?: string[] | null
          channel: string
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          penalty_amount?: number | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          violation_code?: string | null
          violation_type: string
        }
        Update: {
          action_required?: string | null
          affected_products?: string[] | null
          channel?: string
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          penalty_amount?: number | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          violation_code?: string | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_violations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_terminals: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_heartbeat_at: string | null
          last_transaction_at: string | null
          offline_since: string | null
          software_version: string | null
          status: string | null
          store_id: string | null
          tenant_id: string
          terminal_code: string
          terminal_name: string | null
          total_downtime_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_heartbeat_at?: string | null
          last_transaction_at?: string | null
          offline_since?: string | null
          software_version?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id: string
          terminal_code: string
          terminal_name?: string | null
          total_downtime_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_heartbeat_at?: string | null
          last_transaction_at?: string | null
          offline_since?: string | null
          software_version?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id?: string
          terminal_code?: string
          terminal_name?: string | null
          total_downtime_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_terminals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_terminals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_alert_rules: {
        Row: {
          breach_threshold: number
          consecutive_periods: number | null
          cooldown_hours: number | null
          created_at: string | null
          decision_framing_template: Json | null
          description: string | null
          dimension_filter: string | null
          id: string
          is_enabled: boolean | null
          lookback_periods: number | null
          metric_code: string
          min_acceleration_trigger: number | null
          min_data_points: number | null
          min_slope_trigger: number | null
          priority: number | null
          rule_code: string
          rule_name: string
          severity: string | null
          suggested_actions: Json | null
          tenant_id: string
          threshold_direction: string | null
          trend_type: string | null
          updated_at: string | null
        }
        Insert: {
          breach_threshold: number
          consecutive_periods?: number | null
          cooldown_hours?: number | null
          created_at?: string | null
          decision_framing_template?: Json | null
          description?: string | null
          dimension_filter?: string | null
          id?: string
          is_enabled?: boolean | null
          lookback_periods?: number | null
          metric_code: string
          min_acceleration_trigger?: number | null
          min_data_points?: number | null
          min_slope_trigger?: number | null
          priority?: number | null
          rule_code: string
          rule_name: string
          severity?: string | null
          suggested_actions?: Json | null
          tenant_id: string
          threshold_direction?: string | null
          trend_type?: string | null
          updated_at?: string | null
        }
        Update: {
          breach_threshold?: number
          consecutive_periods?: number | null
          cooldown_hours?: number | null
          created_at?: string | null
          decision_framing_template?: Json | null
          description?: string | null
          dimension_filter?: string | null
          id?: string
          is_enabled?: boolean | null
          lookback_periods?: number | null
          metric_code?: string
          min_acceleration_trigger?: number | null
          min_data_points?: number | null
          min_slope_trigger?: number | null
          priority?: number | null
          rule_code?: string
          rule_name?: string
          severity?: string | null
          suggested_actions?: Json | null
          tenant_id?: string
          threshold_direction?: string | null
          trend_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictive_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_master: {
        Row: {
          attributes: Json | null
          avg_margin_percent: number | null
          avg_selling_price: number | null
          barcode: string | null
          brand: string | null
          category: string | null
          channel_skus: Json | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          gl_cogs_account_id: string | null
          gl_inventory_account_id: string | null
          gl_revenue_account_id: string | null
          id: string
          internal_product_id: string | null
          is_active: boolean | null
          last_calculated_at: string | null
          lead_time_days: number | null
          max_stock: number | null
          min_stock: number | null
          product_name: string
          reorder_point: number | null
          selling_price: number | null
          sku: string
          subcategory: string | null
          supplier_id: string | null
          tenant_id: string
          total_profit: number | null
          total_revenue: number | null
          total_sold: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          attributes?: Json | null
          avg_margin_percent?: number | null
          avg_selling_price?: number | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          channel_skus?: Json | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          gl_cogs_account_id?: string | null
          gl_inventory_account_id?: string | null
          gl_revenue_account_id?: string | null
          id?: string
          internal_product_id?: string | null
          is_active?: boolean | null
          last_calculated_at?: string | null
          lead_time_days?: number | null
          max_stock?: number | null
          min_stock?: number | null
          product_name: string
          reorder_point?: number | null
          selling_price?: number | null
          sku: string
          subcategory?: string | null
          supplier_id?: string | null
          tenant_id: string
          total_profit?: number | null
          total_revenue?: number | null
          total_sold?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          attributes?: Json | null
          avg_margin_percent?: number | null
          avg_selling_price?: number | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          channel_skus?: Json | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          gl_cogs_account_id?: string | null
          gl_inventory_account_id?: string | null
          gl_revenue_account_id?: string | null
          id?: string
          internal_product_id?: string | null
          is_active?: boolean | null
          last_calculated_at?: string | null
          lead_time_days?: number | null
          max_stock?: number | null
          min_stock?: number | null
          product_name?: string
          reorder_point?: number | null
          selling_price?: number | null
          sku?: string
          subcategory?: string | null
          supplier_id?: string | null
          tenant_id?: string
          total_profit?: number | null
          total_revenue?: number | null
          total_sold?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_master_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_metrics: {
        Row: {
          avg_daily_orders: number | null
          avg_daily_quantity: number | null
          avg_daily_revenue: number | null
          brand: string | null
          category: string | null
          channel_breakdown: Json | null
          created_at: string
          current_stock: number | null
          days_of_stock: number | null
          gross_margin: number | null
          gross_margin_percent: number | null
          gross_profit_30d: number | null
          id: string
          is_profitable: boolean | null
          last_calculated_at: string | null
          last_order_date: string | null
          product_id: string | null
          product_name: string
          profit_per_unit: number | null
          profit_status: string | null
          sku: string
          tenant_id: string
          total_cost_30d: number | null
          total_orders_30d: number | null
          total_quantity_30d: number | null
          total_revenue_30d: number | null
          unit_cost: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          avg_daily_orders?: number | null
          avg_daily_quantity?: number | null
          avg_daily_revenue?: number | null
          brand?: string | null
          category?: string | null
          channel_breakdown?: Json | null
          created_at?: string
          current_stock?: number | null
          days_of_stock?: number | null
          gross_margin?: number | null
          gross_margin_percent?: number | null
          gross_profit_30d?: number | null
          id?: string
          is_profitable?: boolean | null
          last_calculated_at?: string | null
          last_order_date?: string | null
          product_id?: string | null
          product_name: string
          profit_per_unit?: number | null
          profit_status?: string | null
          sku: string
          tenant_id: string
          total_cost_30d?: number | null
          total_orders_30d?: number | null
          total_quantity_30d?: number | null
          total_revenue_30d?: number | null
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          avg_daily_orders?: number | null
          avg_daily_quantity?: number | null
          avg_daily_revenue?: number | null
          brand?: string | null
          category?: string | null
          channel_breakdown?: Json | null
          created_at?: string
          current_stock?: number | null
          days_of_stock?: number | null
          gross_margin?: number | null
          gross_margin_percent?: number | null
          gross_profit_30d?: number | null
          id?: string
          is_profitable?: boolean | null
          last_calculated_at?: string | null
          last_order_date?: string | null
          product_id?: string | null
          product_name?: string
          profit_per_unit?: number | null
          profit_status?: string | null
          sku?: string
          tenant_id?: string
          total_cost_30d?: number | null
          total_orders_30d?: number | null
          total_quantity_30d?: number | null
          total_revenue_30d?: number | null
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_daily_sales: number | null
          brand: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          gross_margin: number | null
          gross_margin_percent: number | null
          id: string
          is_active: boolean | null
          is_profitable: boolean | null
          last_sale_date: string | null
          name: string
          platform_stock: Json | null
          prev_sales_velocity: number | null
          reorder_point: number | null
          sales_velocity: number | null
          selling_price: number | null
          sku: string | null
          subcategory: string | null
          tenant_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          avg_daily_sales?: number | null
          brand?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          gross_margin?: number | null
          gross_margin_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_profitable?: boolean | null
          last_sale_date?: string | null
          name: string
          platform_stock?: Json | null
          prev_sales_velocity?: number | null
          reorder_point?: number | null
          sales_velocity?: number | null
          selling_price?: number | null
          sku?: string | null
          subcategory?: string | null
          tenant_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_daily_sales?: number | null
          brand?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          gross_margin?: number | null
          gross_margin_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_profitable?: boolean | null
          last_sale_date?: string | null
          name?: string
          platform_stock?: Json | null
          prev_sales_velocity?: number | null
          reorder_point?: number | null
          sales_velocity?: number | null
          selling_price?: number | null
          sku?: string | null
          subcategory?: string | null
          tenant_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_tenant_id: string | null
          avatar_url: string | null
          company: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          active_tenant_id?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          active_tenant_id?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_tenant_id_fkey"
            columns: ["active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_campaigns: {
        Row: {
          actual_cost: number | null
          budget: number | null
          campaign_name: string
          campaign_type: string | null
          channel: string | null
          created_at: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string | null
          tenant_id: string
          total_discount_given: number | null
          total_orders: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          campaign_name: string
          campaign_type?: string | null
          channel?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          tenant_id: string
          total_discount_given?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          campaign_name?: string
          campaign_type?: string | null
          channel?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          total_discount_given?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_performance: {
        Row: {
          avg_order_value: number | null
          cogs: number | null
          created_at: string
          discount_given: number | null
          gross_profit: number | null
          gross_revenue: number | null
          id: string
          net_revenue: number | null
          new_customers: number | null
          orders_count: number | null
          performance_date: string
          promotion_id: string
          repeat_customers: number | null
          tenant_id: string
        }
        Insert: {
          avg_order_value?: number | null
          cogs?: number | null
          created_at?: string
          discount_given?: number | null
          gross_profit?: number | null
          gross_revenue?: number | null
          id?: string
          net_revenue?: number | null
          new_customers?: number | null
          orders_count?: number | null
          performance_date: string
          promotion_id: string
          repeat_customers?: number | null
          tenant_id: string
        }
        Update: {
          avg_order_value?: number | null
          cogs?: number | null
          created_at?: string
          discount_given?: number | null
          gross_profit?: number | null
          gross_revenue?: number | null
          id?: string
          net_revenue?: number | null
          new_customers?: number | null
          orders_count?: number | null
          performance_date?: string
          promotion_id?: string
          repeat_customers?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_performance_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_performance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          actual_orders: number | null
          actual_revenue: number | null
          actual_spend: number | null
          budget: number | null
          channel: string | null
          created_at: string
          created_by: string | null
          discount_value: number | null
          end_date: string
          id: string
          max_discount: number | null
          min_order_value: number | null
          notes: string | null
          promotion_code: string | null
          promotion_name: string
          promotion_type: string
          start_date: string
          status: string | null
          target_orders: number | null
          target_revenue: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_orders?: number | null
          actual_revenue?: number | null
          actual_spend?: number | null
          budget?: number | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          discount_value?: number | null
          end_date: string
          id?: string
          max_discount?: number | null
          min_order_value?: number | null
          notes?: string | null
          promotion_code?: string | null
          promotion_name: string
          promotion_type: string
          start_date: string
          status?: string | null
          target_orders?: number | null
          target_revenue?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_orders?: number | null
          actual_revenue?: number | null
          actual_spend?: number | null
          budget?: number | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          discount_value?: number | null
          end_date?: string
          id?: string
          max_discount?: number | null
          min_order_value?: number | null
          notes?: string | null
          promotion_code?: string | null
          promotion_name?: string
          promotion_type?: string
          start_date?: string
          status?: string | null
          target_orders?: number | null
          target_revenue?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string | null
          purchase_order_id: string
          quantity_ordered: number | null
          quantity_received: number | null
          sku: string | null
          tenant_id: string
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          purchase_order_id: string
          quantity_ordered?: number | null
          quantity_received?: number | null
          sku?: string | null
          tenant_id: string
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          purchase_order_id?: string
          quantity_ordered?: number | null
          quantity_received?: number | null
          sku?: string | null
          tenant_id?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string | null
          expected_delivery_date: string | null
          expected_lead_time_days: number | null
          id: string
          is_on_time: boolean | null
          items_count: number | null
          items_received: number | null
          lead_time_days: number | null
          notes: string | null
          order_date: string | null
          po_number: string
          received_amount: number | null
          status: string | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          expected_lead_time_days?: number | null
          id?: string
          is_on_time?: boolean | null
          items_count?: number | null
          items_received?: number | null
          lead_time_days?: number | null
          notes?: string | null
          order_date?: string | null
          po_number: string
          received_amount?: number | null
          status?: string | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          expected_lead_time_days?: number | null
          id?: string
          is_on_time?: boolean | null
          items_count?: number | null
          items_received?: number | null
          lead_time_days?: number | null
          notes?: string | null
          order_date?: string | null
          po_number?: string
          received_amount?: number | null
          status?: string | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_info: Json | null
          endpoint: string
          id: string
          is_active: boolean
          p256dh_key: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          device_info?: Json | null
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh_key: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          device_info?: Json | null
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh_key?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_kpi_snapshots: {
        Row: {
          auto_confirmed_count: number
          avg_confidence: number | null
          cash_acceleration_amount: number | null
          cash_acceleration_days: number | null
          created_at: string
          estimated_cost_saved: number | null
          estimated_minutes_saved: number | null
          false_auto_count: number
          id: string
          manual_confirmed_count: number
          period_end: string
          period_start: string
          tenant_id: string
          total_suggestions: number
        }
        Insert: {
          auto_confirmed_count?: number
          avg_confidence?: number | null
          cash_acceleration_amount?: number | null
          cash_acceleration_days?: number | null
          created_at?: string
          estimated_cost_saved?: number | null
          estimated_minutes_saved?: number | null
          false_auto_count?: number
          id?: string
          manual_confirmed_count?: number
          period_end: string
          period_start: string
          tenant_id: string
          total_suggestions?: number
        }
        Update: {
          auto_confirmed_count?: number
          avg_confidence?: number | null
          cash_acceleration_amount?: number | null
          cash_acceleration_days?: number | null
          created_at?: string
          estimated_cost_saved?: number | null
          estimated_minutes_saved?: number | null
          false_auto_count?: number
          id?: string
          manual_confirmed_count?: number
          period_end?: string
          period_start?: string
          tenant_id?: string
          total_suggestions?: number
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_kpi_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_links: {
        Row: {
          bank_transaction_id: string | null
          confidence: number
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          is_voided: boolean
          match_evidence: Json | null
          match_type: string
          settlement_amount: number
          settlement_date: string
          target_id: string
          target_type: string
          tenant_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          bank_transaction_id?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          is_voided?: boolean
          match_evidence?: Json | null
          match_type: string
          settlement_amount: number
          settlement_date?: string
          target_id: string
          target_type?: string
          tenant_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          bank_transaction_id?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          is_voided?: boolean
          match_evidence?: Json | null
          match_type?: string
          settlement_amount?: number
          settlement_date?: string
          target_id?: string
          target_type?: string
          tenant_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_links_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_links_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_bank_txn_match_state"
            referencedColumns: ["bank_transaction_id"]
          },
          {
            foreignKeyName: "reconciliation_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_ml_features: {
        Row: {
          created_at: string
          exception_type: string
          features: Json
          id: string
          label: string | null
          suggestion_id: string
          suggestion_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          exception_type: string
          features: Json
          id?: string
          label?: string | null
          suggestion_id: string
          suggestion_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          exception_type?: string
          features?: Json
          id?: string
          label?: string | null
          suggestion_id?: string
          suggestion_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_ml_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_ml_predictions: {
        Row: {
          created_at: string
          explanation: Json
          features_hash: string | null
          final_confidence: number | null
          id: string
          is_latest: boolean
          model_version: string
          predicted_confidence: number
          suggestion_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          explanation: Json
          features_hash?: string | null
          final_confidence?: number | null
          id?: string
          is_latest?: boolean
          model_version: string
          predicted_confidence: number
          suggestion_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          explanation?: Json
          features_hash?: string | null
          final_confidence?: number | null
          id?: string
          is_latest?: boolean
          model_version?: string
          predicted_confidence?: number
          suggestion_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_ml_predictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_suggestion_outcomes: {
        Row: {
          confidence_at_time: number
          created_at: string
          decided_at: string
          decided_by: string | null
          exception_id: string
          final_result: string
          id: string
          outcome: string
          rationale_snapshot: Json
          suggestion_id: string
          tenant_id: string
        }
        Insert: {
          confidence_at_time: number
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          exception_id: string
          final_result: string
          id?: string
          outcome: string
          rationale_snapshot?: Json
          suggestion_id: string
          tenant_id: string
        }
        Update: {
          confidence_at_time?: number
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          exception_id?: string
          final_result?: string
          id?: string
          outcome?: string
          rationale_snapshot?: Json
          suggestion_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_suggestion_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_suggestions: {
        Row: {
          bank_transaction_id: string | null
          confidence: number
          created_at: string
          currency: string
          exception_id: string
          id: string
          invoice_id: string | null
          rationale: Json
          suggested_amount: number
          suggestion_type: string
          tenant_id: string
        }
        Insert: {
          bank_transaction_id?: string | null
          confidence?: number
          created_at?: string
          currency?: string
          exception_id: string
          id?: string
          invoice_id?: string | null
          rationale?: Json
          suggested_amount: number
          suggestion_type: string
          tenant_id: string
        }
        Update: {
          bank_transaction_id?: string | null
          confidence?: number
          created_at?: string
          currency?: string
          exception_id?: string
          id?: string
          invoice_id?: string | null
          rationale?: Json
          suggested_amount?: number
          suggestion_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_suggestions_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_bank_txn_match_state"
            referencedColumns: ["bank_transaction_id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "exceptions_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_templates: {
        Row: {
          auto_post: boolean | null
          created_at: string
          created_by: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          last_run_date: string | null
          name: string
          next_run_date: string | null
          start_date: string
          template_data: Json
          template_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_post?: boolean | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          name: string
          next_run_date?: string | null
          start_date: string
          template_data?: Json
          template_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_post?: boolean | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          name?: string
          next_run_date?: string | null
          start_date?: string
          template_data?: Json
          template_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          notes: string | null
          revenue_id: string | null
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          revenue_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          revenue_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_entries_revenue_id_fkey"
            columns: ["revenue_id"]
            isOneToOne: false
            referencedRelation: "revenues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revenues: {
        Row: {
          amount: number
          contract_name: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          recurring_day: number | null
          revenue_type: Database["public"]["Enums"]["revenue_type"]
          source: Database["public"]["Enums"]["revenue_source"]
          start_date: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          contract_name: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          recurring_day?: number | null
          revenue_type?: Database["public"]["Enums"]["revenue_type"]
          source?: Database["public"]["Enums"]["revenue_source"]
          start_date?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_name?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          recurring_day?: number | null
          revenue_type?: Database["public"]["Enums"]["revenue_type"]
          source?: Database["public"]["Enums"]["revenue_source"]
          start_date?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenues_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          channel: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_responded: boolean | null
          order_id: string | null
          platform_review_id: string | null
          product_id: string | null
          rating: number | null
          responded_at: string | null
          responded_by: string | null
          response_content: string | null
          review_content: string | null
          review_date: string | null
          review_images: string[] | null
          sentiment: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_responded?: boolean | null
          order_id?: string | null
          platform_review_id?: string | null
          product_id?: string | null
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          response_content?: string | null
          review_content?: string | null
          review_date?: string | null
          review_images?: string[] | null
          sentiment?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_responded?: boolean | null
          order_id?: string | null
          platform_review_id?: string | null
          product_id?: string | null
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          response_content?: string | null
          review_content?: string | null
          review_date?: string | null
          review_images?: string[] | null
          sentiment?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_appetite_rules: {
        Row: {
          action_on_breach: string
          created_at: string
          id: string
          is_enabled: boolean
          metric_code: string
          metric_label: string
          operator: string
          risk_appetite_id: string
          risk_domain: string
          severity: string
          tenant_id: string
          threshold: number
          unit: string
          updated_at: string
        }
        Insert: {
          action_on_breach: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          metric_code: string
          metric_label: string
          operator: string
          risk_appetite_id: string
          risk_domain: string
          severity: string
          tenant_id: string
          threshold: number
          unit: string
          updated_at?: string
        }
        Update: {
          action_on_breach?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          metric_code?: string
          metric_label?: string
          operator?: string
          risk_appetite_id?: string
          risk_domain?: string
          severity?: string
          tenant_id?: string
          threshold?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_appetite_rules_risk_appetite_id_fkey"
            columns: ["risk_appetite_id"]
            isOneToOne: false
            referencedRelation: "risk_appetites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_appetite_rules_risk_appetite_id_fkey"
            columns: ["risk_appetite_id"]
            isOneToOne: false
            referencedRelation: "v_active_risk_appetite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_appetite_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_appetites: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          defined_by: string
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          name: string
          status: string
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          defined_by: string
          description?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          name?: string
          status: string
          tenant_id: string
          updated_at?: string
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          defined_by?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_appetites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_breach_events: {
        Row: {
          action_result: Json | null
          action_taken: string
          breached_at: string
          created_at: string
          id: string
          is_resolved: boolean
          metric_code: string
          metric_value: number
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_appetite_id: string
          rule_id: string
          severity: string
          tenant_id: string
          threshold: number
        }
        Insert: {
          action_result?: Json | null
          action_taken: string
          breached_at?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          metric_code: string
          metric_value: number
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_appetite_id: string
          rule_id: string
          severity: string
          tenant_id: string
          threshold: number
        }
        Update: {
          action_result?: Json | null
          action_taken?: string
          breached_at?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          metric_code?: string
          metric_value?: number
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_appetite_id?: string
          rule_id?: string
          severity?: string
          tenant_id?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_breach_events_risk_appetite_id_fkey"
            columns: ["risk_appetite_id"]
            isOneToOne: false
            referencedRelation: "risk_appetites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_breach_events_risk_appetite_id_fkey"
            columns: ["risk_appetite_id"]
            isOneToOne: false
            referencedRelation: "v_active_risk_appetite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_breach_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "risk_appetite_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_breach_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_stress_results: {
        Row: {
          created_at: string
          id: string
          period_month: string
          scenario_id: string
          stress_parameters: Json | null
          stressed_cash_settled: number | null
          stressed_open_exceptions: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_month: string
          scenario_id: string
          stress_parameters?: Json | null
          stressed_cash_settled?: number | null
          stressed_open_exceptions?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_month?: string
          scenario_id?: string
          stress_parameters?: Json | null
          stressed_cash_settled?: number | null
          stressed_open_exceptions?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_stress_results_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "board_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_stress_tests: {
        Row: {
          base_risk_appetite_id: string | null
          baseline_metrics: Json | null
          created_at: string
          created_by: string
          description: string | null
          detailed_impacts: Json | null
          id: string
          impact_summary: Json
          simulated_at: string
          simulated_metrics: Json | null
          simulated_risk_appetite: Json
          tenant_id: string
          test_name: string
        }
        Insert: {
          base_risk_appetite_id?: string | null
          baseline_metrics?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          detailed_impacts?: Json | null
          id?: string
          impact_summary: Json
          simulated_at?: string
          simulated_metrics?: Json | null
          simulated_risk_appetite: Json
          tenant_id: string
          test_name: string
        }
        Update: {
          base_risk_appetite_id?: string | null
          baseline_metrics?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          detailed_impacts?: Json | null
          id?: string
          impact_summary?: Json
          simulated_at?: string
          simulated_metrics?: Json | null
          simulated_risk_appetite?: Json
          tenant_id?: string
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_stress_tests_base_risk_appetite_id_fkey"
            columns: ["base_risk_appetite_id"]
            isOneToOne: false
            referencedRelation: "risk_appetites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_stress_tests_base_risk_appetite_id_fkey"
            columns: ["base_risk_appetite_id"]
            isOneToOne: false
            referencedRelation: "v_active_risk_appetite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_stress_tests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rolling_forecasts: {
        Row: {
          actual_amount: number | null
          category: string | null
          channel: string | null
          confidence_level: string | null
          created_at: string
          current_forecast: number
          forecast_month: string
          forecast_type: string
          id: string
          last_revised_at: string | null
          last_revised_by: string | null
          notes: string | null
          original_budget: number
          tenant_id: string
          updated_at: string
          variance_amount: number | null
          variance_percent: number | null
        }
        Insert: {
          actual_amount?: number | null
          category?: string | null
          channel?: string | null
          confidence_level?: string | null
          created_at?: string
          current_forecast?: number
          forecast_month: string
          forecast_type?: string
          id?: string
          last_revised_at?: string | null
          last_revised_by?: string | null
          notes?: string | null
          original_budget?: number
          tenant_id: string
          updated_at?: string
          variance_amount?: number | null
          variance_percent?: number | null
        }
        Update: {
          actual_amount?: number | null
          category?: string | null
          channel?: string | null
          confidence_level?: string | null
          created_at?: string
          current_forecast?: number
          forecast_month?: string
          forecast_type?: string
          id?: string
          last_revised_at?: string | null
          last_revised_by?: string | null
          notes?: string | null
          original_budget?: number
          tenant_id?: string
          updated_at?: string
          variance_amount?: number | null
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rolling_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_monthly_actuals: {
        Row: {
          actual_value: number | null
          created_at: string
          created_by: string | null
          id: string
          metric_type: string
          month: number
          notes: string | null
          tenant_id: string
          updated_at: string
          year: number
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          metric_type: string
          month: number
          notes?: string | null
          tenant_id: string
          updated_at?: string
          year: number
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          metric_type?: string
          month?: number
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenario_monthly_actuals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_monthly_plans: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metric_type: string
          month_1: number | null
          month_10: number | null
          month_11: number | null
          month_12: number | null
          month_2: number | null
          month_3: number | null
          month_4: number | null
          month_5: number | null
          month_6: number | null
          month_7: number | null
          month_8: number | null
          month_9: number | null
          scenario_id: string
          tenant_id: string
          total_target: number | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metric_type: string
          month_1?: number | null
          month_10?: number | null
          month_11?: number | null
          month_12?: number | null
          month_2?: number | null
          month_3?: number | null
          month_4?: number | null
          month_5?: number | null
          month_6?: number | null
          month_7?: number | null
          month_8?: number | null
          month_9?: number | null
          scenario_id: string
          tenant_id: string
          total_target?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metric_type?: string
          month_1?: number | null
          month_10?: number | null
          month_11?: number | null
          month_12?: number | null
          month_2?: number | null
          month_3?: number | null
          month_4?: number | null
          month_5?: number | null
          month_6?: number | null
          month_7?: number | null
          month_8?: number | null
          month_9?: number | null
          scenario_id?: string
          tenant_id?: string
          total_target?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenario_monthly_plans_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_monthly_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          base_costs: number | null
          base_revenue: number | null
          calculated_ebitda: number | null
          cost_change: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_primary: boolean | null
          name: string
          revenue_change: number | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          base_costs?: number | null
          base_revenue?: number | null
          calculated_ebitda?: number | null
          cost_change?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          revenue_change?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          base_costs?: number | null
          base_revenue?: number | null
          calculated_ebitda?: number | null
          cost_change?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          revenue_change?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_run_at: string | null
          message: string | null
          metadata: Json | null
          next_run_at: string | null
          schedule_day_of_month: number | null
          schedule_day_of_week: number | null
          schedule_time: string
          schedule_type: string
          target_users: string[] | null
          tenant_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          message?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_time: string
          schedule_type: string
          target_users?: string[] | null
          tenant_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          message?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_time?: string
          schedule_type?: string
          target_users?: string[] | null
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_allocations: {
        Row: {
          allocated_amount: number
          allocation_type: string | null
          created_at: string
          id: string
          notes: string | null
          reconciliation_link_id: string
          tenant_id: string
        }
        Insert: {
          allocated_amount: number
          allocation_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reconciliation_link_id: string
          tenant_id: string
        }
        Update: {
          allocated_amount?: number
          allocation_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reconciliation_link_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_allocations_reconciliation_link_id_fkey"
            columns: ["reconciliation_link_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          attempt_count: number | null
          carrier_code: string | null
          carrier_name: string | null
          cod_amount: number | null
          cod_collected: boolean | null
          created_at: string | null
          delivered_at: string | null
          delivery_days: number | null
          expected_delivery_date: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          in_transit_at: string | null
          is_on_time: boolean | null
          order_id: string | null
          picked_up_at: string | null
          shipping_fee: number | null
          status: string | null
          tenant_id: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          attempt_count?: number | null
          carrier_code?: string | null
          carrier_name?: string | null
          cod_amount?: number | null
          cod_collected?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_days?: number | null
          expected_delivery_date?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          in_transit_at?: string | null
          is_on_time?: boolean | null
          order_id?: string | null
          picked_up_at?: string | null
          shipping_fee?: number | null
          status?: string | null
          tenant_id: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          attempt_count?: number | null
          carrier_code?: string | null
          carrier_name?: string | null
          cod_amount?: number | null
          cod_collected?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_days?: number | null
          expected_delivery_date?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          in_transit_at?: string | null
          is_on_time?: boolean | null
          order_id?: string | null
          picked_up_at?: string | null
          shipping_fee?: number | null
          status?: string | null
          tenant_id?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_profitability_cache: {
        Row: {
          aov: number | null
          calculated_at: string
          channel: string
          cogs: number | null
          created_at: string
          fees: number | null
          id: string
          margin_percent: number | null
          period_end: string
          period_start: string
          product_name: string | null
          profit: number | null
          quantity: number | null
          revenue: number | null
          sku: string
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          aov?: number | null
          calculated_at?: string
          channel: string
          cogs?: number | null
          created_at?: string
          fees?: number | null
          id?: string
          margin_percent?: number | null
          period_end: string
          period_start: string
          product_name?: string | null
          profit?: number | null
          quantity?: number | null
          revenue?: number | null
          sku: string
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          aov?: number | null
          calculated_at?: string
          channel?: string
          cogs?: number | null
          created_at?: string
          fees?: number | null
          id?: string
          margin_percent?: number | null
          period_end?: string
          period_start?: string
          product_name?: string | null
          profit?: number | null
          quantity?: number | null
          revenue?: number | null
          sku?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_profitability_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      soc_control_attestations: {
        Row: {
          control_description: string
          control_id: string
          control_name: string
          created_at: string
          evidence_reference: string | null
          evidence_type: string
          id: string
          implementation_status: string
          last_tested_at: string | null
          notes: string | null
          tenant_id: string
          test_result: string | null
          tested_by: string | null
          updated_at: string
        }
        Insert: {
          control_description: string
          control_id: string
          control_name: string
          created_at?: string
          evidence_reference?: string | null
          evidence_type: string
          id?: string
          implementation_status: string
          last_tested_at?: string | null
          notes?: string | null
          tenant_id: string
          test_result?: string | null
          tested_by?: string | null
          updated_at?: string
        }
        Update: {
          control_description?: string
          control_id?: string
          control_name?: string
          created_at?: string
          evidence_reference?: string | null
          evidence_type?: string
          id?: string
          implementation_status?: string
          last_tested_at?: string | null
          notes?: string | null
          tenant_id?: string
          test_result?: string | null
          tested_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soc_control_attestations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      soc_controls: {
        Row: {
          category: string
          control_code: string
          control_name: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          last_validated_at: string | null
          mapped_column: string | null
          mapped_table: string
          tenant_id: string | null
          updated_at: string
          validation_query: string | null
          validation_status: string | null
        }
        Insert: {
          category?: string
          control_code: string
          control_name: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          mapped_column?: string | null
          mapped_table: string
          tenant_id?: string | null
          updated_at?: string
          validation_query?: string | null
          validation_status?: string | null
        }
        Update: {
          category?: string
          control_code?: string
          control_name?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          mapped_column?: string | null
          mapped_table?: string
          tenant_id?: string | null
          updated_at?: string
          validation_query?: string | null
          validation_status?: string | null
        }
        Relationships: []
      }
      soc_validation_logs: {
        Row: {
          control_id: string | null
          created_at: string
          evidence_hash: string | null
          id: string
          notes: string | null
          tenant_id: string
          validated_by: string
          validation_result: string
        }
        Insert: {
          control_id?: string | null
          created_at?: string
          evidence_hash?: string | null
          id?: string
          notes?: string | null
          tenant_id: string
          validated_by?: string
          validation_result: string
        }
        Update: {
          control_id?: string | null
          created_at?: string
          evidence_hash?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string
          validated_by?: string
          validation_result?: string
        }
        Relationships: [
          {
            foreignKeyName: "soc_validation_logs_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "soc_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      social_mentions: {
        Row: {
          author_handle: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          detected_at: string | null
          engagement_count: number | null
          id: string
          is_responded: boolean | null
          mention_type: string | null
          platform: string
          post_url: string | null
          priority: string | null
          reach_count: number | null
          responded_at: string | null
          response_content: string | null
          sentiment: string | null
          sentiment_score: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          author_handle?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          detected_at?: string | null
          engagement_count?: number | null
          id?: string
          is_responded?: boolean | null
          mention_type?: string | null
          platform: string
          post_url?: string | null
          priority?: string | null
          reach_count?: number | null
          responded_at?: string | null
          response_content?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          author_handle?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          detected_at?: string | null
          engagement_count?: number | null
          id?: string
          is_responded?: boolean | null
          mention_type?: string | null
          platform?: string
          post_url?: string | null
          priority?: string | null
          reach_count?: number | null
          responded_at?: string | null
          response_content?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_mentions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_daily_metrics: {
        Row: {
          avg_transaction_value: number | null
          card_revenue: number | null
          cash_revenue: number | null
          close_time: string | null
          created_at: string | null
          customer_count: number | null
          daily_target: number | null
          ewallet_revenue: number | null
          id: string
          metrics_date: string
          open_time: string | null
          staff_count: number | null
          store_id: string | null
          target_achieved_percent: number | null
          tenant_id: string
          total_revenue: number | null
          total_transactions: number | null
        }
        Insert: {
          avg_transaction_value?: number | null
          card_revenue?: number | null
          cash_revenue?: number | null
          close_time?: string | null
          created_at?: string | null
          customer_count?: number | null
          daily_target?: number | null
          ewallet_revenue?: number | null
          id?: string
          metrics_date: string
          open_time?: string | null
          staff_count?: number | null
          store_id?: string | null
          target_achieved_percent?: number | null
          tenant_id: string
          total_revenue?: number | null
          total_transactions?: number | null
        }
        Update: {
          avg_transaction_value?: number | null
          card_revenue?: number | null
          cash_revenue?: number | null
          close_time?: string | null
          created_at?: string | null
          customer_count?: number | null
          daily_target?: number | null
          ewallet_revenue?: number | null
          id?: string
          metrics_date?: string
          open_time?: string | null
          staff_count?: number | null
          store_id?: string | null
          target_achieved_percent?: number | null
          tenant_id?: string
          total_revenue?: number | null
          total_transactions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_daily_metrics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_daily_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          area_sqm: number | null
          created_at: string | null
          current_daily_sales: number | null
          daily_sales_target: number | null
          id: string
          is_active: boolean | null
          last_transaction_at: string | null
          manager_name: string | null
          phone: string | null
          rent_per_sqm: number | null
          store_code: string | null
          store_name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          area_sqm?: number | null
          created_at?: string | null
          current_daily_sales?: number | null
          daily_sales_target?: number | null
          id?: string
          is_active?: boolean | null
          last_transaction_at?: string | null
          manager_name?: string | null
          phone?: string | null
          rent_per_sqm?: number | null
          store_code?: string | null
          store_name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          area_sqm?: number | null
          created_at?: string | null
          current_daily_sales?: number | null
          daily_sales_target?: number | null
          id?: string
          is_active?: boolean | null
          last_transaction_at?: string | null
          manager_name?: string | null
          phone?: string | null
          rent_per_sqm?: number | null
          store_code?: string | null
          store_name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_initiatives: {
        Row: {
          budget: number | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          kpis: string[] | null
          milestones: Json | null
          notes: string | null
          owner: string | null
          priority: string
          progress: number | null
          spent: number | null
          start_date: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          kpis?: string[] | null
          milestones?: Json | null
          notes?: string | null
          owner?: string | null
          priority?: string
          progress?: number | null
          spent?: number | null
          start_date?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          kpis?: string[] | null
          milestones?: Json | null
          notes?: string | null
          owner?: string | null
          priority?: string
          progress?: number | null
          spent?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_initiatives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payment_schedules: {
        Row: {
          bill_id: string | null
          cash_available_on_early_date: number | null
          created_at: string
          due_date: string
          early_payment_date: string | null
          early_payment_discount_amount: number | null
          early_payment_discount_percent: number | null
          id: string
          net_amount_if_early: number | null
          net_benefit: number | null
          notes: string | null
          opportunity_cost: number | null
          original_amount: number
          paid_amount: number | null
          paid_date: string | null
          payment_status: string | null
          recommended_action: string | null
          tenant_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          bill_id?: string | null
          cash_available_on_early_date?: number | null
          created_at?: string
          due_date: string
          early_payment_date?: string | null
          early_payment_discount_amount?: number | null
          early_payment_discount_percent?: number | null
          id?: string
          net_amount_if_early?: number | null
          net_benefit?: number | null
          notes?: string | null
          opportunity_cost?: number | null
          original_amount: number
          paid_amount?: number | null
          paid_date?: string | null
          payment_status?: string | null
          recommended_action?: string | null
          tenant_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          bill_id?: string | null
          cash_available_on_early_date?: number | null
          created_at?: string
          due_date?: string
          early_payment_date?: string | null
          early_payment_discount_amount?: number | null
          early_payment_discount_percent?: number | null
          id?: string
          net_amount_if_early?: number | null
          net_benefit?: number | null
          notes?: string | null
          opportunity_cost?: number | null
          original_amount?: number
          paid_amount?: number | null
          paid_date?: string | null
          payment_status?: string | null
          recommended_action?: string | null
          tenant_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_schedules_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "supplier_payment_schedules_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_schedules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          channel: string | null
          closed_at: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          first_response_at: string | null
          id: string
          order_id: string | null
          priority: string | null
          resolution_time_minutes: number | null
          resolved_at: string | null
          response_time_minutes: number | null
          status: string | null
          subject: string | null
          tenant_id: string
          ticket_number: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          channel?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          first_response_at?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          response_time_minutes?: number | null
          status?: string | null
          subject?: string | null
          tenant_id: string
          ticket_number?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          channel?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          first_response_at?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          response_time_minutes?: number | null
          status?: string | null
          subject?: string | null
          tenant_id?: string
          ticket_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          integration_id: string
          records_created: number | null
          records_failed: number | null
          records_fetched: number | null
          records_updated: number | null
          request_params: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"] | null
          sync_mode: string | null
          sync_type: string
          tenant_id: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id: string
          records_created?: number | null
          records_failed?: number | null
          records_fetched?: number | null
          records_updated?: number | null
          request_params?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_mode?: string | null
          sync_type: string
          tenant_id: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id?: string
          records_created?: number | null
          records_failed?: number | null
          records_fetched?: number | null
          records_updated?: number | null
          request_params?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_mode?: string | null
          sync_type?: string
          tenant_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "connector_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string
          progress: number | null
          resolution_notes: string | null
          source_alert_type: string | null
          source_id: string | null
          source_type: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          progress?: number | null
          resolution_notes?: string | null
          source_alert_type?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          progress?: number | null
          resolution_notes?: string | null
          source_alert_type?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_codes: {
        Row: {
          code: string
          created_at: string
          gl_account_id: string | null
          id: string
          is_active: boolean
          name: string
          rate: number
          tax_type: string
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          tax_type?: string
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          tax_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_codes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_codes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "tax_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_filings: {
        Row: {
          created_at: string
          created_by: string | null
          document_url: string | null
          filing_number: string | null
          id: string
          name: string
          notes: string | null
          status: string
          submitted_date: string | null
          tax_obligation_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          filing_number?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          submitted_date?: string | null
          tax_obligation_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          filing_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          submitted_date?: string | null
          tax_obligation_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_filings_tax_obligation_id_fkey"
            columns: ["tax_obligation_id"]
            isOneToOne: false
            referencedRelation: "tax_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_filings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_obligations: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          name: string
          notes: string | null
          paid_amount: number
          period: string
          progress: number
          status: string
          tax_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          id?: string
          name: string
          notes?: string | null
          paid_amount?: number
          period: string
          progress?: number
          status?: string
          tax_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          notes?: string | null
          paid_amount?: number
          period?: string
          progress?: number
          status?: string
          tax_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_obligations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string
          email: string
          id: string
          join_date: string
          location: string | null
          name: string
          performance: number | null
          phone: string | null
          role: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department: string
          email: string
          id?: string
          join_date?: string
          location?: string | null
          name: string
          performance?: number | null
          phone?: string | null
          role: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string
          email?: string
          id?: string
          join_date?: string
          location?: string | null
          name?: string
          performance?: number | null
          phone?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ml_settings: {
        Row: {
          created_at: string
          enabled_at: string | null
          enabled_by: string | null
          last_fallback_at: string | null
          last_fallback_reason: string | null
          min_confidence_threshold: number
          ml_enabled: boolean
          ml_model_version: string
          ml_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          last_fallback_at?: string | null
          last_fallback_reason?: string | null
          min_confidence_threshold?: number
          ml_enabled?: boolean
          ml_model_version?: string
          ml_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          last_fallback_at?: string | null
          last_fallback_reason?: string | null
          min_confidence_threshold?: number
          ml_enabled?: boolean
          ml_model_version?: string
          ml_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ml_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          plan: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          plan?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          plan?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variance_analysis: {
        Row: {
          action_taken: string | null
          actual_amount: number
          analysis_period: string
          budget_amount: number
          category: string
          channel: string | null
          created_at: string
          id: string
          is_significant: boolean | null
          period_type: string
          prior_period_amount: number | null
          prior_year_amount: number | null
          requires_action: boolean | null
          subcategory: string | null
          tenant_id: string
          updated_at: string
          variance_drivers: Json | null
          variance_pct_budget: number | null
          variance_to_budget: number | null
          variance_to_prior: number | null
          yoy_variance: number | null
          yoy_variance_pct: number | null
        }
        Insert: {
          action_taken?: string | null
          actual_amount?: number
          analysis_period: string
          budget_amount?: number
          category: string
          channel?: string | null
          created_at?: string
          id?: string
          is_significant?: boolean | null
          period_type?: string
          prior_period_amount?: number | null
          prior_year_amount?: number | null
          requires_action?: boolean | null
          subcategory?: string | null
          tenant_id: string
          updated_at?: string
          variance_drivers?: Json | null
          variance_pct_budget?: number | null
          variance_to_budget?: number | null
          variance_to_prior?: number | null
          yoy_variance?: number | null
          yoy_variance_pct?: number | null
        }
        Update: {
          action_taken?: string | null
          actual_amount?: number
          analysis_period?: string
          budget_amount?: number
          category?: string
          channel?: string | null
          created_at?: string
          id?: string
          is_significant?: boolean | null
          period_type?: string
          prior_period_amount?: number | null
          prior_year_amount?: number | null
          requires_action?: boolean | null
          subcategory?: string | null
          tenant_id?: string
          updated_at?: string
          variance_drivers?: Json | null
          variance_pct_budget?: number | null
          variance_to_budget?: number | null
          variance_to_prior?: number | null
          yoy_variance?: number | null
          yoy_variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "variance_analysis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          bill_id: string | null
          created_at: string
          created_by: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_number: string
          reference_code: string | null
          tenant_id: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bill_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number: string
          reference_code?: string | null
          tenant_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bill_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number?: string
          reference_code?: string | null
          tenant_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "cash_position"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "vendor_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "vendor_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          code: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          email: string | null
          gl_payable_account_id: string | null
          id: string
          name: string
          notes: string | null
          payment_term_id: string | null
          payment_terms: number | null
          phone: string | null
          status: string | null
          tax_code: string | null
          tenant_id: string | null
          updated_at: string
          vendor_type: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          email?: string | null
          gl_payable_account_id?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_term_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          status?: string | null
          tax_code?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor_type?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          email?: string | null
          gl_payable_account_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_term_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          status?: string | null
          tax_code?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_gl_payable_account_id_fkey"
            columns: ["gl_payable_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_gl_payable_account_id_fkey"
            columns: ["gl_payable_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "vendors_payment_term_id_fkey"
            columns: ["payment_term_id"]
            isOneToOne: false
            referencedRelation: "payment_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          locked_until: string | null
          tenant_id: string
          thresholds: Json
          updated_at: string
          vertical: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          locked_until?: string | null
          tenant_id: string
          thresholds?: Json
          updated_at?: string
          vertical: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          locked_until?: string | null
          tenant_id?: string
          thresholds?: Json
          updated_at?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_usage: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          customer_id: string | null
          discount_amount: number | null
          discount_type: string | null
          id: string
          order_id: string | null
          tenant_id: string
          used_at: string | null
          voucher_code: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          order_id?: string | null
          tenant_id: string
          used_at?: string | null
          voucher_code: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          order_id?: string | null
          tenant_id?: string
          used_at?: string | null
          voucher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_usage_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_capacity: {
        Row: {
          address: string | null
          created_at: string | null
          current_staff_count: number | null
          current_utilization: number | null
          id: string
          is_active: boolean | null
          max_orders_per_day: number | null
          max_orders_per_hour: number | null
          max_storage_units: number | null
          tenant_id: string
          updated_at: string | null
          warehouse_code: string
          warehouse_name: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          current_staff_count?: number | null
          current_utilization?: number | null
          id?: string
          is_active?: boolean | null
          max_orders_per_day?: number | null
          max_orders_per_hour?: number | null
          max_storage_units?: number | null
          tenant_id: string
          updated_at?: string | null
          warehouse_code: string
          warehouse_name?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          current_staff_count?: number | null
          current_utilization?: number | null
          id?: string
          is_active?: boolean | null
          max_orders_per_day?: number | null
          max_orders_per_hour?: number | null
          max_storage_units?: number | null
          tenant_id?: string
          updated_at?: string | null
          warehouse_code?: string
          warehouse_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_capacity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_operations: {
        Row: {
          avg_pack_time_minutes: number | null
          avg_pick_time_minutes: number | null
          backlog_orders: number | null
          capacity_used_percent: number | null
          created_at: string | null
          id: string
          operation_date: string
          orders_packed: number | null
          orders_per_staff: number | null
          orders_picked: number | null
          orders_shipped: number | null
          pack_accuracy_rate: number | null
          pick_accuracy_rate: number | null
          staff_count: number | null
          tenant_id: string
          total_orders_received: number | null
          updated_at: string | null
          warehouse_location: string | null
        }
        Insert: {
          avg_pack_time_minutes?: number | null
          avg_pick_time_minutes?: number | null
          backlog_orders?: number | null
          capacity_used_percent?: number | null
          created_at?: string | null
          id?: string
          operation_date: string
          orders_packed?: number | null
          orders_per_staff?: number | null
          orders_picked?: number | null
          orders_shipped?: number | null
          pack_accuracy_rate?: number | null
          pick_accuracy_rate?: number | null
          staff_count?: number | null
          tenant_id: string
          total_orders_received?: number | null
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Update: {
          avg_pack_time_minutes?: number | null
          avg_pick_time_minutes?: number | null
          backlog_orders?: number | null
          capacity_used_percent?: number | null
          created_at?: string | null
          id?: string
          operation_date?: string
          orders_packed?: number | null
          orders_per_staff?: number | null
          orders_picked?: number | null
          orders_shipped?: number | null
          pack_accuracy_rate?: number | null
          pick_accuracy_rate?: number | null
          staff_count?: number | null
          tenant_id?: string
          total_orders_received?: number | null
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_operations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      website_analytics: {
        Row: {
          analytics_date: string
          avg_load_time_ms: number | null
          avg_session_duration_seconds: number | null
          bounce_rate: number | null
          cart_abandonment_rate: number | null
          cart_adds: number | null
          checkout_errors_count: number | null
          checkouts_completed: number | null
          checkouts_started: number | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          page_views: number | null
          pages_per_session: number | null
          payment_errors_count: number | null
          revenue: number | null
          sessions: number | null
          tenant_id: string
          transactions: number | null
          unique_visitors: number | null
          updated_at: string | null
        }
        Insert: {
          analytics_date: string
          avg_load_time_ms?: number | null
          avg_session_duration_seconds?: number | null
          bounce_rate?: number | null
          cart_abandonment_rate?: number | null
          cart_adds?: number | null
          checkout_errors_count?: number | null
          checkouts_completed?: number | null
          checkouts_started?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          page_views?: number | null
          pages_per_session?: number | null
          payment_errors_count?: number | null
          revenue?: number | null
          sessions?: number | null
          tenant_id: string
          transactions?: number | null
          unique_visitors?: number | null
          updated_at?: string | null
        }
        Update: {
          analytics_date?: string
          avg_load_time_ms?: number | null
          avg_session_duration_seconds?: number | null
          bounce_rate?: number | null
          cart_abandonment_rate?: number | null
          cart_adds?: number | null
          checkout_errors_count?: number | null
          checkouts_completed?: number | null
          checkouts_started?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          page_views?: number | null
          pages_per_session?: number | null
          payment_errors_count?: number | null
          revenue?: number | null
          sessions?: number | null
          tenant_id?: string
          transactions?: number | null
          unique_visitors?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      what_if_scenarios: {
        Row: {
          control_mode: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_favorite: boolean | null
          monthly_trend_data: Json | null
          name: string
          params: Json
          results: Json
          retail_params: Json | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          control_mode?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          monthly_trend_data?: Json | null
          name: string
          params?: Json
          results?: Json
          retail_params?: Json | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          control_mode?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          monthly_trend_data?: Json | null
          name?: string
          params?: Json
          results?: Json
          retail_params?: Json | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "what_if_scenarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatif_metrics_cache: {
        Row: {
          avg_order_value: number
          calculated_at: string
          channel_metrics: Json
          created_at: string
          data_end_date: string | null
          data_start_date: string | null
          id: string
          marketing_cost: number
          monthly_growth_rate: number
          order_count: number
          overhead_cost: number
          return_rate: number
          tenant_id: string
          total_cogs: number
          total_fees: number
          total_orders: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          avg_order_value?: number
          calculated_at?: string
          channel_metrics?: Json
          created_at?: string
          data_end_date?: string | null
          data_start_date?: string | null
          id?: string
          marketing_cost?: number
          monthly_growth_rate?: number
          order_count?: number
          overhead_cost?: number
          return_rate?: number
          tenant_id: string
          total_cogs?: number
          total_fees?: number
          total_orders?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          avg_order_value?: number
          calculated_at?: string
          channel_metrics?: Json
          created_at?: string
          data_end_date?: string | null
          data_start_date?: string | null
          id?: string
          marketing_cost?: number
          monthly_growth_rate?: number
          order_count?: number
          overhead_cost?: number
          return_rate?: number
          tenant_id?: string
          total_cogs?: number
          total_fees?: number
          total_orders?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatif_metrics_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      working_capital_daily: {
        Row: {
          ap_turnover: number | null
          ar_turnover: number | null
          cash_balance: number | null
          ccc: number | null
          created_at: string
          day: string
          dio: number | null
          dpo: number | null
          dso: number | null
          id: string
          inventory: number | null
          inventory_turnover: number | null
          net_working_capital: number | null
          overdue_ap: number | null
          overdue_ar: number | null
          tenant_id: string
          total_ap: number | null
          total_ar: number | null
          updated_at: string
        }
        Insert: {
          ap_turnover?: number | null
          ar_turnover?: number | null
          cash_balance?: number | null
          ccc?: number | null
          created_at?: string
          day: string
          dio?: number | null
          dpo?: number | null
          dso?: number | null
          id?: string
          inventory?: number | null
          inventory_turnover?: number | null
          net_working_capital?: number | null
          overdue_ap?: number | null
          overdue_ar?: number | null
          tenant_id: string
          total_ap?: number | null
          total_ar?: number | null
          updated_at?: string
        }
        Update: {
          ap_turnover?: number | null
          ar_turnover?: number | null
          cash_balance?: number | null
          ccc?: number | null
          created_at?: string
          day?: string
          dio?: number | null
          dpo?: number | null
          dso?: number | null
          id?: string
          inventory?: number | null
          inventory_turnover?: number | null
          net_working_capital?: number | null
          overdue_ap?: number | null
          overdue_ar?: number | null
          tenant_id?: string
          total_ap?: number | null
          total_ar?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_capital_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      working_capital_metrics: {
        Row: {
          accounts_payable: number | null
          accounts_receivable: number | null
          ap_turnover: number | null
          ar_turnover: number | null
          ccc_days: number | null
          created_at: string
          current_assets: number | null
          current_liabilities: number | null
          dio_days: number | null
          dpo_days: number | null
          dso_days: number | null
          id: string
          inventory_turnover: number | null
          inventory_value: number | null
          metric_date: string
          net_working_capital: number | null
          potential_cash_release: number | null
          target_dio: number | null
          target_dpo: number | null
          target_dso: number | null
          tenant_id: string
        }
        Insert: {
          accounts_payable?: number | null
          accounts_receivable?: number | null
          ap_turnover?: number | null
          ar_turnover?: number | null
          ccc_days?: number | null
          created_at?: string
          current_assets?: number | null
          current_liabilities?: number | null
          dio_days?: number | null
          dpo_days?: number | null
          dso_days?: number | null
          id?: string
          inventory_turnover?: number | null
          inventory_value?: number | null
          metric_date: string
          net_working_capital?: number | null
          potential_cash_release?: number | null
          target_dio?: number | null
          target_dpo?: number | null
          target_dso?: number | null
          tenant_id: string
        }
        Update: {
          accounts_payable?: number | null
          accounts_receivable?: number | null
          ap_turnover?: number | null
          ar_turnover?: number | null
          ccc_days?: number | null
          created_at?: string
          current_assets?: number | null
          current_liabilities?: number | null
          dio_days?: number | null
          dpo_days?: number | null
          dso_days?: number | null
          id?: string
          inventory_turnover?: number | null
          inventory_value?: number | null
          metric_date?: string
          net_working_capital?: number | null
          potential_cash_release?: number | null
          target_dio?: number | null
          target_dpo?: number | null
          target_dso?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_capital_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ap_aging: {
        Row: {
          aging_bucket: string | null
          balance_due: number | null
          bill_date: string | null
          bill_id: string | null
          bill_number: string | null
          days_overdue: number | null
          due_date: string | null
          paid_amount: number | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          aging_bucket?: never
          balance_due?: never
          bill_date?: string | null
          bill_id?: string | null
          bill_number?: string | null
          days_overdue?: never
          due_date?: string | null
          paid_amount?: never
          status?: string | null
          tenant_id?: string | null
          total_amount?: number | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          aging_bucket?: never
          balance_due?: never
          bill_date?: string | null
          bill_id?: string | null
          bill_number?: string | null
          days_overdue?: never
          due_date?: string | null
          paid_amount?: never
          status?: string | null
          tenant_id?: string | null
          total_amount?: number | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_aging: {
        Row: {
          aging_bucket: string | null
          balance_due: number | null
          customer_id: string | null
          customer_name: string | null
          days_overdue: number | null
          due_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          issue_date: string | null
          paid_amount: number | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_sheet_summary: {
        Row: {
          account_type: string | null
          tenant_id: string | null
          total_balance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_position: {
        Row: {
          account_number: string | null
          ap_outstanding: number | null
          ar_outstanding: number | null
          bank_account_id: string | null
          bank_name: string | null
          currency: string | null
          current_balance: number | null
          last_sync_at: string | null
          tenant_id: string | null
        }
        Insert: {
          account_number?: string | null
          ap_outstanding?: never
          ar_outstanding?: never
          bank_account_id?: string | null
          bank_name?: string | null
          currency?: string | null
          current_balance?: number | null
          last_sync_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_number?: string | null
          ap_outstanding?: never
          ar_outstanding?: never
          bank_account_id?: string | null
          bank_name?: string | null
          currency?: string | null
          current_balance?: number | null
          last_sync_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_performance_summary: {
        Row: {
          avg_order_value: number | null
          cancelled_orders: number | null
          connector_name: string | null
          connector_type: Database["public"]["Enums"]["connector_type"] | null
          gross_profit: number | null
          gross_revenue: number | null
          net_revenue: number | null
          returned_orders: number | null
          shop_name: string | null
          tenant_id: string | null
          total_cogs: number | null
          total_fees: number | null
          total_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "connector_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes_view: {
        Row: {
          applied_amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          direction: string | null
          discount_amount: number | null
          due_date: string | null
          exchange_rate: number | null
          gl_account_id: string | null
          id: string | null
          metadata: Json | null
          note_date: string | null
          note_number: string | null
          note_type: string | null
          notes: string | null
          original_bill_id: string | null
          original_invoice_id: string | null
          original_order_id: string | null
          party_address: string | null
          party_email: string | null
          party_id: string | null
          party_name: string | null
          party_tax_code: string | null
          reason: string | null
          reference_number: string | null
          remaining_amount: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string | null
          terms: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          applied_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          direction?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          gl_account_id?: string | null
          id?: string | null
          metadata?: Json | null
          note_date?: string | null
          note_number?: string | null
          note_type?: string | null
          notes?: string | null
          original_bill_id?: string | null
          original_invoice_id?: string | null
          original_order_id?: string | null
          party_address?: string | null
          party_email?: string | null
          party_id?: string | null
          party_name?: string | null
          party_tax_code?: string | null
          reason?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          applied_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          direction?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          gl_account_id?: string | null
          id?: string | null
          metadata?: Json | null
          note_date?: string | null
          note_number?: string | null
          note_type?: string | null
          notes?: string | null
          original_bill_id?: string | null
          original_invoice_id?: string | null
          original_order_id?: string | null
          party_address?: string | null
          party_email?: string | null
          party_id?: string | null
          party_name?: string | null
          party_tax_code?: string | null
          reason?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_notes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_channel_revenue: {
        Row: {
          channel: string | null
          gross_revenue: number | null
          net_revenue: number | null
          order_count: number | null
          order_date: string | null
          platform_fees: number | null
          profit: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_notes_view: {
        Row: {
          applied_amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          direction: string | null
          discount_amount: number | null
          due_date: string | null
          exchange_rate: number | null
          gl_account_id: string | null
          id: string | null
          metadata: Json | null
          note_date: string | null
          note_number: string | null
          note_type: string | null
          notes: string | null
          original_bill_id: string | null
          original_invoice_id: string | null
          original_order_id: string | null
          party_address: string | null
          party_email: string | null
          party_id: string | null
          party_name: string | null
          party_tax_code: string | null
          reason: string | null
          reference_number: string | null
          remaining_amount: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string | null
          terms: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          applied_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          direction?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          gl_account_id?: string | null
          id?: string | null
          metadata?: Json | null
          note_date?: string | null
          note_number?: string | null
          note_type?: string | null
          notes?: string | null
          original_bill_id?: string | null
          original_invoice_id?: string | null
          original_order_id?: string | null
          party_address?: string | null
          party_email?: string | null
          party_id?: string | null
          party_name?: string | null
          party_tax_code?: string | null
          reason?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          applied_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          direction?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          gl_account_id?: string | null
          id?: string | null
          metadata?: Json | null
          note_date?: string | null
          note_number?: string | null
          note_type?: string | null
          notes?: string | null
          original_bill_id?: string | null
          original_invoice_id?: string | null
          original_order_id?: string | null
          party_address?: string | null
          party_email?: string | null
          party_id?: string | null
          party_name?: string | null
          party_tax_code?: string | null
          reason?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_notes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions_pending_followup: {
        Row: {
          card_type: string | null
          decided_at: string | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          expected_impact_amount: number | null
          expected_outcome: string | null
          follow_up_date: string | null
          follow_up_status: string | null
          id: string | null
          original_impact: number | null
          outcome_count: number | null
          selected_action_label: string | null
          selected_action_type: string | null
          tenant_id: string | null
          urgency: string | null
        }
        Insert: {
          card_type?: string | null
          decided_at?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          expected_impact_amount?: number | null
          expected_outcome?: string | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          id?: string | null
          original_impact?: number | null
          outcome_count?: never
          selected_action_label?: string | null
          selected_action_type?: string | null
          tenant_id?: string | null
          urgency?: never
        }
        Update: {
          card_type?: string | null
          decided_at?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          expected_impact_amount?: number | null
          expected_outcome?: string | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          id?: string | null
          original_impact?: number | null
          outcome_count?: never
          selected_action_label?: string | null
          selected_action_type?: string | null
          tenant_id?: string | null
          urgency?: never
        }
        Relationships: [
          {
            foreignKeyName: "decision_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fdp_channel_summary: {
        Row: {
          avg_order_value: number | null
          channel: string | null
          contribution_margin: number | null
          order_count: number | null
          tenant_id: string | null
          total_cogs: number | null
          total_commission_fee: number | null
          total_payment_fee: number | null
          total_platform_fee: number | null
          total_revenue: number | null
          total_shipping_fee: number | null
          unique_customers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fdp_daily_metrics: {
        Row: {
          channel: string | null
          contribution_margin: number | null
          metric_date: string | null
          order_count: number | null
          tenant_id: string | null
          total_cogs: number | null
          total_commission_fee: number | null
          total_payment_fee: number | null
          total_platform_fee: number | null
          total_revenue: number | null
          total_shipping_fee: number | null
          unique_customers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fdp_expense_summary: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"] | null
          expense_month: string | null
          tenant_id: string | null
          total_amount: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fdp_invoice_summary: {
        Row: {
          invoice_count: number | null
          invoice_month: string | null
          outstanding_amount: number | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fdp_monthly_metrics: {
        Row: {
          channel: string | null
          contribution_margin: number | null
          metric_month: string | null
          order_count: number | null
          tenant_id: string | null
          total_cogs: number | null
          total_commission_fee: number | null
          total_payment_fee: number | null
          total_platform_fee: number | null
          total_revenue: number | null
          total_shipping_fee: number | null
          unique_customers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fdp_sku_summary: {
        Row: {
          gross_profit: number | null
          margin_percent: number | null
          order_count: number | null
          product_name: string | null
          sku: string | null
          tenant_id: string | null
          total_cogs: number | null
          total_quantity: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_audit_approval_evidence: {
        Row: {
          action: string | null
          approval_request_id: string | null
          current_approvals: number | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_comment: string | null
          decision_id: string | null
          policy_id: string | null
          requested_at: string | null
          requested_by: string | null
          required_approvals: number | null
          resolved_at: string | null
          resource_data: Json | null
          resource_id: string | null
          resource_type: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "enterprise_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_board_summary: {
        Row: {
          allocations_count: number | null
          auto_actions: number | null
          bank_txns_used: number | null
          cash_settled: number | null
          invoices_settled: number | null
          open_exceptions: number | null
          period_end: string | null
          period_start: string | null
          tenant_id: string | null
          total_exceptions: number | null
        }
        Relationships: []
      }
      pl_summary: {
        Row: {
          account_type: string | null
          tenant_id: string | null
          total_expense: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_balance: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: string | null
          credit_balance: number | null
          current_balance: number | null
          debit_balance: number | null
          normal_balance: string | null
          tenant_id: string | null
        }
        Insert: {
          account_code?: string | null
          account_id?: string | null
          account_name?: string | null
          account_type?: string | null
          credit_balance?: never
          current_balance?: number | null
          debit_balance?: never
          normal_balance?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_code?: string | null
          account_id?: string | null
          account_name?: string | null
          account_type?: string | null
          credit_balance?: never
          current_balance?: number | null
          debit_balance?: never
          normal_balance?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_decision_history: {
        Row: {
          action_label: string | null
          action_type: string | null
          card_identifier: string | null
          card_source: string | null
          card_type: string | null
          comment: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision_status: string | null
          dismiss_reason: string | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string | null
          impact_amount: number | null
          impact_currency: string | null
          outcome_notes: string | null
          outcome_value: number | null
          snoozed_until: string | null
          tenant_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_type?: string | null
          card_identifier?: never
          card_source?: never
          card_type?: string | null
          comment?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_status?: string | null
          dismiss_reason?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string | null
          impact_amount?: number | null
          impact_currency?: string | null
          outcome_notes?: string | null
          outcome_value?: number | null
          snoozed_until?: string | null
          tenant_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_type?: string | null
          card_identifier?: never
          card_source?: never
          card_type?: string | null
          comment?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_status?: string | null
          dismiss_reason?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string | null
          impact_amount?: number | null
          impact_currency?: string | null
          outcome_notes?: string | null
          outcome_value?: number | null
          snoozed_until?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_alerts_hierarchy: {
        Row: {
          acceleration: number | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_url: string | null
          alert_class: string | null
          breach_threshold: number | null
          child_count: number | null
          confidence_factors: Json | null
          confidence_level: string | null
          confidence_score: number | null
          created_at: string | null
          current_value: number | null
          days_to_breach: number | null
          decision_framing: Json | null
          dimension_key: string | null
          display_status: string | null
          estimated_breach_date: string | null
          expires_at: string | null
          exposure_amount: number | null
          exposure_currency: string | null
          hierarchy_category: string | null
          hierarchy_level: number | null
          id: string | null
          impact_description: string | null
          is_parent: boolean | null
          message: string | null
          metadata: Json | null
          metric_code: string | null
          parent_alert_id: string | null
          priority: number | null
          r_squared: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause_explanation: string | null
          root_cause_metric: string | null
          rule_id: string | null
          severity: string | null
          slope: number | null
          status: string | null
          suggested_action: string | null
          suppressed_children: Json | null
          tenant_id: string | null
          title: string | null
          trajectory: Json | null
          updated_at: string | null
        }
        Insert: {
          acceleration?: number | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_url?: string | null
          alert_class?: string | null
          breach_threshold?: number | null
          child_count?: number | null
          confidence_factors?: Json | null
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_value?: number | null
          days_to_breach?: number | null
          decision_framing?: Json | null
          dimension_key?: string | null
          display_status?: never
          estimated_breach_date?: string | null
          expires_at?: string | null
          exposure_amount?: number | null
          exposure_currency?: string | null
          hierarchy_category?: never
          hierarchy_level?: number | null
          id?: string | null
          impact_description?: string | null
          is_parent?: boolean | null
          message?: string | null
          metadata?: Json | null
          metric_code?: string | null
          parent_alert_id?: string | null
          priority?: number | null
          r_squared?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause_explanation?: string | null
          root_cause_metric?: string | null
          rule_id?: string | null
          severity?: string | null
          slope?: number | null
          status?: string | null
          suggested_action?: string | null
          suppressed_children?: Json | null
          tenant_id?: string | null
          title?: string | null
          trajectory?: Json | null
          updated_at?: string | null
        }
        Update: {
          acceleration?: number | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_url?: string | null
          alert_class?: string | null
          breach_threshold?: number | null
          child_count?: number | null
          confidence_factors?: Json | null
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_value?: number | null
          days_to_breach?: number | null
          decision_framing?: Json | null
          dimension_key?: string | null
          display_status?: never
          estimated_breach_date?: string | null
          expires_at?: string | null
          exposure_amount?: number | null
          exposure_currency?: string | null
          hierarchy_category?: never
          hierarchy_level?: number | null
          id?: string | null
          impact_description?: string | null
          is_parent?: boolean | null
          message?: string | null
          metadata?: Json | null
          metric_code?: string | null
          parent_alert_id?: string | null
          priority?: number | null
          r_squared?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause_explanation?: string | null
          root_cause_metric?: string | null
          rule_id?: string | null
          severity?: string | null
          slope?: number | null
          status?: string | null
          suggested_action?: string | null
          suppressed_children?: Json | null
          tenant_id?: string | null
          title?: string | null
          trajectory?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "early_warning_alerts_parent_alert_id_fkey"
            columns: ["parent_alert_id"]
            isOneToOne: false
            referencedRelation: "early_warning_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_warning_alerts_parent_alert_id_fkey"
            columns: ["parent_alert_id"]
            isOneToOne: false
            referencedRelation: "v_active_alerts_hierarchy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_warning_alerts_parent_alert_id_fkey"
            columns: ["parent_alert_id"]
            isOneToOne: false
            referencedRelation: "v_alerts_pending_escalation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_warning_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "predictive_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_warning_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_risk_appetite: {
        Row: {
          active_breaches: number | null
          approved_at: string | null
          approved_by: string | null
          defined_by: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string | null
          name: string | null
          rule_count: number | null
          tenant_id: string | null
          version: number | null
        }
        Insert: {
          active_breaches?: never
          approved_at?: string | null
          approved_by?: string | null
          defined_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string | null
          name?: string | null
          rule_count?: never
          tenant_id?: string | null
          version?: number | null
        }
        Update: {
          active_breaches?: never
          approved_at?: string | null
          approved_by?: string | null
          defined_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string | null
          name?: string | null
          rule_count?: never
          tenant_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_appetites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ai_advisor_active: {
        Row: {
          action_target: string | null
          action_verb: string | null
          actioned_at: string | null
          alert_id: string | null
          based_on_pattern_id: string | null
          based_on_samples: number | null
          confidence_score: number | null
          created_at: string | null
          decision_type: string | null
          display_text: string | null
          id: string | null
          is_silent: boolean | null
          metric_code: string | null
          outcome_measured: boolean | null
          recommendation: string | null
          surfaced_at: string | null
          tenant_id: string | null
        }
        Insert: {
          action_target?: string | null
          action_verb?: string | null
          actioned_at?: string | null
          alert_id?: string | null
          based_on_pattern_id?: string | null
          based_on_samples?: number | null
          confidence_score?: number | null
          created_at?: string | null
          decision_type?: string | null
          display_text?: never
          id?: string | null
          is_silent?: boolean | null
          metric_code?: string | null
          outcome_measured?: boolean | null
          recommendation?: string | null
          surfaced_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          action_target?: string | null
          action_verb?: string | null
          actioned_at?: string | null
          alert_id?: string | null
          based_on_pattern_id?: string | null
          based_on_samples?: number | null
          confidence_score?: number | null
          created_at?: string | null
          decision_type?: string | null
          display_text?: never
          id?: string | null
          is_silent?: boolean | null
          metric_code?: string | null
          outcome_measured?: boolean | null
          recommendation?: string | null
          surfaced_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_advisor_responses_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "early_warning_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_responses_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "v_active_alerts_hierarchy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_responses_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "v_alerts_pending_escalation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_responses_based_on_pattern_id_fkey"
            columns: ["based_on_pattern_id"]
            isOneToOne: false
            referencedRelation: "decision_learning_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_alerts_pending_escalation: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          current_owner_role: string | null
          escalates_to: string | null
          exposure_amount: number | null
          hierarchy_level: number | null
          hours_since_created: number | null
          hours_since_last_action: number | null
          hours_until_escalation: number | null
          id: string | null
          no_decision_threshold_hours: number | null
          tenant_id: string | null
          title: string | null
          unacknowledged_threshold_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "early_warning_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_auto_reconcile_evidence: {
        Row: {
          action: string | null
          actor_service_id: string | null
          actor_type: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          tenant_id: string | null
        }
        Insert: {
          action?: string | null
          actor_service_id?: string | null
          actor_type?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string | null
          actor_service_id?: string | null
          actor_type?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_risk_breaches: {
        Row: {
          action_taken: string | null
          detected_at: string | null
          is_resolved: boolean | null
          metric_code: string | null
          metric_value: number | null
          severity: string | null
          tenant_id: string | null
          threshold: number | null
        }
        Insert: {
          action_taken?: string | null
          detected_at?: string | null
          is_resolved?: boolean | null
          metric_code?: string | null
          metric_value?: number | null
          severity?: string | null
          tenant_id?: string | null
          threshold?: number | null
        }
        Update: {
          action_taken?: string | null
          detected_at?: string | null
          is_resolved?: boolean | null
          metric_code?: string | null
          metric_value?: number | null
          severity?: string | null
          tenant_id?: string | null
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_breach_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_summary: {
        Row: {
          action: string | null
          actor_type: string | null
          audit_date: string | null
          event_count: number | null
          resource_type: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bank_txn_match_state: {
        Row: {
          bank_amount: number | null
          bank_transaction_id: string | null
          description: string | null
          link_count: number | null
          match_state: string | null
          matched_amount: number | null
          reference: string | null
          tenant_id: string | null
          transaction_date: string | null
          txn_abs_amount: number | null
          unmatched_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_decision_latest: {
        Row: {
          as_of: string | null
          authority: string | null
          calculation_hash: string | null
          confidence: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          derived_from: Json | null
          dimensions: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          metric_code: string | null
          metric_version: number | null
          supersedes_id: string | null
          tenant_id: string | null
          truth_level: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_snapshots_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "decision_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_snapshots_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "v_decision_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      v_invoice_settled_paid: {
        Row: {
          invoice_id: string | null
          paid_amount_settled: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_invoice_settled_status: {
        Row: {
          invoice_id: string | null
          invoice_number: string | null
          remaining_amount: number | null
          settled_paid_amount: number | null
          settled_status: string | null
          tenant_id: string | null
          total_amount: number | null
          truth_level: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_latest_central_metrics: {
        Row: {
          ar_aging_30d: number | null
          ar_aging_60d: number | null
          ar_aging_90d: number | null
          ar_aging_current: number | null
          avg_order_value: number | null
          cac: number | null
          cash_7d_forecast: number | null
          cash_runway_months: number | null
          cash_today: number | null
          ccc: number | null
          computation_duration_ms: number | null
          computed_by: string | null
          contribution_margin: number | null
          contribution_margin_percent: number | null
          created_at: string | null
          dio: number | null
          dpo: number | null
          dso: number | null
          ebitda: number | null
          ebitda_margin_percent: number | null
          gross_margin_percent: number | null
          gross_profit: number | null
          id: string | null
          ltv: number | null
          ltv_cac_ratio: number | null
          marketing_roas: number | null
          net_revenue: number | null
          overdue_ap: number | null
          overdue_ar: number | null
          period_end: string | null
          period_start: string | null
          repeat_customer_rate: number | null
          slow_moving_inventory: number | null
          snapshot_at: string | null
          tenant_id: string | null
          total_ap: number | null
          total_ar: number | null
          total_customers: number | null
          total_inventory_value: number | null
          total_marketing_spend: number | null
          total_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "central_metrics_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pending_approvals: {
        Row: {
          action: string | null
          approvals_remaining: number | null
          created_at: string | null
          current_approvals: number | null
          expires_at: string | null
          id: string | null
          policy_id: string | null
          policy_name: string | null
          policy_type: string | null
          requested_by: string | null
          requester_name: string | null
          required_approvals: number | null
          resource_data: Json | null
          resource_id: string | null
          resource_type: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "enterprise_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_credit_notes_view: {
        Row: {
          applied_amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          direction: string | null
          discount_amount: number | null
          due_date: string | null
          exchange_rate: number | null
          gl_account_id: string | null
          id: string | null
          metadata: Json | null
          note_date: string | null
          note_number: string | null
          note_type: string | null
          notes: string | null
          original_bill_id: string | null
          original_invoice_id: string | null
          original_order_id: string | null
          party_address: string | null
          party_email: string | null
          party_id: string | null
          party_name: string | null
          party_tax_code: string | null
          reason: string | null
          reference_number: string | null
          remaining_amount: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string | null
          terms: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          applied_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          direction?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          gl_account_id?: string | null
          id?: string | null
          metadata?: Json | null
          note_date?: string | null
          note_number?: string | null
          note_type?: string | null
          notes?: string | null
          original_bill_id?: string | null
          original_invoice_id?: string | null
          original_order_id?: string | null
          party_address?: string | null
          party_email?: string | null
          party_id?: string | null
          party_name?: string | null
          party_tax_code?: string | null
          reason?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          applied_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          direction?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          gl_account_id?: string | null
          id?: string | null
          metadata?: Json | null
          note_date?: string | null
          note_number?: string | null
          note_type?: string | null
          notes?: string | null
          original_bill_id?: string | null
          original_invoice_id?: string | null
          original_order_id?: string | null
          party_address?: string | null
          party_email?: string | null
          party_id?: string | null
          party_name?: string | null
          party_tax_code?: string | null
          reason?: string | null
          reference_number?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_notes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_paid"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_settled_status"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "adjustment_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_post_journal_entry: {
        Args: { p_entry_id: string }
        Returns: boolean
      }
      batch_recalculate_metrics: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      calculate_ap_aging_detail: {
        Args: { p_as_of_date?: string; p_tenant_id: string }
        Returns: {
          current_amount: number
          days_1_30: number
          days_31_60: number
          days_61_90: number
          over_90_days: number
          total_outstanding: number
          vendor_id: string
          vendor_name: string
        }[]
      }
      calculate_ar_aging_detail: {
        Args: { p_as_of_date?: string; p_tenant_id: string }
        Returns: {
          current_amount: number
          customer_id: string
          customer_name: string
          days_1_30: number
          days_31_60: number
          days_61_90: number
          over_90_days: number
          total_outstanding: number
        }[]
      }
      calculate_asset_depreciation: {
        Args: { p_asset_id: string }
        Returns: {
          accumulated_amount: number
          depreciation_amount: number
          period_date: string
          remaining_value: number
        }[]
      }
      calculate_decision_patterns: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      calculate_object_metrics: {
        Args: { p_object_id: string }
        Returns: undefined
      }
      calculate_trend_metrics: { Args: { p_values: number[] }; Returns: Json }
      check_alert_escalations: { Args: { p_tenant_id: string }; Returns: Json }
      check_policy_approval: {
        Args: { p_context: Json; p_policy_type: string; p_tenant_id: string }
        Returns: {
          approver_roles: string[]
          policy_id: string
          policy_name: string
          required_approvals: number
          requires_approval: boolean
        }[]
      }
      close_financial_period: {
        Args: { p_period_id: string }
        Returns: boolean
      }
      collapse_alerts_to_parent: {
        Args: {
          p_child_metric: string
          p_parent_metric: string
          p_tenant_id: string
        }
        Returns: Json
      }
      compute_central_metrics_snapshot: {
        Args: {
          p_period_end?: string
          p_period_start?: string
          p_tenant_id: string
        }
        Returns: string
      }
      generate_asset_code: {
        Args: { p_category: string; p_tenant_id: string }
        Returns: string
      }
      generate_bill_number: { Args: { p_tenant_id: string }; Returns: string }
      generate_credit_note_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_debit_note_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_invoice_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_journal_entry_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_order_number: {
        Args: { p_source?: string; p_tenant_id: string }
        Returns: string
      }
      generate_payment_number: {
        Args: { p_tenant_id: string; p_type?: string }
        Returns: string
      }
      generate_trial_balance: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          account_type: string
          closing_credit: number
          closing_debit: number
          opening_credit: number
          opening_debit: number
          period_credit: number
          period_debit: number
        }[]
      }
      generate_vendor_credit_note_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_active_tenant_id: { Args: never; Returns: string }
      get_ai_recommendation: {
        Args: {
          p_alert_id?: string
          p_decision_type?: string
          p_metric_code?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      get_decision_insight: {
        Args: {
          p_decision_type: string
          p_metric_code: string
          p_tenant_id: string
        }
        Returns: string
      }
      get_exchange_rate: {
        Args: {
          p_date?: string
          p_from_currency: string
          p_tenant_id: string
          p_to_currency: string
        }
        Returns: number
      }
      get_expenses_daily: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: {
          cogs_amount: number
          day: string
          depreciation_amount: number
          expense_count: number
          interest_amount: number
          logistics_amount: number
          marketing_amount: number
          other_amount: number
          rent_amount: number
          salary_amount: number
          tax_amount: number
          total_amount: number
          utilities_amount: number
        }[]
      }
      get_facts_summary: {
        Args: { p_grain_type: string; p_tenant_id: string }
        Returns: {
          avg_margin_percent: number
          total_cost: number
          total_items: number
          total_orders: number
          total_profit: number
          total_quantity: number
          total_revenue: number
        }[]
      }
      get_latest_central_metrics: {
        Args: { p_max_age_minutes?: number; p_tenant_id: string }
        Returns: {
          ar_aging_30d: number
          ar_aging_60d: number
          ar_aging_90d: number
          ar_aging_current: number
          avg_order_value: number
          cac: number
          cash_7d_forecast: number
          cash_runway_months: number
          cash_today: number
          ccc: number
          computation_duration_ms: number | null
          computed_by: string | null
          contribution_margin: number
          contribution_margin_percent: number
          created_at: string
          dio: number
          dpo: number
          dso: number
          ebitda: number
          ebitda_margin_percent: number
          gross_margin_percent: number
          gross_profit: number
          id: string
          ltv: number
          ltv_cac_ratio: number
          marketing_roas: number
          net_revenue: number
          overdue_ap: number
          overdue_ar: number
          period_end: string
          period_start: string
          repeat_customer_rate: number
          slow_moving_inventory: number
          snapshot_at: string
          tenant_id: string
          total_ap: number
          total_ar: number
          total_customers: number
          total_inventory_value: number
          total_marketing_spend: number
          total_orders: number
        }
        SetofOptions: {
          from: "*"
          to: "central_metrics_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
      get_working_capital_daily: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: {
          cash_balance: number
          ccc: number
          day: string
          dio: number
          dpo: number
          dso: number
          inventory: number
          net_working_capital: number
          overdue_ap: number
          overdue_ar: number
          total_ap: number
          total_ar: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_access: { Args: { _tenant_id: string }; Returns: boolean }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["tenant_role"]
          _tenant_id: string
        }
        Returns: boolean
      }
      is_authenticated: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: { _tenant_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_role: string
          p_actor_type: string
          p_after_state?: Json
          p_before_state?: Json
          p_decision_context?: string
          p_reason_code?: string
          p_reason_detail?: string
          p_resource_id: string
          p_resource_type: string
          p_tenant_id: string
        }
        Returns: string
      }
      post_journal_entry: { Args: { p_entry_id: string }; Returns: boolean }
      recalculate_product_metrics:
        | { Args: { p_sku?: string; p_tenant_id: string }; Returns: number }
        | {
            Args: { p_days_back?: number; p_sku?: string; p_tenant_id: string }
            Returns: number
          }
      refresh_central_metrics_cache: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: undefined
      }
      refresh_channel_analytics_cache: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      refresh_dashboard_kpi_cache: {
        Args: { p_date_range?: number; p_tenant_id: string }
        Returns: undefined
      }
      refresh_pl_cache: {
        Args: { p_month?: number; p_tenant_id: string; p_year?: number }
        Returns: undefined
      }
      refresh_whatif_metrics_cache: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      reverse_journal_entry: {
        Args: { p_entry_id: string; p_reversal_date?: string }
        Returns: string
      }
      sync_budget_actuals: { Args: never; Returns: undefined }
      validate_period_date: {
        Args: { p_date: string; p_tenant_id: string }
        Returns: string
      }
      void_journal_entry: {
        Args: { p_entry_id: string; p_reason: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "accountant" | "viewer"
      connector_type:
        | "haravan"
        | "sapo"
        | "kiotviet"
        | "nhanh"
        | "shopee"
        | "lazada"
        | "tiki"
        | "tiktok_shop"
        | "sendo"
        | "shopify"
        | "woocommerce"
        | "misa"
        | "fast"
        | "sap"
        | "bank_api"
        | "manual"
        | "bigquery"
      expense_category:
        | "cogs"
        | "salary"
        | "rent"
        | "utilities"
        | "marketing"
        | "logistics"
        | "depreciation"
        | "interest"
        | "tax"
        | "other"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipping"
        | "delivered"
        | "cancelled"
        | "returned"
      revenue_source: "manual" | "integrated"
      revenue_type: "one_time" | "recurring"
      settlement_status: "pending" | "processing" | "completed" | "disputed"
      sync_status: "pending" | "running" | "completed" | "failed" | "cancelled"
      tenant_role: "owner" | "admin" | "member" | "viewer"
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
      app_role: ["admin", "accountant", "viewer"],
      connector_type: [
        "haravan",
        "sapo",
        "kiotviet",
        "nhanh",
        "shopee",
        "lazada",
        "tiki",
        "tiktok_shop",
        "sendo",
        "shopify",
        "woocommerce",
        "misa",
        "fast",
        "sap",
        "bank_api",
        "manual",
        "bigquery",
      ],
      expense_category: [
        "cogs",
        "salary",
        "rent",
        "utilities",
        "marketing",
        "logistics",
        "depreciation",
        "interest",
        "tax",
        "other",
      ],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipping",
        "delivered",
        "cancelled",
        "returned",
      ],
      revenue_source: ["manual", "integrated"],
      revenue_type: ["one_time", "recurring"],
      settlement_status: ["pending", "processing", "completed", "disputed"],
      sync_status: ["pending", "running", "completed", "failed", "cancelled"],
      tenant_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
