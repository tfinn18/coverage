// Types for the Supabase schema in supabase/migrations.
// Hand-written in the same shape `supabase gen types typescript` produces; keep in sync with migrations.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ContactStage = "contacted" | "call_scheduled" | "called";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; created_at: string };
        Insert: { id: string; full_name?: string | null; created_at?: string };
        Update: { id?: string; full_name?: string | null; created_at?: string };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          company: string;
          name: string;
          title: string;
          stage: ContactStage;
          follow_up_date: string | null;
          notes: string;
          linkedin_url: string | null;
          email: string | null;
          is_example: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          company?: string;
          name?: string;
          title?: string;
          stage?: ContactStage;
          follow_up_date?: string | null;
          notes?: string;
          linkedin_url?: string | null;
          email?: string | null;
          is_example?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company?: string;
          name?: string;
          title?: string;
          stage?: ContactStage;
          follow_up_date?: string | null;
          notes?: string;
          linkedin_url?: string | null;
          email?: string | null;
          is_example?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_notes: {
        Row: { contact_id: string; user_id: string; doc: Json; created_at: string; updated_at: string };
        Insert: { contact_id: string; user_id?: string; doc?: Json; created_at?: string; updated_at?: string };
        Update: { contact_id?: string; user_id?: string; doc?: Json; created_at?: string; updated_at?: string };
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: true;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      calls: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          starts_at: string;
          duration_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          contact_id: string;
          starts_at: string;
          duration_minutes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          starts_at?: string;
          duration_minutes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calls_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
    };
    Enums: { contact_stage: ContactStage };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Call = Database["public"]["Tables"]["calls"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
