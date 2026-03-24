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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      batch_jobs: {
        Row: {
          completed_at: string | null
          error: string | null
          id: string
          metadata: Json | null
          phase: string | null
          progress: number | null
          started_at: string | null
          status: string | null
          total: number | null
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          id?: string
          metadata?: Json | null
          phase?: string | null
          progress?: number | null
          started_at?: string | null
          status?: string | null
          total?: number | null
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          id?: string
          metadata?: Json | null
          phase?: string | null
          progress?: number | null
          started_at?: string | null
          status?: string | null
          total?: number | null
        }
        Relationships: []
      }
      cluster_members: {
        Row: {
          cluster_id: string
          distance: number
          post_id: string
        }
        Insert: {
          cluster_id: string
          distance: number
          post_id: string
        }
        Update: {
          cluster_id?: string
          distance?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_members_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_members_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          centroid: string | null
          coherence: number | null
          created_at: string | null
          id: string
          label: string | null
          post_count: number | null
        }
        Insert: {
          centroid?: string | null
          coherence?: number | null
          created_at?: string | null
          id?: string
          label?: string | null
          post_count?: number | null
        }
        Update: {
          centroid?: string | null
          coherence?: number | null
          created_at?: string | null
          id?: string
          label?: string | null
          post_count?: number | null
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          created_at: string | null
          embedding: string
          id: string
          model_version: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          embedding: string
          id?: string
          model_version?: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          embedding?: string
          id?: string
          model_version?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      link_suggestions: {
        Row: {
          anchor_text: string
          applied_at: string | null
          context_snippet: string | null
          created_at: string | null
          id: string
          similarity_score: number
          source_post_id: string
          status: string | null
          target_post_id: string
        }
        Insert: {
          anchor_text: string
          applied_at?: string | null
          context_snippet?: string | null
          created_at?: string | null
          id?: string
          similarity_score: number
          source_post_id: string
          status?: string | null
          target_post_id: string
        }
        Update: {
          anchor_text?: string
          applied_at?: string | null
          context_snippet?: string | null
          created_at?: string | null
          id?: string
          similarity_score?: number
          source_post_id?: string
          status?: string | null
          target_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_suggestions_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_suggestions_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content_hash: string
          fetched_at: string | null
          id: string
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          url: string
          word_count: number | null
          wp_post_id: number
        }
        Insert: {
          content_hash: string
          fetched_at?: string | null
          id?: string
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          url: string
          word_count?: number | null
          wp_post_id: number
        }
        Update: {
          content_hash?: string
          fetched_at?: string | null
          id?: string
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          url?: string
          word_count?: number | null
          wp_post_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_posts: {
        Args: {
          exclude_post_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          post_id: string
          similarity: number
          slug: string
          title: string
          wp_post_id: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
