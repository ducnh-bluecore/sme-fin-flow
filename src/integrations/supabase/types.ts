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
      alert_instances: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_url: string | null
          alert_config_id: string | null
          alert_object_id: string | null
          alert_type: string
          category: string
          change_percent: number | null
          created_at: string
          current_value: number | null
          data_source_id: string | null
          external_object_id: string | null
          id: string
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
          sent_at: string | null
          sent_to: Json | null
          severity: string
          snoozed_until: string | null
          status: string | null
          tenant_id: string
          threshold_operator: string | null
          threshold_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_url?: string | null
          alert_config_id?: string | null
          alert_object_id?: string | null
          alert_type: string
          category: string
          change_percent?: number | null
          created_at?: string
          current_value?: number | null
          data_source_id?: string | null
          external_object_id?: string | null
          id?: string
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
          sent_at?: string | null
          sent_to?: Json | null
          severity?: string
          snoozed_until?: string | null
          status?: string | null
          tenant_id: string
          threshold_operator?: string | null
          threshold_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_url?: string | null
          alert_config_id?: string | null
          alert_object_id?: string | null
          alert_type?: string
          category?: string
          change_percent?: number | null
          created_at?: string
          current_value?: number | null
          data_source_id?: string | null
          external_object_id?: string | null
          id?: string
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
          sent_at?: string | null
          sent_to?: Json | null
          severity?: string
          snoozed_until?: string | null
          status?: string | null
          tenant_id?: string
          threshold_operator?: string | null
          threshold_value?: number | null
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
          alert_status: string | null
          created_at: string
          current_metrics: Json | null
          data_source_id: string | null
          external_id: string | null
          id: string
          is_monitored: boolean | null
          last_alert_at: string | null
          metadata: Json | null
          object_category: string | null
          object_data: Json | null
          object_name: string
          object_type: string
          previous_metrics: Json | null
          synced_at: string | null
          tenant_id: string
          threshold_overrides: Json | null
          updated_at: string
        }
        Insert: {
          alert_status?: string | null
          created_at?: string
          current_metrics?: Json | null
          data_source_id?: string | null
          external_id?: string | null
          id?: string
          is_monitored?: boolean | null
          last_alert_at?: string | null
          metadata?: Json | null
          object_category?: string | null
          object_data?: Json | null
          object_name: string
          object_type: string
          previous_metrics?: Json | null
          synced_at?: string | null
          tenant_id: string
          threshold_overrides?: Json | null
          updated_at?: string
        }
        Update: {
          alert_status?: string | null
          created_at?: string
          current_metrics?: Json | null
          data_source_id?: string | null
          external_id?: string | null
          id?: string
          is_monitored?: boolean | null
          last_alert_at?: string | null
          metadata?: Json | null
          object_category?: string | null
          object_data?: Json | null
          object_name?: string
          object_type?: string
          previous_metrics?: Json | null
          synced_at?: string | null
          tenant_id?: string
          threshold_overrides?: Json | null
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
            referencedRelation: "invoice_adjustments_summary"
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
            foreignKeyName: "bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
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
      credit_note_items: {
        Row: {
          amount: number
          created_at: string
          credit_note_id: string
          description: string
          id: string
          invoice_item_id: string | null
          product_id: string | null
          quantity: number
          tenant_id: string
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          credit_note_id: string
          description: string
          id?: string
          invoice_item_id?: string | null
          product_id?: string | null
          quantity?: number
          tenant_id: string
          unit_price?: number
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          credit_note_id?: string
          description?: string
          id?: string
          invoice_item_id?: string | null
          product_id?: string | null
          quantity?: number
          tenant_id?: string
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          credit_note_date: string
          credit_note_number: string
          currency_code: string | null
          customer_id: string | null
          description: string | null
          exchange_rate: number | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          notes: string | null
          reason: string
          status: string
          subtotal: number
          tenant_id: string
          total_amount: number
          total_amount_base: number | null
          updated_at: string
          vat_amount: number
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_date?: string
          credit_note_number: string
          currency_code?: string | null
          customer_id?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          reason: string
          status?: string
          subtotal?: number
          tenant_id: string
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_date?: string
          credit_note_number?: string
          currency_code?: string | null
          customer_id?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          reason?: string
          status?: string
          subtotal?: number
          tenant_id?: string
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_adjustments_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_tenant_id_fkey"
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
          address: string | null
          city: string | null
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
          name: string
          notes: string | null
          payment_term_id: string | null
          payment_terms: number | null
          phone: string | null
          province: string | null
          status: string | null
          tax_code: string | null
          tenant_id: string | null
          updated_at: string
          ward: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
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
          name: string
          notes?: string | null
          payment_term_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          province?: string | null
          status?: string | null
          tax_code?: string | null
          tenant_id?: string | null
          updated_at?: string
          ward?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
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
          name?: string
          notes?: string | null
          payment_term_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          province?: string | null
          status?: string | null
          tax_code?: string | null
          tenant_id?: string | null
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
          cash_today: number | null
          ccc: number | null
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          dso: number | null
          ebitda: number | null
          gross_margin: number | null
          id: string
          invoice_count: number | null
          matched_transaction_count: number | null
          overdue_ar: number | null
          overdue_invoice_count: number | null
          tenant_id: string
          total_ar: number | null
          total_cogs: number | null
          total_opex: number | null
          total_revenue: number | null
          transaction_count: number | null
          updated_at: string | null
        }
        Insert: {
          auto_match_rate?: number | null
          calculated_at?: string | null
          cash_7d?: number | null
          cash_today?: number | null
          ccc?: number | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          dso?: number | null
          ebitda?: number | null
          gross_margin?: number | null
          id?: string
          invoice_count?: number | null
          matched_transaction_count?: number | null
          overdue_ar?: number | null
          overdue_invoice_count?: number | null
          tenant_id: string
          total_ar?: number | null
          total_cogs?: number | null
          total_opex?: number | null
          total_revenue?: number | null
          transaction_count?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_match_rate?: number | null
          calculated_at?: string | null
          cash_7d?: number | null
          cash_today?: number | null
          ccc?: number | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          dso?: number | null
          ebitda?: number | null
          gross_margin?: number | null
          id?: string
          invoice_count?: number | null
          matched_transaction_count?: number | null
          overdue_ar?: number | null
          overdue_invoice_count?: number | null
          tenant_id?: string
          total_ar?: number | null
          total_cogs?: number | null
          total_opex?: number | null
          total_revenue?: number | null
          transaction_count?: number | null
          updated_at?: string | null
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
      debit_note_items: {
        Row: {
          amount: number
          created_at: string
          debit_note_id: string
          description: string
          id: string
          invoice_item_id: string | null
          product_id: string | null
          quantity: number
          tenant_id: string
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          debit_note_id: string
          description: string
          id?: string
          invoice_item_id?: string | null
          product_id?: string | null
          quantity?: number
          tenant_id: string
          unit_price?: number
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          debit_note_id?: string
          description?: string
          id?: string
          invoice_item_id?: string | null
          product_id?: string | null
          quantity?: number
          tenant_id?: string
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_note_items_debit_note_id_fkey"
            columns: ["debit_note_id"]
            isOneToOne: false
            referencedRelation: "debit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_note_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_note_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_notes: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          debit_note_date: string
          debit_note_number: string
          description: string | null
          exchange_rate: number | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          notes: string | null
          reason: string
          status: string
          subtotal: number
          tenant_id: string
          total_amount: number
          total_amount_base: number | null
          updated_at: string
          vat_amount: number
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          debit_note_date?: string
          debit_note_number: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          reason: string
          status?: string
          subtotal?: number
          tenant_id: string
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          debit_note_date?: string
          debit_note_number?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          reason?: string
          status?: string
          subtotal?: number
          tenant_id?: string
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "debit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_adjustments_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "debit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
            referencedRelation: "invoice_adjustments_summary"
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
            foreignKeyName: "external_products_internal_product_id_fkey"
            columns: ["internal_product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
            referencedRelation: "invoice_adjustments_summary"
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
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
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
            referencedRelation: "invoice_adjustments_summary"
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
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          notes: string | null
          order_date: string
          order_number: string
          source: string
          status: string
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          notes?: string | null
          order_date?: string
          order_number: string
          source: string
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          notes?: string | null
          order_date?: string
          order_number?: string
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
            referencedRelation: "invoice_adjustments_summary"
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
            foreignKeyName: "orders_tenant_id_fkey"
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
            referencedRelation: "invoice_adjustments_summary"
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
          id: string
          internal_product_id: string | null
          is_active: boolean | null
          last_calculated_at: string | null
          product_name: string
          selling_price: number | null
          sku: string
          subcategory: string | null
          tenant_id: string
          total_profit: number | null
          total_revenue: number | null
          total_sold: number | null
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
          id?: string
          internal_product_id?: string | null
          is_active?: boolean | null
          last_calculated_at?: string | null
          product_name: string
          selling_price?: number | null
          sku: string
          subcategory?: string | null
          tenant_id: string
          total_profit?: number | null
          total_revenue?: number | null
          total_sold?: number | null
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
          id?: string
          internal_product_id?: string | null
          is_active?: boolean | null
          last_calculated_at?: string | null
          product_name?: string
          selling_price?: number | null
          sku?: string
          subcategory?: string | null
          tenant_id?: string
          total_profit?: number | null
          total_revenue?: number | null
          total_sold?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_master_internal_product_id_fkey"
            columns: ["internal_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_master_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          code: string
          cost_price: number | null
          created_at: string
          created_by: string | null
          current_stock: number | null
          description: string | null
          gl_cogs_account_id: string | null
          gl_inventory_account_id: string | null
          gl_revenue_account_id: string | null
          id: string
          is_service: boolean | null
          min_stock: number | null
          name: string
          status: string | null
          tenant_id: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          category?: string | null
          code: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          gl_cogs_account_id?: string | null
          gl_inventory_account_id?: string | null
          gl_revenue_account_id?: string | null
          id?: string
          is_service?: boolean | null
          min_stock?: number | null
          name: string
          status?: string | null
          tenant_id?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          gl_cogs_account_id?: string | null
          gl_inventory_account_id?: string | null
          gl_revenue_account_id?: string | null
          id?: string
          is_service?: boolean | null
          min_stock?: number | null
          name?: string
          status?: string | null
          tenant_id?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_gl_cogs_account_id_fkey"
            columns: ["gl_cogs_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_gl_cogs_account_id_fkey"
            columns: ["gl_cogs_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "products_gl_inventory_account_id_fkey"
            columns: ["gl_inventory_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_gl_inventory_account_id_fkey"
            columns: ["gl_inventory_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "products_gl_revenue_account_id_fkey"
            columns: ["gl_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_gl_revenue_account_id_fkey"
            columns: ["gl_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
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
      vendor_credit_notes: {
        Row: {
          bill_id: string | null
          created_at: string
          created_by: string | null
          credit_note_date: string
          credit_note_number: string
          currency_code: string | null
          description: string | null
          exchange_rate: number | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          reason: string
          status: string
          subtotal: number
          tenant_id: string
          total_amount: number
          total_amount_base: number | null
          updated_at: string
          vat_amount: number
          vendor_credit_note_number: string | null
          vendor_id: string | null
        }
        Insert: {
          bill_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_date?: string
          credit_note_number: string
          currency_code?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          reason: string
          status?: string
          subtotal?: number
          tenant_id: string
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
          vendor_credit_note_number?: string | null
          vendor_id?: string | null
        }
        Update: {
          bill_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_date?: string
          credit_note_number?: string
          currency_code?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          reason?: string
          status?: string
          subtotal?: number
          tenant_id?: string
          total_amount?: number
          total_amount_base?: number | null
          updated_at?: string
          vat_amount?: number
          vendor_credit_note_number?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_credit_notes_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "vendor_credit_notes_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_credit_notes_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_credit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_credit_notes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
      invoice_adjustments_summary: {
        Row: {
          balance_due: number | null
          credit_note_count: number | null
          customer_id: string | null
          customer_name: string | null
          debit_note_count: number | null
          invoice_id: string | null
          invoice_number: string | null
          net_amount: number | null
          original_amount: number | null
          paid_amount: number | null
          tenant_id: string | null
          total_credit_notes: number | null
          total_debit_notes: number | null
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
    }
    Functions: {
      auto_post_journal_entry: {
        Args: { p_entry_id: string }
        Returns: boolean
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
      close_financial_period: {
        Args: { p_period_id: string }
        Returns: boolean
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
      get_exchange_rate: {
        Args: {
          p_date?: string
          p_from_currency: string
          p_tenant_id: string
          p_to_currency: string
        }
        Returns: number
      }
      get_user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
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
      post_journal_entry: { Args: { p_entry_id: string }; Returns: boolean }
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
