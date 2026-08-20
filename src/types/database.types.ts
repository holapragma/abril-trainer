export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      abril_trainer_attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          status: Database["public"]["Enums"]["abril_trainer_attendance_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          status: Database["public"]["Enums"]["abril_trainer_attendance_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["abril_trainer_attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abril_trainer_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_students"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_class_enrollments: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abril_trainer_class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_students"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_classes: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          duration_minutes: number
          id: string
          name: string
          start_time: string
          trainer_id: string
          weekday: number
        }
        Insert: {
          active?: boolean
          capacity?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          start_time: string
          trainer_id: string
          weekday: number
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          start_time?: string
          trainer_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_classes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_exercise_favorites: {
        Row: {
          created_at: string
          exercise_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_exercise_favorites_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abril_trainer_exercise_favorites_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_exercises: {
        Row: {
          created_at: string
          difficulty: string
          equipment: string
          id: string
          media_url: string | null
          name: string
          owner_id: string | null
          primary_muscle: string
          secondary_muscles: string[]
          steps: string[]
        }
        Insert: {
          created_at?: string
          difficulty?: string
          equipment?: string
          id: string
          media_url?: string | null
          name: string
          owner_id?: string | null
          primary_muscle: string
          secondary_muscles?: string[]
          steps?: string[]
        }
        Update: {
          created_at?: string
          difficulty?: string
          equipment?: string
          id?: string
          media_url?: string | null
          name?: string
          owner_id?: string | null
          primary_muscle?: string
          secondary_muscles?: string[]
          steps?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_exercises_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_memberships: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          plan_id: string
          price: number
          starts_on: string
          status: Database["public"]["Enums"]["abril_trainer_membership_status"]
          student_id: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          plan_id: string
          price: number
          starts_on?: string
          status?: Database["public"]["Enums"]["abril_trainer_membership_status"]
          student_id: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          plan_id?: string
          price?: number
          starts_on?: string
          status?: Database["public"]["Enums"]["abril_trainer_membership_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abril_trainer_memberships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_students"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string
          id: string
          membership_id: string | null
          method: string | null
          note: string | null
          paid_at: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          membership_id?: string | null
          method?: string | null
          note?: string | null
          paid_at?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          membership_id?: string | null
          method?: string | null
          note?: string | null
          paid_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abril_trainer_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_students"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          duration_weeks: number | null
          id: string
          modality: Database["public"]["Enums"]["abril_trainer_modality"] | null
          name: string
          price: number
          sessions_per_week: number | null
          trainer_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          modality?:
            | Database["public"]["Enums"]["abril_trainer_modality"]
            | null
          name: string
          price?: number
          sessions_per_week?: number | null
          trainer_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          modality?:
            | Database["public"]["Enums"]["abril_trainer_modality"]
            | null
          name?: string
          price?: number
          sessions_per_week?: number | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_plans_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_profiles: {
        Row: {
          business_name: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["abril_trainer_user_role"]
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["abril_trainer_user_role"]
        }
        Update: {
          business_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["abril_trainer_user_role"]
        }
        Relationships: []
      }
      abril_trainer_session_exercises: {
        Row: {
          exercise_id: string
          id: string
          load: string | null
          notes: string | null
          order_index: number
          reps: string | null
          rest_seconds: number | null
          session_id: string
          sets: number | null
          tempo: string | null
          time_seconds: number | null
        }
        Insert: {
          exercise_id: string
          id?: string
          load?: string | null
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          session_id: string
          sets?: number | null
          tempo?: string | null
          time_seconds?: number | null
        }
        Update: {
          exercise_id?: string
          id?: string
          load?: string | null
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          session_id?: string
          sets?: number | null
          tempo?: string | null
          time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abril_trainer_session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_students: {
        Row: {
          birthdate: string | null
          created_at: string
          email: string | null
          first_name: string
          goal: string | null
          id: string
          joined_at: string
          last_name: string
          modality: Database["public"]["Enums"]["abril_trainer_modality"]
          notes: string | null
          phone: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["abril_trainer_student_status"]
          trainer_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          goal?: string | null
          id?: string
          joined_at?: string
          last_name: string
          modality?: Database["public"]["Enums"]["abril_trainer_modality"]
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["abril_trainer_student_status"]
          trainer_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          goal?: string | null
          id?: string
          joined_at?: string
          last_name?: string
          modality?: Database["public"]["Enums"]["abril_trainer_modality"]
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["abril_trainer_student_status"]
          trainer_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_students_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_training_blocks: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          name: string
          starts_on: string
          status: Database["public"]["Enums"]["abril_trainer_block_status"]
          student_id: string
          total_weeks: number
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          name: string
          starts_on?: string
          status?: Database["public"]["Enums"]["abril_trainer_block_status"]
          student_id: string
          total_weeks?: number
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          name?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["abril_trainer_block_status"]
          student_id?: string
          total_weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_training_blocks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_students"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_training_sessions: {
        Row: {
          block_id: string
          day_label: string
          id: string
          name: string | null
          notes: string | null
          order_index: number
          week_number: number
        }
        Insert: {
          block_id: string
          day_label: string
          id?: string
          name?: string | null
          notes?: string | null
          order_index?: number
          week_number: number
        }
        Update: {
          block_id?: string
          day_label?: string
          id?: string
          name?: string | null
          notes?: string | null
          order_index?: number
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_training_sessions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_training_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      abril_trainer_workout_logs: {
        Row: {
          duration_seconds: number | null
          id: string
          notes: string | null
          payload: Json
          performed_at: string
          session_id: string | null
          student_id: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          payload?: Json
          performed_at?: string
          session_id?: string | null
          student_id: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          payload?: Json
          performed_at?: string
          session_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_workout_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abril_trainer_workout_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      abril_trainer_payments_with_status: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string | null
          membership_id: string | null
          method: string | null
          note: string | null
          paid_at: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string | null
          membership_id?: string | null
          method?: string | null
          note?: string | null
          paid_at?: string | null
          status?: never
          student_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string | null
          membership_id?: string | null
          method?: string | null
          note?: string | null
          paid_at?: string | null
          status?: never
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abril_trainer_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abril_trainer_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "abril_trainer_students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abril_trainer_app_today: { Args: never; Returns: string }
      abril_trainer_dashboard_summary: { Args: never; Returns: Json }
      abril_trainer_duplicate_week: {
        Args: { p_block_id: string; p_from_week: number; p_to_week?: number }
        Returns: number
      }
      abril_trainer_is_my_student_record: {
        Args: { sid: string }
        Returns: boolean
      }
      abril_trainer_owns_class: { Args: { cid: string }; Returns: boolean }
      abril_trainer_owns_student: { Args: { sid: string }; Returns: boolean }
      abril_trainer_owns_training_session: {
        Args: { tsid: string }
        Returns: boolean
      }
    }
    Enums: {
      abril_trainer_attendance_status: "presente" | "ausente" | "justificado"
      abril_trainer_block_status: "borrador" | "activo" | "terminado"
      abril_trainer_membership_status: "activa" | "pausada" | "finalizada"
      abril_trainer_modality: "presencial" | "virtual"
      abril_trainer_student_status: "activo" | "pausa" | "baja"
      abril_trainer_user_role: "trainer" | "student"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      abril_trainer_attendance_status: ["presente", "ausente", "justificado"],
      abril_trainer_block_status: ["borrador", "activo", "terminado"],
      abril_trainer_membership_status: ["activa", "pausada", "finalizada"],
      abril_trainer_modality: ["presencial", "virtual"],
      abril_trainer_student_status: ["activo", "pausa", "baja"],
      abril_trainer_user_role: ["trainer", "student"],
    },
  },
} as const

