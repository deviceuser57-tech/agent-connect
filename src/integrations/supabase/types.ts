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
      conflict_logs: {
        Row: {
          dna_preference: Json | null
          final_arbitration: Json | null
          governance_decision: Json | null
          id: string
          outcome_score: number | null
          session_id: string
          severity: number
          timestamp: string
          type: Database["public"]["Enums"]["conflict_type"]
        }
        Insert: {
          dna_preference?: Json | null
          final_arbitration?: Json | null
          governance_decision?: Json | null
          id?: string
          outcome_score?: number | null
          session_id: string
          severity: number
          timestamp?: string
          type: Database["public"]["Enums"]["conflict_type"]
        }
        Update: {
          dna_preference?: Json | null
          final_arbitration?: Json | null
          governance_decision?: Json | null
          id?: string
          outcome_score?: number | null
          session_id?: string
          severity?: number
          timestamp?: string
          type?: Database["public"]["Enums"]["conflict_type"]
        }
        Relationships: []
      }
      constitutional_snapshots: {
        Row: {
          id: string
          performance_evaluation: Json | null
          rule_set_snapshot: Json
          session_id: string
          stability_valid: boolean | null
          timestamp: string
        }
        Insert: {
          id?: string
          performance_evaluation?: Json | null
          rule_set_snapshot: Json
          session_id: string
          stability_valid?: boolean | null
          timestamp?: string
        }
        Update: {
          id?: string
          performance_evaluation?: Json | null
          rule_set_snapshot?: Json
          session_id?: string
          stability_valid?: boolean | null
          timestamp?: string
        }
        Relationships: []
      }
      execution_traces: {
        Row: {
          actual_weight: number | null
          bias: number | null
          created_at: string
          deviation: number | null
          id: string
          predicted_risk: number | null
          recovery_cost: number | null
          session_id: string
          trace_data: Json
        }
        Insert: {
          actual_weight?: number | null
          bias?: number | null
          created_at?: string
          deviation?: number | null
          id?: string
          predicted_risk?: number | null
          recovery_cost?: number | null
          session_id: string
          trace_data: Json
        }
        Update: {
          actual_weight?: number | null
          bias?: number | null
          created_at?: string
          deviation?: number | null
          id?: string
          predicted_risk?: number | null
          recovery_cost?: number | null
          session_id?: string
          trace_data?: Json
        }
        Relationships: []
      }
      governance_accuracy_log: {
        Row: {
          accuracy_score: number | null
          deviation: number | null
          id: string
          session_id: string
          signal_type: string | null
          timestamp: string
        }
        Insert: {
          accuracy_score?: number | null
          deviation?: number | null
          id?: string
          session_id: string
          signal_type?: string | null
          timestamp?: string
        }
        Update: {
          accuracy_score?: number | null
          deviation?: number | null
          id?: string
          session_id?: string
          signal_type?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      governance_causality_graph: {
        Row: {
          decision_pressure: number | null
          id: string
          influence_weight: number | null
          session_id: string
          source_node: string
          target_node: string
          timestamp: string
        }
        Insert: {
          decision_pressure?: number | null
          id?: string
          influence_weight?: number | null
          session_id: string
          source_node: string
          target_node: string
          timestamp?: string
        }
        Update: {
          decision_pressure?: number | null
          id?: string
          influence_weight?: number | null
          session_id?: string
          source_node?: string
          target_node?: string
          timestamp?: string
        }
        Relationships: []
      }
      governance_queue: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          proposed_action: string
          proposer_id: string | null
          proposer_role: string
          session_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          proposed_action: string
          proposer_id?: string | null
          proposer_role: string
          session_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          proposed_action?: string
          proposer_id?: string | null
          proposer_role?: string
          session_id?: string
          status?: string | null
        }
        Relationships: []
      }
      governance_reflections: {
        Row: {
          decision_id: string | null
          id: string
          reflection_data: Json
          self_bias_score: number | null
          session_id: string
          success_alignment: number | null
          timestamp: string
        }
        Insert: {
          decision_id?: string | null
          id?: string
          reflection_data: Json
          self_bias_score?: number | null
          session_id: string
          success_alignment?: number | null
          timestamp?: string
        }
        Update: {
          decision_id?: string | null
          id?: string
          reflection_data?: Json
          self_bias_score?: number | null
          session_id?: string
          success_alignment?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      governance_rules: {
        Row: {
          action: string
          condition_type: string
          condition_value: Json | null
          confidence_score: number | null
          created_at: string
          effectiveness_score: number | null
          id: string
          is_active: boolean | null
          origin_trace_id: string | null
          priority: number | null
          session_id: string
          updated_at: string
        }
        Insert: {
          action: string
          condition_type: string
          condition_value?: Json | null
          confidence_score?: number | null
          created_at?: string
          effectiveness_score?: number | null
          id?: string
          is_active?: boolean | null
          origin_trace_id?: string | null
          priority?: number | null
          session_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          condition_type?: string
          condition_value?: Json | null
          confidence_score?: number | null
          created_at?: string
          effectiveness_score?: number | null
          id?: string
          is_active?: boolean | null
          origin_trace_id?: string | null
          priority?: number | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      governance_state: {
        Row: {
          adaptability_factor: number | null
          approval_threshold_adj: number | null
          current_mode: string | null
          id: string
          intelligence_accuracy: number | null
          last_updated: string | null
          safety_factor: number | null
          session_id: string
        }
        Insert: {
          adaptability_factor?: number | null
          approval_threshold_adj?: number | null
          current_mode?: string | null
          id?: string
          intelligence_accuracy?: number | null
          last_updated?: string | null
          safety_factor?: number | null
          session_id: string
        }
        Update: {
          adaptability_factor?: number | null
          approval_threshold_adj?: number | null
          current_mode?: string | null
          id?: string
          intelligence_accuracy?: number | null
          last_updated?: string | null
          safety_factor?: number | null
          session_id?: string
        }
        Relationships: []
      }
      governance_traces: {
        Row: {
          action: string
          execution_signature: string | null
          id: string
          is_approved: boolean | null
          is_blocked: boolean | null
          reason: string | null
          session_id: string
          shadow_detected: boolean | null
          timestamp: string
          user_role: string
        }
        Insert: {
          action: string
          execution_signature?: string | null
          id?: string
          is_approved?: boolean | null
          is_blocked?: boolean | null
          reason?: string | null
          session_id: string
          shadow_detected?: boolean | null
          timestamp?: string
          user_role: string
        }
        Update: {
          action?: string
          execution_signature?: string | null
          id?: string
          is_approved?: boolean | null
          is_blocked?: boolean | null
          reason?: string | null
          session_id?: string
          shadow_detected?: boolean | null
          timestamp?: string
          user_role?: string
        }
        Relationships: []
      }
      knowledge_folders: {
        Row: {
          created_at: string
          created_by: string | null
          folder_type: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_type?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_type?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_evaluation_logs: {
        Row: {
          accuracy_trend: number | null
          adjustment_actions: string[] | null
          effectiveness_trend: number | null
          id: string
          session_id: string
          stability_index: number | null
          timestamp: string
        }
        Insert: {
          accuracy_trend?: number | null
          adjustment_actions?: string[] | null
          effectiveness_trend?: number | null
          id?: string
          session_id: string
          stability_index?: number | null
          timestamp?: string
        }
        Update: {
          accuracy_trend?: number | null
          adjustment_actions?: string[] | null
          effectiveness_trend?: number | null
          id?: string
          session_id?: string
          stability_index?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      policy_evolution_logs: {
        Row: {
          delta_data: Json | null
          evolution_score: number | null
          evolution_type: string
          id: string
          rule_id: string | null
          session_id: string
          timestamp: string
        }
        Insert: {
          delta_data?: Json | null
          evolution_score?: number | null
          evolution_type: string
          id?: string
          rule_id?: string | null
          session_id: string
          timestamp?: string
        }
        Update: {
          delta_data?: Json | null
          evolution_score?: number | null
          evolution_type?: string
          id?: string
          rule_id?: string | null
          session_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_decision_memory:
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: string
              similarity: number
            }[]
          }
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: string
              similarity: number
            }[]
          }
    }
    Enums: {
      conflict_type:
        | "RISK_CONFLICT"
        | "ACTION_CONFLICT"
        | "PATH_CONFLICT"
        | "EXPLORATION_CONFLICT"
      governance_mode:
        | "STRICT_MODE"
        | "BALANCED_MODE"
        | "PERMISSIVE_MODE"
        | "INVESTIGATIVE_MODE"
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
      conflict_type: [
        "RISK_CONFLICT",
        "ACTION_CONFLICT",
        "PATH_CONFLICT",
        "EXPLORATION_CONFLICT",
      ],
      governance_mode: [
        "STRICT_MODE",
        "BALANCED_MODE",
        "PERMISSIVE_MODE",
        "INVESTIGATIVE_MODE",
      ],
    },
  },
} as const
