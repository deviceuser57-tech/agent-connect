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
      activity_feed: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tools: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          tool_type: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          tool_type: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          tool_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tools_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflows: {
        Row: {
          canvas_data: Json
          created_at: string
          created_by: string
          description: string | null
          execution_mode: string
          handoff_rules: Json
          id: string
          name: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          canvas_data?: Json
          created_at?: string
          created_by: string
          description?: string | null
          execution_mode?: string
          handoff_rules?: Json
          id?: string
          name: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          canvas_data?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          execution_mode?: string
          handoff_rules?: Json
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_profiles: {
        Row: {
          active_days: number[] | null
          active_from: string | null
          active_until: string | null
          agent_tasks: Json
          allowed_folders: string[] | null
          api_key_id: string | null
          awareness_settings: Json
          chunk_priority: string[] | null
          core_model: string
          created_at: string
          created_by: string
          display_name: string
          id: string
          intro_sentence: string | null
          is_active: boolean
          memory_settings: Json
          persona: string | null
          rag_policy: Json | null
          response_rules: Json | null
          role_description: string | null
          updated_at: string
          user_defined_name: string
          workspace_id: string | null
        }
        Insert: {
          active_days?: number[] | null
          active_from?: string | null
          active_until?: string | null
          agent_tasks?: Json
          allowed_folders?: string[] | null
          api_key_id?: string | null
          awareness_settings?: Json
          chunk_priority?: string[] | null
          core_model?: string
          created_at?: string
          created_by: string
          display_name: string
          id?: string
          intro_sentence?: string | null
          is_active?: boolean
          memory_settings?: Json
          persona?: string | null
          rag_policy?: Json | null
          response_rules?: Json | null
          role_description?: string | null
          updated_at?: string
          user_defined_name?: string
          workspace_id?: string | null
        }
        Update: {
          active_days?: number[] | null
          active_from?: string | null
          active_until?: string | null
          agent_tasks?: Json
          allowed_folders?: string[] | null
          api_key_id?: string | null
          awareness_settings?: Json
          chunk_priority?: string[] | null
          core_model?: string
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          intro_sentence?: string | null
          is_active?: boolean
          memory_settings?: Json
          persona?: string | null
          rag_policy?: Json | null
          response_rules?: Json | null
          role_description?: string | null
          updated_at?: string
          user_defined_name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_profiles_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "workspace_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          agent_id: string | null
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens_used?: number | null
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
      cognitive_dna: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          trait_key: string
          trait_value: Json
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          trait_key: string
          trait_value: Json
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          trait_key?: string
          trait_value?: Json
          version?: number
        }
        Relationships: []
      }
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
      exported_configs: {
        Row: {
          config_data: Json
          created_at: string
          exported_by: string
          id: string
          multi_agent_config_id: string
          version: number
        }
        Insert: {
          config_data: Json
          created_at?: string
          exported_by: string
          id?: string
          multi_agent_config_id: string
          version?: number
        }
        Update: {
          config_data?: Json
          created_at?: string
          exported_by?: string
          id?: string
          multi_agent_config_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "exported_configs_multi_agent_config_id_fkey"
            columns: ["multi_agent_config_id"]
            isOneToOne: false
            referencedRelation: "multi_agent_configs"
            referencedColumns: ["id"]
          },
        ]
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
      knowledge_chunks: {
        Row: {
          chunk_index: number
          chunk_type: string | null
          content: string
          created_at: string
          document_context: string | null
          document_summary: string | null
          entities: Json | null
          folder_id: string | null
          id: string
          key_concepts: string[] | null
          metadata: Json | null
          quality_score: number | null
          semantic_tags: string[] | null
          source_file: string
          token_count: number | null
          total_chunks: number
          updated_at: string
        }
        Insert: {
          chunk_index?: number
          chunk_type?: string | null
          content: string
          created_at?: string
          document_context?: string | null
          document_summary?: string | null
          entities?: Json | null
          folder_id?: string | null
          id?: string
          key_concepts?: string[] | null
          metadata?: Json | null
          quality_score?: number | null
          semantic_tags?: string[] | null
          source_file: string
          token_count?: number | null
          total_chunks?: number
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          chunk_type?: string | null
          content?: string
          created_at?: string
          document_context?: string | null
          document_summary?: string | null
          entities?: Json | null
          folder_id?: string | null
          id?: string
          key_concepts?: string[] | null
          metadata?: Json | null
          quality_score?: number | null
          semantic_tags?: string[] | null
          source_file?: string
          token_count?: number | null
          total_chunks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
        ]
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
      marketplace_imports: {
        Row: {
          created_at: string
          id: string
          imported_by: string
          imported_config_id: string | null
          marketplace_item_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_by: string
          imported_config_id?: string | null
          marketplace_item_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_by?: string
          imported_config_id?: string | null
          marketplace_item_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_imports_marketplace_item_id_fkey"
            columns: ["marketplace_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_imports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          agent_count: number
          canvas_data: Json | null
          category: string | null
          config_data: Json
          created_at: string
          description: string | null
          download_count: number
          id: string
          is_public: boolean
          item_type: string
          name: string
          publisher_id: string
          publisher_workspace_id: string
          rating: number
          rating_count: number
          source_config_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          agent_count?: number
          canvas_data?: Json | null
          category?: string | null
          config_data: Json
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          is_public?: boolean
          item_type: string
          name: string
          publisher_id: string
          publisher_workspace_id: string
          rating?: number
          rating_count?: number
          source_config_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_count?: number
          canvas_data?: Json | null
          category?: string | null
          config_data?: Json
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          is_public?: boolean
          item_type?: string
          name?: string
          publisher_id?: string
          publisher_workspace_id?: string
          rating?: number
          rating_count?: number
          source_config_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_items_publisher_workspace_id_fkey"
            columns: ["publisher_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      multi_agent_configs: {
        Row: {
          agent_nodes: Json
          canvas_data: Json
          connections: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          input_folder_id: string | null
          name: string
          output_folder_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_nodes?: Json
          canvas_data?: Json
          connections?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          input_folder_id?: string | null
          name: string
          output_folder_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_nodes?: Json
          canvas_data?: Json
          connections?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          input_folder_id?: string | null
          name?: string
          output_folder_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multi_agent_configs_input_folder_id_fkey"
            columns: ["input_folder_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_agent_configs_output_folder_id_fkey"
            columns: ["output_folder_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_agent_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      rag_knowledge_graph: {
        Row: {
          chunk_id: string | null
          confidence: number | null
          created_at: string
          id: string
          metadata: Json | null
          relationship: string
          source_entity: string
          source_type: string | null
          target_entity: string
          target_type: string | null
        }
        Insert: {
          chunk_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship: string
          source_entity: string
          source_type?: string | null
          target_entity: string
          target_type?: string | null
        }
        Update: {
          chunk_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship?: string
          source_entity?: string
          source_type?: string | null
          target_entity?: string
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_knowledge_graph_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          created_at: string
          created_by: string
          cron_expression: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          updated_at: string
          workflow_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          cron_expression: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          updated_at?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          cron_expression?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          updated_at?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_jobs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "multi_agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted_at: string | null
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          role: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          agent_id: string | null
          created_at: string
          folders_accessed: string[] | null
          id: string
          query: string | null
          response_time_ms: number | null
          tokens_used: number | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          folders_accessed?: string[] | null
          id?: string
          query?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          folders_accessed?: string[] | null
          id?: string
          query?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          execution_logs: Json
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: string
          trigger_type: string
          workflow_id: string | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          execution_logs?: Json
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          execution_logs?: Json
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "multi_agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_api_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          created_by: string
          display_name: string | null
          id: string
          is_active: boolean
          provider: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          created_by: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          created_by?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      cognition_traces_compat: {
        Row: {
          created_at: string | null
          id: string | null
          l0: Json | null
          l1: Json | null
          l2: Json | null
          l3: Json | null
          l4: Json | null
          l5: Json | null
          l6: Json | null
          l7: Json | null
          raw_trace: Json | null
          session_id: string | null
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          l0?: never
          l1?: never
          l2?: never
          l3?: never
          l4?: never
          l5?: never
          l6?: never
          l7?: never
          raw_trace?: Json | null
          session_id?: string | null
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          l0?: never
          l1?: never
          l2?: never
          l3?: never
          l4?: never
          l5?: never
          l6?: never
          l7?: never
          raw_trace?: Json | null
          session_id?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
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
