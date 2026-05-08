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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          analysis: string | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          detected_at: string
          id: string
          incident_id: string | null
          is_false_positive: boolean
          remediation: string | null
          resolved_at: string | null
          scan_id: string | null
          sent_to_slack: boolean
          severity: string
          source_url: string | null
          status: string
          summary: string
          tool_name: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          analysis?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          incident_id?: string | null
          is_false_positive?: boolean
          remediation?: string | null
          resolved_at?: string | null
          scan_id?: string | null
          sent_to_slack?: boolean
          severity: string
          source_url?: string | null
          status?: string
          summary: string
          tool_name: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          analysis?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          incident_id?: string | null
          is_false_positive?: boolean
          remediation?: string | null
          resolved_at?: string | null
          scan_id?: string | null
          sent_to_slack?: boolean
          severity?: string
          source_url?: string | null
          status?: string
          summary?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_history"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      case_notes: {
        Row: {
          alert_id: string | null
          content: string
          created_at: string
          id: string
          incident_id: string | null
          note_type: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          content: string
          created_at?: string
          id?: string
          incident_id?: string | null
          note_type?: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          content?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          note_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          created_at: string
          escalate_after_minutes: number
          id: string
          is_active: boolean
          name: string
          notify_channel_id: string | null
          severity_filter: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          escalate_after_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          notify_channel_id?: string | null
          severity_filter?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          escalate_after_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          notify_channel_id?: string | null
          severity_filter?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_notify_channel_id_fkey"
            columns: ["notify_channel_id"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_attachments: {
        Row: {
          alert_id: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          incident_id: string | null
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          incident_id?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          incident_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_attachments_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_attachments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      iocs: {
        Row: {
          alert_id: string | null
          created_at: string
          enriched_at: string | null
          enrichment_data: Json | null
          id: string
          incident_id: string | null
          ioc_type: string
          ioc_value: string
          reputation: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          enriched_at?: string | null
          enrichment_data?: Json | null
          id?: string
          incident_id?: string | null
          ioc_type: string
          ioc_value: string
          reputation?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          enriched_at?: string | null
          enrichment_data?: Json | null
          id?: string
          incident_id?: string | null
          ioc_type?: string
          ioc_value?: string
          reputation?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iocs_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iocs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_config: {
        Row: {
          created_at: string
          custom_ai_config: Json | null
          id: string
          is_active: boolean
          scan_frequency: string
          slack_webhook_url: string | null
          tools_list: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_ai_config?: Json | null
          id?: string
          is_active?: boolean
          scan_frequency?: string
          slack_webhook_url?: string | null
          tools_list?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_ai_config?: Json | null
          id?: string
          is_active?: boolean
          scan_frequency?: string
          slack_webhook_url?: string | null
          tools_list?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_channels: {
        Row: {
          channel_type: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_type: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_type?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playbook_executions: {
        Row: {
          alert_id: string | null
          completed_at: string | null
          current_step: number
          id: string
          incident_id: string | null
          playbook_id: string
          started_at: string
          status: string
          step_results: Json
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          completed_at?: string | null
          current_step?: number
          id?: string
          incident_id?: string | null
          playbook_id: string
          started_at?: string
          status?: string
          step_results?: Json
          user_id: string
        }
        Update: {
          alert_id?: string | null
          completed_at?: string | null
          current_step?: number
          id?: string
          incident_id?: string | null
          playbook_id?: string
          started_at?: string
          status?: string
          step_results?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_executions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_executions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_executions_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_steps: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          description: string | null
          id: string
          playbook_id: string
          step_order: number
          title: string
        }
        Insert: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          playbook_id: string
          step_order: number
          title: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          playbook_id?: string
          step_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_steps_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_conditions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_conditions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_conditions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      response_actions: {
        Row: {
          action_type: string
          alert_id: string | null
          created_at: string
          executed_at: string | null
          id: string
          incident_id: string | null
          result: Json | null
          status: string
          target: string
          user_id: string
        }
        Insert: {
          action_type: string
          alert_id?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          incident_id?: string | null
          result?: Json | null
          status?: string
          target: string
          user_id: string
        }
        Update: {
          action_type?: string
          alert_id?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          incident_id?: string | null
          result?: Json | null
          status?: string
          target?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_actions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_history: {
        Row: {
          alerts_found: number
          created_at: string
          error_message: string | null
          id: string
          scan_completed_at: string | null
          scan_started_at: string
          status: string
          user_id: string
        }
        Insert: {
          alerts_found?: number
          created_at?: string
          error_message?: string | null
          id?: string
          scan_completed_at?: string | null
          scan_started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          alerts_found?: number
          created_at?: string
          error_message?: string | null
          id?: string
          scan_completed_at?: string | null
          scan_started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_handovers: {
        Row: {
          created_at: string
          escalated_count: number
          id: string
          key_findings: string | null
          notes: string | null
          open_alerts_count: number
          pending_actions: string | null
          resolved_count: number
          shift_end: string
          shift_start: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          escalated_count?: number
          id?: string
          key_findings?: string | null
          notes?: string | null
          open_alerts_count?: number
          pending_actions?: string | null
          resolved_count?: number
          shift_end?: string
          shift_start?: string
          summary?: string
          user_id: string
        }
        Update: {
          created_at?: string
          escalated_count?: number
          id?: string
          key_findings?: string | null
          notes?: string | null
          open_alerts_count?: number
          pending_actions?: string | null
          resolved_count?: number
          shift_end?: string
          shift_start?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      siem_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          siem_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          siem_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          siem_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content_key: string
          content_type: string
          content_value: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content_key: string
          content_type?: string
          content_value?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content_key?: string
          content_type?: string
          content_value?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sla_config: {
        Row: {
          created_at: string
          critical_ack_minutes: number
          critical_resolve_minutes: number
          high_ack_minutes: number
          high_resolve_minutes: number
          id: string
          low_ack_minutes: number
          low_resolve_minutes: number
          medium_ack_minutes: number
          medium_resolve_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          critical_ack_minutes?: number
          critical_resolve_minutes?: number
          high_ack_minutes?: number
          high_resolve_minutes?: number
          id?: string
          low_ack_minutes?: number
          low_resolve_minutes?: number
          medium_ack_minutes?: number
          medium_resolve_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          critical_ack_minutes?: number
          critical_resolve_minutes?: number
          high_ack_minutes?: number
          high_resolve_minutes?: number
          id?: string
          low_ack_minutes?: number
          low_resolve_minutes?: number
          medium_ack_minutes?: number
          medium_resolve_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppression_rules: {
        Row: {
          conditions: Json
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          name: string
          user_id: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          user_id: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string
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
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          secret: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_analytics: { Args: never; Returns: Json }
      admin_get_stats: { Args: never; Returns: Json }
      admin_get_system_health: { Args: never; Returns: Json }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          raw_user_meta_data: Json
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      touch_api_key: { Args: { p_api_key: string }; Returns: undefined }
      validate_api_key: { Args: { p_api_key: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
