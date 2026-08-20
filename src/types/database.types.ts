/**
 * Tipos de la base de datos.
 *
 * Escrito a mano para reflejar supabase/migrations/. En cuanto el proyecto de
 * Supabase esté en pie, se REGENERA y este archivo se reemplaza entero:
 *
 *     npm run db:types
 *
 * Nunca editar a mano una vez que se pueda generar: la base es la que manda.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Database['public']['Enums']['user_role']
          full_name: string
          photo_url: string | null
          phone: string | null
          business_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: Database['public']['Enums']['user_role']
          full_name: string
          photo_url?: string | null
          phone?: string | null
          business_name?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }

      students: {
        Row: {
          id: string
          trainer_id: string
          user_id: string | null
          first_name: string
          last_name: string
          photo_url: string | null
          phone: string | null
          email: string | null
          birthdate: string | null
          goal: string | null
          modality: Database['public']['Enums']['modality']
          status: Database['public']['Enums']['student_status']
          joined_at: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          user_id?: string | null
          first_name: string
          last_name: string
          photo_url?: string | null
          phone?: string | null
          email?: string | null
          birthdate?: string | null
          goal?: string | null
          modality?: Database['public']['Enums']['modality']
          status?: Database['public']['Enums']['student_status']
          joined_at?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['students']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'students_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      plans: {
        Row: {
          id: string
          trainer_id: string
          name: string
          description: string | null
          modality: Database['public']['Enums']['modality'] | null
          sessions_per_week: number | null
          price: number
          currency: string
          duration_weeks: number | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          name: string
          description?: string | null
          modality?: Database['public']['Enums']['modality'] | null
          sessions_per_week?: number | null
          price?: number
          currency?: string
          duration_weeks?: number | null
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'plans_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      memberships: {
        Row: {
          id: string
          student_id: string
          plan_id: string
          starts_on: string
          ends_on: string | null
          price: number
          status: Database['public']['Enums']['membership_status']
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          plan_id: string
          starts_on?: string
          ends_on?: string | null
          price: number
          status?: Database['public']['Enums']['membership_status']
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'memberships_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
        ]
      }

      payments: {
        Row: {
          id: string
          student_id: string
          membership_id: string | null
          amount: number
          currency: string
          due_date: string
          paid_at: string | null
          method: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          membership_id?: string | null
          amount: number
          currency?: string
          due_date: string
          paid_at?: string | null
          method?: string | null
          note?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'payments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_membership_id_fkey'
            columns: ['membership_id']
            isOneToOne: false
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
        ]
      }

      exercises: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          primary_muscle: string
          secondary_muscles: string[]
          equipment: string
          difficulty: string
          media_url: string | null
          steps: string[]
          created_at: string
        }
        Insert: {
          id: string
          owner_id?: string | null
          name: string
          primary_muscle: string
          secondary_muscles?: string[]
          equipment?: string
          difficulty?: string
          media_url?: string | null
          steps?: string[]
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['exercises']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'exercises_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      exercise_favorites: {
        Row: { trainer_id: string; exercise_id: string; created_at: string }
        Insert: { trainer_id: string; exercise_id: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['exercise_favorites']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'exercise_favorites_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_favorites_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }

      training_blocks: {
        Row: {
          id: string
          student_id: string
          name: string
          goal: string | null
          starts_on: string
          total_weeks: number
          status: Database['public']['Enums']['block_status']
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          name: string
          goal?: string | null
          starts_on?: string
          total_weeks?: number
          status?: Database['public']['Enums']['block_status']
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['training_blocks']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'training_blocks_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }

      training_sessions: {
        Row: {
          id: string
          block_id: string
          week_number: number
          day_label: string
          name: string | null
          order_index: number
          notes: string | null
        }
        Insert: {
          id?: string
          block_id: string
          week_number: number
          day_label: string
          name?: string | null
          order_index?: number
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['training_sessions']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'training_sessions_block_id_fkey'
            columns: ['block_id']
            isOneToOne: false
            referencedRelation: 'training_blocks'
            referencedColumns: ['id']
          },
        ]
      }

      session_exercises: {
        Row: {
          id: string
          session_id: string
          exercise_id: string
          order_index: number
          sets: number | null
          reps: string | null
          load: string | null
          time_seconds: number | null
          rest_seconds: number | null
          tempo: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id: string
          order_index?: number
          sets?: number | null
          reps?: string | null
          load?: string | null
          time_seconds?: number | null
          rest_seconds?: number | null
          tempo?: string | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['session_exercises']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'session_exercises_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'training_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }

      workout_logs: {
        Row: {
          id: string
          session_id: string | null
          student_id: string
          performed_at: string
          payload: Json
          duration_seconds: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          student_id: string
          performed_at?: string
          payload?: Json
          duration_seconds?: number | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['workout_logs']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'workout_logs_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'training_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_logs_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }

      classes: {
        Row: {
          id: string
          trainer_id: string
          name: string
          weekday: number
          start_time: string
          duration_minutes: number
          capacity: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          name: string
          weekday: number
          start_time: string
          duration_minutes?: number
          capacity?: number
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'classes_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      class_enrollments: {
        Row: { id: string; class_id: string; student_id: string; joined_at: string }
        Insert: { id?: string; class_id: string; student_id: string; joined_at?: string }
        Update: Partial<Database['public']['Tables']['class_enrollments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'class_enrollments_class_id_fkey'
            columns: ['class_id']
            isOneToOne: false
            referencedRelation: 'classes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_enrollments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }

      attendance: {
        Row: {
          id: string
          class_id: string
          student_id: string
          date: string
          status: Database['public']['Enums']['attendance_status']
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          student_id: string
          date: string
          status: Database['public']['Enums']['attendance_status']
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'attendance_class_id_fkey'
            columns: ['class_id']
            isOneToOne: false
            referencedRelation: 'classes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }
    }

    Views: {
      payments_with_status: {
        Row: Database['public']['Tables']['payments']['Row'] & {
          status: 'pagado' | 'pendiente' | 'vencido'
        }
        Relationships: []
      }
    }

    Functions: {
      duplicate_week: {
        Args: { p_block_id: string; p_from_week: number; p_to_week?: number | null }
        Returns: number
      }
      dashboard_summary: {
        Args: Record<string, never>
        Returns: Json
      }
    }

    Enums: {
      user_role: 'trainer' | 'student'
      modality: 'presencial' | 'virtual'
      student_status: 'activo' | 'pausa' | 'baja'
      membership_status: 'activa' | 'pausada' | 'finalizada'
      attendance_status: 'presente' | 'ausente' | 'justificado'
      block_status: 'borrador' | 'activo' | 'terminado'
    }

    CompositeTypes: Record<string, never>
  }
}

// ── Atajos ───────────────────────────────────────────────────────────────────

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type Insert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type Update<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
