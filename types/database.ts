export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// M00 baseline type scaffold. Replace with generated Supabase types when CLI is configured.
export interface Database {
  pms: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          currency_code: string;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          currency_code?: string;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          currency_code?: string;
          timezone?: string;
          created_at?: string;
        };
      };
    };
  };
}
