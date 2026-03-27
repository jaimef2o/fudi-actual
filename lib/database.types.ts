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
      chains: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      dishes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          id: string
          inviter_user_id: string
          token: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          id?: string
          inviter_user_id: string
          token: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          id?: string
          inviter_user_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          added_at: string
          id: string
          list_id: string
          restaurant_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          list_id: string
          restaurant_id: string
        }
        Update: {
          added_at?: string
          id?: string
          list_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          id: string
          name: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          user_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          user_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          affinity_score: number | null
          created_at: string
          target_id: string
          type: string
          user_id: string
        }
        Insert: {
          affinity_score?: number | null
          created_at?: string
          target_id: string
          type: string
          user_id: string
        }
        Update: {
          affinity_score?: number | null
          created_at?: string
          target_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          brand_name: string | null
          brand_slug: string | null
          chain_id: string | null
          chain_name: string | null
          city: string | null
          cover_image_url: string | null
          cuisine: string | null
          google_place_id: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          neighborhood: string | null
          price_level: number | null
        }
        Insert: {
          address?: string | null
          brand_name?: string | null
          brand_slug?: string | null
          chain_id?: string | null
          chain_name?: string | null
          city?: string | null
          cover_image_url?: string | null
          cuisine?: string | null
          google_place_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          neighborhood?: string | null
          price_level?: number | null
        }
        Update: {
          address?: string | null
          brand_name?: string | null
          brand_slug?: string | null
          chain_id?: string | null
          chain_name?: string | null
          city?: string | null
          cover_image_url?: string | null
          cuisine?: string | null
          google_place_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          neighborhood?: string | null
          price_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          cuisine_dislikes: string[] | null
          dietary_restrictions: string[] | null
          handle: string | null
          id: string
          is_creator: boolean
          name: string
          phone: string | null
          push_token: string | null
          taste_profile: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          cuisine_dislikes?: string[] | null
          dietary_restrictions?: string[] | null
          handle?: string | null
          id: string
          is_creator?: boolean
          name?: string
          phone?: string | null
          push_token?: string | null
          taste_profile?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          cuisine_dislikes?: string[] | null
          dietary_restrictions?: string[] | null
          handle?: string | null
          id?: string
          is_creator?: boolean
          name?: string
          phone?: string | null
          push_token?: string | null
          taste_profile?: string | null
        }
        Relationships: []
      }
      visit_dishes: {
        Row: {
          created_at: string
          highlighted: boolean
          id: string
          name: string | null
          position: number
          visit_id: string
        }
        Insert: {
          created_at?: string
          highlighted?: boolean
          id?: string
          name?: string | null
          position?: number
          visit_id: string
        }
        Update: {
          created_at?: string
          highlighted?: boolean
          id?: string
          name?: string | null
          position?: number
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_dishes_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_photos: {
        Row: {
          created_at: string
          dish_id: string | null
          id: string
          photo_url: string
          type: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          dish_id?: string | null
          id?: string
          photo_url: string
          type: string
          visit_id: string
        }
        Update: {
          created_at?: string
          dish_id?: string | null
          id?: string
          photo_url?: string
          type?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_photos_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "visit_dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_tags: {
        Row: {
          completed_at: string | null
          id: string
          notified_at: string | null
          tagged_user_id: string
          visit_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          notified_at?: string | null
          tagged_user_id: string
          visit_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          notified_at?: string | null
          tagged_user_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_tags_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          created_at: string
          id: string
          note: string | null
          rank_position: number | null
          rank_score: number | null
          restaurant_id: string
          sentiment: string | null
          source_visit_id: string | null
          spend_per_person: string | null
          user_id: string
          visibility: string
          visited_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          rank_position?: number | null
          rank_score?: number | null
          restaurant_id: string
          sentiment?: string | null
          source_visit_id?: string | null
          spend_per_person?: string | null
          user_id: string
          visibility?: string
          visited_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          rank_position?: number | null
          rank_score?: number | null
          restaurant_id?: string
          sentiment?: string | null
          source_visit_id?: string | null
          spend_per_person?: string | null
          user_id?: string
          visibility?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_source_visit_id_fkey"
            columns: ["source_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
