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
      donors: {
        Row: {
          blood_type: Database["public"]["Enums"]["blood_type"]
          city: string
          created_at: string
          id: string
          is_available: boolean
          is_rare: boolean
          last_donation_date: string | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blood_type: Database["public"]["Enums"]["blood_type"]
          city: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_rare?: boolean
          last_donation_date?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blood_type?: Database["public"]["Enums"]["blood_type"]
          city?: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_rare?: boolean
          last_donation_date?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          blood_type_needed: Database["public"]["Enums"]["blood_type"]
          contact_phone: string | null
          created_at: string
          hospital_location: string
          hospital_name: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          patient_name: string
          requester_user_id: string | null
          search_radius_km: number
          status: Database["public"]["Enums"]["request_status"]
          units_needed: number
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          blood_type_needed: Database["public"]["Enums"]["blood_type"]
          contact_phone?: string | null
          created_at?: string
          hospital_location: string
          hospital_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          patient_name: string
          requester_user_id?: string | null
          search_radius_km?: number
          status?: Database["public"]["Enums"]["request_status"]
          units_needed?: number
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          blood_type_needed?: Database["public"]["Enums"]["blood_type"]
          contact_phone?: string | null
          created_at?: string
          hospital_location?: string
          hospital_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          patient_name?: string
          requester_user_id?: string | null
          search_radius_km?: number
          status?: Database["public"]["Enums"]["request_status"]
          units_needed?: number
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: []
      }
      request_matches: {
        Row: {
          created_at: string
          distance_km: number | null
          donor_id: string
          donor_user_id: string
          id: string
          notified_at: string
          request_id: string
          responded_at: string | null
          response: Database["public"]["Enums"]["match_response"]
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          donor_id: string
          donor_user_id: string
          id?: string
          notified_at?: string
          request_id: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["match_response"]
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          donor_id?: string
          donor_user_id?: string
          id?: string
          notified_at?: string
          request_id?: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["match_response"]
        }
        Relationships: [
          {
            foreignKeyName: "request_matches_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "donor"
      blood_type:
        | "A+"
        | "A-"
        | "B+"
        | "B-"
        | "AB+"
        | "AB-"
        | "O+"
        | "O-"
        | "Bombay"
      match_response: "pending" | "accepted" | "declined"
      request_status: "pending" | "matched" | "completed" | "cancelled"
      urgency_level: "critical" | "urgent" | "normal"
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
      app_role: ["admin", "donor"],
      blood_type: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Bombay"],
      match_response: ["pending", "accepted", "declined"],
      request_status: ["pending", "matched", "completed", "cancelled"],
      urgency_level: ["critical", "urgent", "normal"],
    },
  },
} as const
