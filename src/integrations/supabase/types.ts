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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcement_recipients: {
        Row: {
          announcement_id: string
          musician_id: string
        }
        Insert: {
          announcement_id: string
          musician_id: string
        }
        Update: {
          announcement_id?: string
          musician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_recipients_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "musicians"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          enviado_por: string | null
          id: string
          mensagem: string
          publico: string
          titulo: string
          total_destinatarios: number
          total_entregues: number
          url: string | null
        }
        Insert: {
          created_at?: string
          enviado_por?: string | null
          id?: string
          mensagem: string
          publico: string
          titulo: string
          total_destinatarios?: number
          total_entregues?: number
          url?: string | null
        }
        Update: {
          created_at?: string
          enviado_por?: string | null
          id?: string
          mensagem?: string
          publico?: string
          titulo?: string
          total_destinatarios?: number
          total_entregues?: number
          url?: string | null
        }
        Relationships: []
      }
      block_songs: {
        Row: {
          block_id: string
          id: string
          position: number
          song_id: string
        }
        Insert: {
          block_id: string
          id?: string
          position?: number
          song_id: string
        }
        Update: {
          block_id?: string
          id?: string
          position?: number
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_songs_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          created_at: string
          duracao: string | null
          id: string
          nome: string
          observacoes: string | null
          vs_path: string | null
        }
        Insert: {
          created_at?: string
          duracao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          vs_path?: string | null
        }
        Update: {
          created_at?: string
          duracao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          vs_path?: string | null
        }
        Relationships: []
      }
      live_videos: {
        Row: {
          created_at: string
          data_show: string | null
          id: string
          titulo: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          data_show?: string | null
          id?: string
          titulo: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          data_show?: string | null
          id?: string
          titulo?: string
          youtube_url?: string
        }
        Relationships: []
      }
      musicians: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          instrumento: string
          nome: string
          tipo: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          instrumento?: string
          nome: string
          tipo?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          instrumento?: string
          nome?: string
          tipo?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rehearsal_attendance: {
        Row: {
          id: string
          musician_id: string
          rehearsal_id: string
          status: string
        }
        Insert: {
          id?: string
          musician_id: string
          rehearsal_id: string
          status?: string
        }
        Update: {
          id?: string
          musician_id?: string
          rehearsal_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehearsal_attendance_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "musicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehearsal_attendance_rehearsal_id_fkey"
            columns: ["rehearsal_id"]
            isOneToOne: false
            referencedRelation: "rehearsals"
            referencedColumns: ["id"]
          },
        ]
      }
      rehearsals: {
        Row: {
          data: string
          horario: string | null
          id: string
          local: string | null
          observacoes: string | null
          show_id: string
        }
        Insert: {
          data: string
          horario?: string | null
          id?: string
          local?: string | null
          observacoes?: string | null
          show_id: string
        }
        Update: {
          data?: string
          horario?: string | null
          id?: string
          local?: string | null
          observacoes?: string | null
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehearsals_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_items: {
        Row: {
          block_id: string | null
          id: string
          position: number
          show_id: string
          song_id: string | null
        }
        Insert: {
          block_id?: string | null
          id?: string
          position?: number
          show_id: string
          song_id?: string | null
        }
        Update: {
          block_id?: string | null
          id?: string
          position?: number
          show_id?: string
          song_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setlist_items_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      show_lineup: {
        Row: {
          id: string
          musician_id: string
          show_id: string
          status: string
        }
        Insert: {
          id?: string
          musician_id: string
          show_id: string
          status?: string
        }
        Update: {
          id?: string
          musician_id?: string
          show_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_lineup_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "musicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_lineup_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          created_at: string
          data: string
          duracao: string | null
          endereco: string | null
          horario_palco: string | null
          horario_passagem: string | null
          horario_saida: string | null
          id: string
          local: string | null
          nome: string
          observacoes: string | null
          traje: string | null
        }
        Insert: {
          created_at?: string
          data: string
          duracao?: string | null
          endereco?: string | null
          horario_palco?: string | null
          horario_passagem?: string | null
          horario_saida?: string | null
          id?: string
          local?: string | null
          nome: string
          observacoes?: string | null
          traje?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          duracao?: string | null
          endereco?: string | null
          horario_palco?: string | null
          horario_passagem?: string | null
          horario_saida?: string | null
          id?: string
          local?: string | null
          nome?: string
          observacoes?: string | null
          traje?: string | null
        }
        Relationships: []
      }
      songs: {
        Row: {
          artista: string | null
          bpm: number | null
          created_at: string
          id: string
          observacoes: string | null
          titulo: string
          tom: string | null
          youtube_url: string | null
        }
        Insert: {
          artista?: string | null
          bpm?: number | null
          created_at?: string
          id?: string
          observacoes?: string | null
          titulo: string
          tom?: string | null
          youtube_url?: string | null
        }
        Update: {
          artista?: string | null
          bpm?: number | null
          created_at?: string
          id?: string
          observacoes?: string | null
          titulo?: string
          tom?: string | null
          youtube_url?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_marks: {
        Row: {
          id: string
          segundos: number
          song_id: string
          video_id: string
        }
        Insert: {
          id?: string
          segundos?: number
          song_id: string
          video_id: string
        }
        Update: {
          id?: string
          segundos?: number
          song_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_marks_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_marks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "live_videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_block: { Args: { _block: string }; Returns: boolean }
      can_see_musician: { Args: { _m: string }; Returns: boolean }
      can_see_show: { Args: { _show: string }; Returns: boolean }
      can_see_song: { Args: { _song: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_announcement_recipient: { Args: { _a: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      my_musician_id: { Args: never; Returns: string }
      responder_ensaio: {
        Args: { _att: string; _status: string }
        Returns: undefined
      }
      responder_show: {
        Args: { _lineup: string; _status: string }
        Returns: undefined
      }
      sync_musician_role: {
        Args: { _m: Database["public"]["Tables"]["musicians"]["Row"] }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "fixo" | "freela"
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
      app_role: ["admin", "fixo", "freela"],
    },
  },
} as const
