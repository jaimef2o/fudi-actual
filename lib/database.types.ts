export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          handle: string | null;
          phone: string | null;
          avatar_url: string | null;
          city: string | null;
          bio: string | null;
          cuisine_dislikes: string[] | null;
          dietary_restrictions: string[] | null;
          is_creator: boolean;
          taste_profile: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          handle?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          bio?: string | null;
          cuisine_dislikes?: string[] | null;
          dietary_restrictions?: string[] | null;
          is_creator?: boolean;
          taste_profile?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          handle?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          bio?: string | null;
          cuisine_dislikes?: string[] | null;
          dietary_restrictions?: string[] | null;
          taste_profile?: string | null;
        };
      };
      relationships: {
        Row: {
          user_id: string;
          target_id: string;
          type: 'mutual' | 'following';
          affinity_score: number | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          target_id: string;
          type: 'mutual' | 'following';
          affinity_score?: number | null;
          created_at?: string;
        };
        Update: {
          type?: 'mutual' | 'following';
          affinity_score?: number | null;
        };
      };
      restaurants: {
        Row: {
          id: string;
          google_place_id: string | null;
          name: string;
          address: string | null;
          neighborhood: string | null;
          city: string | null;
          lat: number | null;
          lng: number | null;
          cuisine: string | null;
          price_level: number | null;
          cover_image_url: string | null;
        };
        Insert: {
          id?: string;
          google_place_id?: string | null;
          name: string;
          address?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          lat?: number | null;
          lng?: number | null;
          cuisine?: string | null;
          price_level?: number | null;
          cover_image_url?: string | null;
        };
        Update: {
          name?: string;
          address?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          cuisine?: string | null;
          price_level?: number | null;
          cover_image_url?: string | null;
        };
      };
      visits: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string;
          visited_at: string;
          sentiment: 'loved' | 'fine' | 'disliked' | null;
          rank_position: number | null;
          rank_score: number | null;
          note: string | null;
          visibility: 'friends' | 'groups' | 'private';
          source_visit_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          restaurant_id: string;
          visited_at?: string;
          sentiment?: 'loved' | 'fine' | 'disliked' | null;
          rank_position?: number | null;
          rank_score?: number | null;
          note?: string | null;
          visibility?: 'friends' | 'groups' | 'private';
          source_visit_id?: string | null;
          created_at?: string;
        };
        Update: {
          sentiment?: 'loved' | 'fine' | 'disliked' | null;
          rank_position?: number | null;
          rank_score?: number | null;
          note?: string | null;
          visibility?: 'friends' | 'groups' | 'private';
        };
      };
      visit_dishes: {
        Row: {
          id: string;
          visit_id: string;
          dish_name: string;
          rank_position: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          dish_name: string;
          rank_position?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          dish_name?: string;
          rank_position?: number | null;
          note?: string | null;
        };
      };
      visit_photos: {
        Row: {
          id: string;
          visit_id: string;
          dish_id: string | null;
          photo_url: string;
          type: 'restaurant' | 'dish';
          created_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          dish_id?: string | null;
          photo_url: string;
          type: 'restaurant' | 'dish';
          created_at?: string;
        };
        Update: {
          photo_url?: string;
        };
      };
      visit_tags: {
        Row: {
          id: string;
          visit_id: string;
          tagged_user_id: string;
          notified_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          visit_id: string;
          tagged_user_id: string;
          notified_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          notified_at?: string | null;
          completed_at?: string | null;
        };
      };
      reactions: {
        Row: {
          id: string;
          visit_id: string;
          user_id: string;
          emoji: 'hungry' | 'fire';
          created_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          user_id: string;
          emoji: 'hungry' | 'fire';
          created_at?: string;
        };
        Update: never;
      };
      lists: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          type: 'been' | 'want' | 'shared';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          type: 'been' | 'want' | 'shared';
          created_at?: string;
        };
        Update: {
          name?: string | null;
          type?: 'been' | 'want' | 'shared';
        };
      };
      list_items: {
        Row: {
          id: string;
          list_id: string;
          restaurant_id: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          restaurant_id: string;
          added_at?: string;
        };
        Update: never;
      };
      invitations: {
        Row: {
          id: string;
          inviter_user_id: string;
          token: string;
          claimed_by_user_id: string | null;
          created_at: string;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          inviter_user_id: string;
          token: string;
          claimed_by_user_id?: string | null;
          created_at?: string;
          claimed_at?: string | null;
        };
        Update: {
          claimed_by_user_id?: string | null;
          claimed_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Convenience row types
export type UserRow = Database['public']['Tables']['users']['Row'];
export type VisitRow = Database['public']['Tables']['visits']['Row'];
export type RestaurantRow = Database['public']['Tables']['restaurants']['Row'];
export type VisitDishRow = Database['public']['Tables']['visit_dishes']['Row'];
export type VisitPhotoRow = Database['public']['Tables']['visit_photos']['Row'];
export type RelationshipRow = Database['public']['Tables']['relationships']['Row'];
export type ReactionRow = Database['public']['Tables']['reactions']['Row'];
export type ListRow = Database['public']['Tables']['lists']['Row'];
