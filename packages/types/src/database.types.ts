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
      audit_events: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"];
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: unknown;
          payload: Json;
          user_agent: string | null;
        };
        Insert: {
          action: Database["public"]["Enums"]["audit_action"];
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: unknown;
          payload?: Json;
          user_agent?: string | null;
        };
        Update: {
          action?: Database["public"]["Enums"]["audit_action"];
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: unknown;
          payload?: Json;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      daily_menus: {
        Row: {
          created_at: string;
          id: string;
          is_available: boolean;
          menu_date: string;
          restaurant_id: string;
          sauce_id: string;
          stock_remaining: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_available?: boolean;
          menu_date?: string;
          restaurant_id: string;
          sauce_id: string;
          stock_remaining?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_available?: boolean;
          menu_date?: string;
          restaurant_id?: string;
          sauce_id?: string;
          stock_remaining?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "daily_menus_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_menus_sauce_id_fkey";
            columns: ["sauce_id"];
            isOneToOne: false;
            referencedRelation: "sauces";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_restaurant_stats: {
        Row: {
          extras_revenue_ugx: number;
          id: string;
          restaurant_id: string;
          stat_date: string;
          swipes_redeemed: number;
          unique_students: number;
        };
        Insert: {
          extras_revenue_ugx?: number;
          id?: string;
          restaurant_id: string;
          stat_date: string;
          swipes_redeemed?: number;
          unique_students?: number;
        };
        Update: {
          extras_revenue_ugx?: number;
          id?: string;
          restaurant_id?: string;
          stat_date?: string;
          swipes_redeemed?: number;
          unique_students?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_restaurant_stats_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_university_stats: {
        Row: {
          extras_volume_ugx: number;
          id: string;
          new_students: number;
          plan_collections_ugx: number;
          stat_date: string;
          swipe_liability_ugx: number;
          swipes_redeemed: number;
          topup_collections_ugx: number;
          university_id: string;
        };
        Insert: {
          extras_volume_ugx?: number;
          id?: string;
          new_students?: number;
          plan_collections_ugx?: number;
          stat_date: string;
          swipe_liability_ugx?: number;
          swipes_redeemed?: number;
          topup_collections_ugx?: number;
          university_id: string;
        };
        Update: {
          extras_volume_ugx?: number;
          id?: string;
          new_students?: number;
          plan_collections_ugx?: number;
          stat_date?: string;
          swipe_liability_ugx?: number;
          swipes_redeemed?: number;
          topup_collections_ugx?: number;
          university_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_university_stats_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      device_sessions: {
        Row: {
          created_at: string;
          device_fingerprint: string;
          id: string;
          last_seen_at: string;
          qr_generation_count: number;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          device_fingerprint: string;
          id?: string;
          last_seen_at?: string;
          qr_generation_count?: number;
          student_id: string;
        };
        Update: {
          created_at?: string;
          device_fingerprint?: string;
          id?: string;
          last_seen_at?: string;
          qr_generation_count?: number;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      extra_price_history: {
        Row: {
          changed_by: string | null;
          created_at: string;
          effective_from: string;
          extra_id: string;
          id: string;
          price_ugx: number;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          effective_from?: string;
          extra_id: string;
          id?: string;
          price_ugx: number;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          effective_from?: string;
          extra_id?: string;
          id?: string;
          price_ugx?: number;
        };
        Relationships: [
          {
            foreignKeyName: "extra_price_history_extra_id_fkey";
            columns: ["extra_id"];
            isOneToOne: false;
            referencedRelation: "extras";
            referencedColumns: ["id"];
          },
        ];
      };
      extras: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price_ugx: number;
          restaurant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          price_ugx: number;
          restaurant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_ugx?: number;
          restaurant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extras_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          description: string | null;
          enabled: boolean;
          feature_key: string;
          id: string;
          university_id: string | null;
        };
        Insert: {
          description?: string | null;
          enabled?: boolean;
          feature_key: string;
          id?: string;
          university_id?: string | null;
        };
        Update: {
          description?: string | null;
          enabled?: boolean;
          feature_key?: string;
          id?: string;
          university_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feature_flags_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      flutterwave_settlement_lines: {
        Row: {
          amount_ugx: number;
          created_at: string;
          currency: string;
          flutterwave_id: string | null;
          id: string;
          match_status: string;
          matched_payment_id: string | null;
          raw_data: Json;
          reconciliation_run_id: string | null;
          settlement_date: string;
          tx_ref: string | null;
        };
        Insert: {
          amount_ugx: number;
          created_at?: string;
          currency?: string;
          flutterwave_id?: string | null;
          id?: string;
          match_status?: string;
          matched_payment_id?: string | null;
          raw_data?: Json;
          reconciliation_run_id?: string | null;
          settlement_date: string;
          tx_ref?: string | null;
        };
        Update: {
          amount_ugx?: number;
          created_at?: string;
          currency?: string;
          flutterwave_id?: string | null;
          id?: string;
          match_status?: string;
          matched_payment_id?: string | null;
          raw_data?: Json;
          reconciliation_run_id?: string | null;
          settlement_date?: string;
          tx_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "flutterwave_settlement_lines_matched_payment_id_fkey";
            columns: ["matched_payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flutterwave_settlement_lines_reconciliation_run_id_fkey";
            columns: ["reconciliation_run_id"];
            isOneToOne: false;
            referencedRelation: "reconciliation_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      flutterwave_webhook_events: {
        Row: {
          error_message: string | null;
          event_type: string;
          flutterwave_id: string | null;
          id: string;
          payment_id: string | null;
          processed_at: string | null;
          processing_status: Database["public"]["Enums"]["webhook_processing_status"];
          raw_payload: Json;
          received_at: string;
          request_id: string | null;
          signature_valid: boolean;
          tx_ref: string;
        };
        Insert: {
          error_message?: string | null;
          event_type: string;
          flutterwave_id?: string | null;
          id?: string;
          payment_id?: string | null;
          processed_at?: string | null;
          processing_status?: Database["public"]["Enums"]["webhook_processing_status"];
          raw_payload: Json;
          received_at?: string;
          request_id?: string | null;
          signature_valid: boolean;
          tx_ref: string;
        };
        Update: {
          error_message?: string | null;
          event_type?: string;
          flutterwave_id?: string | null;
          id?: string;
          payment_id?: string | null;
          processed_at?: string | null;
          processing_status?: Database["public"]["Enums"]["webhook_processing_status"];
          raw_payload?: Json;
          received_at?: string;
          request_id?: string | null;
          signature_valid?: boolean;
          tx_ref?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flutterwave_webhook_events_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      fraud_alerts: {
        Row: {
          alert_type: string;
          assigned_to: string | null;
          created_at: string;
          details: Json;
          id: string;
          resolved_at: string | null;
          restaurant_id: string | null;
          severity: string;
          status: Database["public"]["Enums"]["fraud_alert_status"];
          student_id: string | null;
        };
        Insert: {
          alert_type: string;
          assigned_to?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          resolved_at?: string | null;
          restaurant_id?: string | null;
          severity?: string;
          status?: Database["public"]["Enums"]["fraud_alert_status"];
          student_id?: string | null;
        };
        Update: {
          alert_type?: string;
          assigned_to?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          resolved_at?: string | null;
          restaurant_id?: string | null;
          severity?: string;
          status?: Database["public"]["Enums"]["fraud_alert_status"];
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fraud_alerts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      included_foods: {
        Row: {
          id: string;
          is_active: boolean;
          name: string;
          restaurant_id: string;
        };
        Insert: {
          id?: string;
          is_active?: boolean;
          name: string;
          restaurant_id: string;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          name?: string;
          restaurant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "included_foods_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plans: {
        Row: {
          created_at: string;
          description: string | null;
          dining_plus_allocation_ugx: number;
          id: string;
          is_active: boolean;
          name: string;
          price_ugx: number;
          semester_id: string;
          sort_order: number;
          swipe_allocation: number;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          dining_plus_allocation_ugx?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          price_ugx: number;
          semester_id: string;
          sort_order?: number;
          swipe_allocation: number;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          dining_plus_allocation_ugx?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_ugx?: number;
          semester_id?: string;
          sort_order?: number;
          swipe_allocation?: number;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_plans_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_plans_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          channel: Database["public"]["Enums"]["notification_channel"];
          created_at: string;
          event_type: string;
          id: string;
          payload: Json;
          read_at: string | null;
          sent_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body: string;
          channel: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          event_type: string;
          id?: string;
          payload?: Json;
          read_at?: string | null;
          sent_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          channel?: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
          read_at?: string | null;
          sent_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_ugx: number;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          flutterwave_id: string | null;
          flutterwave_tx_ref: string;
          id: string;
          idempotency_key: string | null;
          meal_plan_id: string | null;
          metadata: Json;
          phone_number: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          reconciliation_status: string;
          status: Database["public"]["Enums"]["payment_status"];
          student_id: string;
          type: Database["public"]["Enums"]["payment_type"];
          updated_at: string;
        };
        Insert: {
          amount_ugx: number;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          flutterwave_id?: string | null;
          flutterwave_tx_ref: string;
          id?: string;
          idempotency_key?: string | null;
          meal_plan_id?: string | null;
          metadata?: Json;
          phone_number: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          reconciliation_status?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          student_id: string;
          type: Database["public"]["Enums"]["payment_type"];
          updated_at?: string;
        };
        Update: {
          amount_ugx?: number;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          flutterwave_id?: string | null;
          flutterwave_tx_ref?: string;
          id?: string;
          idempotency_key?: string | null;
          meal_plan_id?: string | null;
          metadata?: Json;
          phone_number?: string;
          provider?: Database["public"]["Enums"]["payment_provider"];
          reconciliation_status?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          student_id?: string;
          type?: Database["public"]["Enums"]["payment_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_line_items: {
        Row: {
          created_at: string;
          id: string;
          line_amount_ugx: number;
          payout_id: string;
          rate_source: string;
          restaurant_id: string;
          student_id: string;
          swipe_rate_ugx: number;
          transaction_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_amount_ugx?: number;
          payout_id: string;
          rate_source: string;
          restaurant_id: string;
          student_id: string;
          swipe_rate_ugx: number;
          transaction_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_amount_ugx?: number;
          payout_id?: string;
          rate_source?: string;
          restaurant_id?: string;
          student_id?: string;
          swipe_rate_ugx?: number;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payout_line_items_payout_id_fkey";
            columns: ["payout_id"];
            isOneToOne: false;
            referencedRelation: "payouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_line_items_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_line_items_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_line_items_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: true;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_rate_configs: {
        Row: {
          created_at: string;
          effective_from: string;
          id: string;
          payout_rate_ugx: number;
          restaurant_id: string;
          semester_id: string;
        };
        Insert: {
          created_at?: string;
          effective_from?: string;
          id?: string;
          payout_rate_ugx: number;
          restaurant_id: string;
          semester_id: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          id?: string;
          payout_rate_ugx?: number;
          restaurant_id?: string;
          semester_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payout_rate_configs_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_rate_configs_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          amount_due_ugx: number;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          id: string;
          locked_at: string | null;
          meals_redeemed: number;
          paid_at: string | null;
          payout_rate_ugx: number;
          period_end: string;
          period_start: string;
          rate_snapshot: Json;
          restaurant_id: string;
          semester_id: string;
          status: Database["public"]["Enums"]["payout_status"];
        };
        Insert: {
          amount_due_ugx: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          id?: string;
          locked_at?: string | null;
          meals_redeemed?: number;
          paid_at?: string | null;
          payout_rate_ugx: number;
          period_end: string;
          period_start: string;
          rate_snapshot?: Json;
          restaurant_id: string;
          semester_id: string;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Update: {
          amount_due_ugx?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          id?: string;
          locked_at?: string | null;
          meals_redeemed?: number;
          paid_at?: string | null;
          payout_rate_ugx?: number;
          period_end?: string;
          period_start?: string;
          rate_snapshot?: Json;
          restaurant_id?: string;
          semester_id?: string;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payouts_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
        ];
      };
      photo_approvals: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          reviewer_id: string | null;
          status: Database["public"]["Enums"]["photo_status"];
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          reviewer_id?: string | null;
          status: Database["public"]["Enums"]["photo_status"];
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          reviewer_id?: string | null;
          status?: Database["public"]["Enums"]["photo_status"];
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photo_approvals_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          default_timezone: string;
          global_daily_swipe_limit: number;
          global_redemption_cooldown_hours: number;
          id: string;
          pending_payment_ttl_min: number;
          qr_token_ttl_seconds: number;
          singleton: boolean;
          updated_at: string;
          validation_session_ttl_seconds: number;
          wallet_reconciliation_enabled: boolean;
        };
        Insert: {
          default_timezone?: string;
          global_daily_swipe_limit?: number;
          global_redemption_cooldown_hours?: number;
          id?: string;
          pending_payment_ttl_min?: number;
          qr_token_ttl_seconds?: number;
          singleton?: boolean;
          updated_at?: string;
          validation_session_ttl_seconds?: number;
          wallet_reconciliation_enabled?: boolean;
        };
        Update: {
          default_timezone?: string;
          global_daily_swipe_limit?: number;
          global_redemption_cooldown_hours?: number;
          id?: string;
          pending_payment_ttl_min?: number;
          qr_token_ttl_seconds?: number;
          singleton?: boolean;
          updated_at?: string;
          validation_session_ttl_seconds?: number;
          wallet_reconciliation_enabled?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          status: Database["public"]["Enums"]["user_status"];
          university_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          phone?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["user_status"];
          university_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["user_status"];
          university_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_tokens: {
        Row: {
          consumed_at: string | null;
          consumed_at_restaurant_id: string | null;
          consumed_by_staff_id: string | null;
          created_at: string;
          device_fingerprint: string | null;
          expires_at: string;
          id: string;
          issued_at: string;
          jti: string;
          student_id: string;
          token_hash: string;
        };
        Insert: {
          consumed_at?: string | null;
          consumed_at_restaurant_id?: string | null;
          consumed_by_staff_id?: string | null;
          created_at?: string;
          device_fingerprint?: string | null;
          expires_at: string;
          id?: string;
          issued_at?: string;
          jti: string;
          student_id: string;
          token_hash: string;
        };
        Update: {
          consumed_at?: string | null;
          consumed_at_restaurant_id?: string | null;
          consumed_by_staff_id?: string | null;
          created_at?: string;
          device_fingerprint?: string | null;
          expires_at?: string;
          id?: string;
          issued_at?: string;
          jti?: string;
          student_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_tokens_consumed_at_restaurant_id_fkey";
            columns: ["consumed_at_restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_tokens_consumed_by_staff_id_fkey";
            columns: ["consumed_by_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_tokens_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      reconciliation_runs: {
        Row: {
          completed_at: string | null;
          discrepancy_count: number;
          id: string;
          period_end: string | null;
          period_start: string | null;
          records_checked: number;
          run_type: Database["public"]["Enums"]["reconciliation_type"];
          started_at: string;
          started_by: string | null;
          status: Database["public"]["Enums"]["reconciliation_status"];
          summary: Json;
          university_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          discrepancy_count?: number;
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          records_checked?: number;
          run_type: Database["public"]["Enums"]["reconciliation_type"];
          started_at?: string;
          started_by?: string | null;
          status?: Database["public"]["Enums"]["reconciliation_status"];
          summary?: Json;
          university_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          discrepancy_count?: number;
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          records_checked?: number;
          run_type?: Database["public"]["Enums"]["reconciliation_type"];
          started_at?: string;
          started_by?: string | null;
          status?: Database["public"]["Enums"]["reconciliation_status"];
          summary?: Json;
          university_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reconciliation_runs_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          amount_ugx: number;
          created_at: string;
          id: string;
          issued_by: string;
          ledger_entry_id: string | null;
          payment_id: string | null;
          reason: string;
          student_id: string;
          transaction_id: string | null;
        };
        Insert: {
          amount_ugx: number;
          created_at?: string;
          id?: string;
          issued_by: string;
          ledger_entry_id?: string | null;
          payment_id?: string | null;
          reason: string;
          student_id: string;
          transaction_id?: string | null;
        };
        Update: {
          amount_ugx?: number;
          created_at?: string;
          id?: string;
          issued_by?: string;
          ledger_entry_id?: string | null;
          payment_id?: string | null;
          reason?: string;
          student_id?: string;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_ledger_entry_id_fkey";
            columns: ["ledger_entry_id"];
            isOneToOne: false;
            referencedRelation: "wallet_ledger_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_applications: {
        Row: {
          address: string;
          business_name: string;
          contact_email: string;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          description: string | null;
          id: string;
          notes: string | null;
          restaurant_id: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["restaurant_application_status"];
          university_id: string;
          updated_at: string;
        };
        Insert: {
          address: string;
          business_name: string;
          contact_email: string;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          notes?: string | null;
          restaurant_id?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["restaurant_application_status"];
          university_id: string;
          updated_at?: string;
        };
        Update: {
          address?: string;
          business_name?: string;
          contact_email?: string;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          notes?: string | null;
          restaurant_id?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["restaurant_application_status"];
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_applications_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurant_applications_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_locations: {
        Row: {
          address: string;
          created_at: string;
          id: string;
          is_primary: boolean;
          latitude: number;
          longitude: number;
          restaurant_id: string;
        };
        Insert: {
          address: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          latitude: number;
          longitude: number;
          restaurant_id: string;
        };
        Update: {
          address?: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          latitude?: number;
          longitude?: number;
          restaurant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_locations_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_payout_accounts: {
        Row: {
          account_name: string;
          account_number: string;
          account_type: string;
          created_at: string;
          id: string;
          is_verified: boolean;
          restaurant_id: string;
          updated_at: string;
        };
        Insert: {
          account_name: string;
          account_number: string;
          account_type: string;
          created_at?: string;
          id?: string;
          is_verified?: boolean;
          restaurant_id: string;
          updated_at?: string;
        };
        Update: {
          account_name?: string;
          account_number?: string;
          account_type?: string;
          created_at?: string;
          id?: string;
          is_verified?: boolean;
          restaurant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_payout_accounts_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: true;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_sauce_pricing: {
        Row: {
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          internal_cost_ugx: number;
          sauce_id: string;
        };
        Insert: {
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          internal_cost_ugx: number;
          sauce_id: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          internal_cost_ugx?: number;
          sauce_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_sauce_pricing_sauce_id_fkey";
            columns: ["sauce_id"];
            isOneToOne: false;
            referencedRelation: "sauces";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_tiers: {
        Row: {
          created_at: string;
          default_payout_rate_ugx: number;
          id: string;
          name: string;
          university_id: string;
        };
        Insert: {
          created_at?: string;
          default_payout_rate_ugx: number;
          id?: string;
          name: string;
          university_id: string;
        };
        Update: {
          created_at?: string;
          default_payout_rate_ugx?: number;
          id?: string;
          name?: string;
          university_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_tiers_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurants: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          operating_hours: Json;
          slug: string;
          status: Database["public"]["Enums"]["restaurant_status"];
          tier_id: string;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          operating_hours?: Json;
          slug: string;
          status?: Database["public"]["Enums"]["restaurant_status"];
          tier_id: string;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          operating_hours?: Json;
          slug?: string;
          status?: Database["public"]["Enums"]["restaurant_status"];
          tier_id?: string;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurants_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurants_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      sauces: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          restaurant_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          restaurant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          restaurant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sauces_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      semesters: {
        Row: {
          code: string;
          created_at: string;
          end_date: string;
          id: string;
          is_active: boolean;
          name: string;
          start_date: string;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          end_date: string;
          id?: string;
          is_active?: boolean;
          name: string;
          start_date: string;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          end_date?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          start_date?: string;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "semesters_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_accounts: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          restaurant_id: string;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          restaurant_id: string;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          restaurant_id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_accounts_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      student_plan_purchases: {
        Row: {
          created_at: string;
          dining_plus_granted_ugx: number;
          id: string;
          meal_plan_id: string;
          payment_id: string;
          plan_price_ugx: number;
          purchased_at: string;
          student_id: string;
          swipes_granted: number;
        };
        Insert: {
          created_at?: string;
          dining_plus_granted_ugx: number;
          id?: string;
          meal_plan_id: string;
          payment_id: string;
          plan_price_ugx: number;
          purchased_at?: string;
          student_id: string;
          swipes_granted: number;
        };
        Update: {
          created_at?: string;
          dining_plus_granted_ugx?: number;
          id?: string;
          meal_plan_id?: string;
          payment_id?: string;
          plan_price_ugx?: number;
          purchased_at?: string;
          student_id?: string;
          swipes_granted?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fk_plan_purchase_payment";
            columns: ["payment_id"];
            isOneToOne: true;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_plan_purchases_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_plan_purchases_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      student_wallets: {
        Row: {
          created_at: string;
          dining_cash_balance_ugx: number;
          dining_plus_balance_ugx: number;
          id: string;
          latest_plan_purchase_id: string | null;
          semester_expires_at: string;
          semester_id: string;
          student_id: string;
          swipe_balance: number;
          updated_at: string;
          version: number;
          wallet_status: Database["public"]["Enums"]["wallet_status"];
        };
        Insert: {
          created_at?: string;
          dining_cash_balance_ugx?: number;
          dining_plus_balance_ugx?: number;
          id?: string;
          latest_plan_purchase_id?: string | null;
          semester_expires_at: string;
          semester_id: string;
          student_id: string;
          swipe_balance?: number;
          updated_at?: string;
          version?: number;
          wallet_status?: Database["public"]["Enums"]["wallet_status"];
        };
        Update: {
          created_at?: string;
          dining_cash_balance_ugx?: number;
          dining_plus_balance_ugx?: number;
          id?: string;
          latest_plan_purchase_id?: string | null;
          semester_expires_at?: string;
          semester_id?: string;
          student_id?: string;
          swipe_balance?: number;
          updated_at?: string;
          version?: number;
          wallet_status?: Database["public"]["Enums"]["wallet_status"];
        };
        Relationships: [
          {
            foreignKeyName: "fk_latest_plan_purchase";
            columns: ["latest_plan_purchase_id"];
            isOneToOne: false;
            referencedRelation: "student_plan_purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_wallets_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_wallets_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          account_status: Database["public"]["Enums"]["student_account_status"];
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          last_redemption_at: string | null;
          lunchlink_id: string;
          phone: string;
          photo_rejection_reason: string | null;
          photo_status: Database["public"]["Enums"]["photo_status"];
          photo_url: string | null;
          semester_id: string;
          sponsored: boolean;
          student_number: string;
          university_id: string;
          updated_at: string;
          user_id: string;
          verification_tier: string;
        };
        Insert: {
          account_status?: Database["public"]["Enums"]["student_account_status"];
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          last_redemption_at?: string | null;
          lunchlink_id: string;
          phone: string;
          photo_rejection_reason?: string | null;
          photo_status?: Database["public"]["Enums"]["photo_status"];
          photo_url?: string | null;
          semester_id: string;
          sponsored?: boolean;
          student_number: string;
          university_id: string;
          updated_at?: string;
          user_id: string;
          verification_tier?: string;
        };
        Update: {
          account_status?: Database["public"]["Enums"]["student_account_status"];
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          last_redemption_at?: string | null;
          lunchlink_id?: string;
          phone?: string;
          photo_rejection_reason?: string | null;
          photo_status?: Database["public"]["Enums"]["photo_status"];
          photo_url?: string | null;
          semester_id?: string;
          sponsored?: boolean;
          student_number?: string;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
          verification_tier?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_extras: {
        Row: {
          dining_cash_used_ugx: number;
          dining_plus_used_ugx: number;
          extra_id: string;
          id: string;
          quantity: number;
          total_price_ugx: number;
          transaction_id: string;
          unit_price_ugx: number;
        };
        Insert: {
          dining_cash_used_ugx?: number;
          dining_plus_used_ugx?: number;
          extra_id: string;
          id?: string;
          quantity: number;
          total_price_ugx: number;
          transaction_id: string;
          unit_price_ugx: number;
        };
        Update: {
          dining_cash_used_ugx?: number;
          dining_plus_used_ugx?: number;
          extra_id?: string;
          id?: string;
          quantity?: number;
          total_price_ugx?: number;
          transaction_id?: string;
          unit_price_ugx?: number;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_extras_extra_id_fkey";
            columns: ["extra_id"];
            isOneToOne: false;
            referencedRelation: "extras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_extras_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          created_at: string;
          dining_cash_delta_ugx: number;
          dining_plus_delta_ugx: number;
          excluded_from_payout: boolean;
          id: string;
          idempotency_key: string | null;
          metadata: Json;
          receipt_number: string | null;
          request_id: string | null;
          restaurant_id: string | null;
          sauce_id: string | null;
          staff_id: string | null;
          student_id: string;
          swipe_delta: number;
          type: Database["public"]["Enums"]["transaction_type"];
          university_id: string;
          voided_at: string | null;
        };
        Insert: {
          created_at?: string;
          dining_cash_delta_ugx?: number;
          dining_plus_delta_ugx?: number;
          excluded_from_payout?: boolean;
          id?: string;
          idempotency_key?: string | null;
          metadata?: Json;
          receipt_number?: string | null;
          request_id?: string | null;
          restaurant_id?: string | null;
          sauce_id?: string | null;
          staff_id?: string | null;
          student_id: string;
          swipe_delta?: number;
          type: Database["public"]["Enums"]["transaction_type"];
          university_id: string;
          voided_at?: string | null;
        };
        Update: {
          created_at?: string;
          dining_cash_delta_ugx?: number;
          dining_plus_delta_ugx?: number;
          excluded_from_payout?: boolean;
          id?: string;
          idempotency_key?: string | null;
          metadata?: Json;
          receipt_number?: string | null;
          request_id?: string | null;
          restaurant_id?: string | null;
          sauce_id?: string | null;
          staff_id?: string | null;
          student_id?: string;
          swipe_delta?: number;
          type?: Database["public"]["Enums"]["transaction_type"];
          university_id?: string;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_sauce_id_fkey";
            columns: ["sauce_id"];
            isOneToOne: false;
            referencedRelation: "sauces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      universities: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          settings: Json;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          settings?: Json;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          settings?: Json;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      university_settings: {
        Row: {
          daily_swipe_limit: number | null;
          default_swipe_rate_ugx: number;
          dining_cash_topup_max_ugx: number;
          dining_cash_topup_min_ugx: number;
          id: string;
          low_dining_plus_threshold_ugx: number;
          low_swipe_threshold: number;
          redemption_cooldown_hours: number | null;
          settings: Json;
          timezone: string;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          daily_swipe_limit?: number | null;
          default_swipe_rate_ugx: number;
          dining_cash_topup_max_ugx?: number;
          dining_cash_topup_min_ugx?: number;
          id?: string;
          low_dining_plus_threshold_ugx?: number;
          low_swipe_threshold?: number;
          redemption_cooldown_hours?: number | null;
          settings?: Json;
          timezone?: string;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          daily_swipe_limit?: number | null;
          default_swipe_rate_ugx?: number;
          dining_cash_topup_max_ugx?: number;
          dining_cash_topup_min_ugx?: number;
          id?: string;
          low_dining_plus_threshold_ugx?: number;
          low_swipe_threshold?: number;
          redemption_cooldown_hours?: number | null;
          settings?: Json;
          timezone?: string;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "university_settings_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: true;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      validation_sessions: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          qr_token_id: string;
          request_id: string | null;
          restaurant_id: string;
          staff_id: string;
          status: Database["public"]["Enums"]["validation_session_status"];
          student_id: string;
          transaction_id: string | null;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          qr_token_id: string;
          request_id?: string | null;
          restaurant_id: string;
          staff_id: string;
          status?: Database["public"]["Enums"]["validation_session_status"];
          student_id: string;
          transaction_id?: string | null;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          qr_token_id?: string;
          request_id?: string | null;
          restaurant_id?: string;
          staff_id?: string;
          status?: Database["public"]["Enums"]["validation_session_status"];
          student_id?: string;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "validation_sessions_qr_token_id_fkey";
            columns: ["qr_token_id"];
            isOneToOne: false;
            referencedRelation: "qr_tokens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "validation_sessions_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "validation_sessions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "validation_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "validation_sessions_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_adjustments: {
        Row: {
          approved_by: string | null;
          created_at: string;
          delta: number;
          id: string;
          ledger_entry_id: string | null;
          reason: string;
          requested_by: string;
          status: string;
          student_id: string;
          wallet_type: Database["public"]["Enums"]["wallet_type"];
        };
        Insert: {
          approved_by?: string | null;
          created_at?: string;
          delta: number;
          id?: string;
          ledger_entry_id?: string | null;
          reason: string;
          requested_by: string;
          status?: string;
          student_id: string;
          wallet_type: Database["public"]["Enums"]["wallet_type"];
        };
        Update: {
          approved_by?: string | null;
          created_at?: string;
          delta?: number;
          id?: string;
          ledger_entry_id?: string | null;
          reason?: string;
          requested_by?: string;
          status?: string;
          student_id?: string;
          wallet_type?: Database["public"]["Enums"]["wallet_type"];
        };
        Relationships: [
          {
            foreignKeyName: "wallet_adjustments_ledger_entry_id_fkey";
            columns: ["ledger_entry_id"];
            isOneToOne: false;
            referencedRelation: "wallet_ledger_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_adjustments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_ledger_entries: {
        Row: {
          balance_after: number;
          created_at: string;
          delta: number;
          id: string;
          metadata: Json;
          reason: Database["public"]["Enums"]["ledger_reason"];
          reference_id: string;
          reference_type: string;
          request_id: string | null;
          student_id: string;
          wallet_type: Database["public"]["Enums"]["wallet_type"];
        };
        Insert: {
          balance_after: number;
          created_at?: string;
          delta: number;
          id?: string;
          metadata?: Json;
          reason: Database["public"]["Enums"]["ledger_reason"];
          reference_id: string;
          reference_type: string;
          request_id?: string | null;
          student_id: string;
          wallet_type: Database["public"]["Enums"]["wallet_type"];
        };
        Update: {
          balance_after?: number;
          created_at?: string;
          delta?: number;
          id?: string;
          metadata?: Json;
          reason?: Database["public"]["Enums"]["ledger_reason"];
          reference_id?: string;
          reference_type?: string;
          request_id?: string | null;
          student_id?: string;
          wallet_type?: Database["public"]["Enums"]["wallet_type"];
        };
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_entries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_reconciliation_issues: {
        Row: {
          actual_value: number | null;
          created_at: string;
          details: Json;
          expected_value: number | null;
          id: string;
          issue_type: string;
          payment_id: string | null;
          reconciliation_run_id: string;
          resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          student_id: string | null;
        };
        Insert: {
          actual_value?: number | null;
          created_at?: string;
          details?: Json;
          expected_value?: number | null;
          id?: string;
          issue_type: string;
          payment_id?: string | null;
          reconciliation_run_id: string;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          student_id?: string | null;
        };
        Update: {
          actual_value?: number | null;
          created_at?: string;
          details?: Json;
          expected_value?: number | null;
          id?: string;
          issue_type?: string;
          payment_id?: string | null;
          reconciliation_run_id?: string;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_reconciliation_issues_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_reconciliation_issues_reconciliation_run_id_fkey";
            columns: ["reconciliation_run_id"];
            isOneToOne: false;
            referencedRelation: "reconciliation_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_reconciliation_issues_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_wallet_delta: {
        Args: {
          p_delta: number;
          p_metadata?: Json;
          p_reason: Database["public"]["Enums"]["ledger_reason"];
          p_reference_id: string;
          p_reference_type: string;
          p_request_id?: string;
          p_student_id: string;
          p_wallet_type: Database["public"]["Enums"]["wallet_type"];
        };
        Returns: {
          balance_after: number;
          created_at: string;
          delta: number;
          id: string;
          metadata: Json;
          reason: Database["public"]["Enums"]["ledger_reason"];
          reference_id: string;
          reference_type: string;
          request_id: string | null;
          student_id: string;
          wallet_type: Database["public"]["Enums"]["wallet_type"];
        };
        SetofOptions: {
          from: "*";
          to: "wallet_ledger_entries";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      check_redemption_eligibility: {
        Args: { p_student_id: string };
        Returns: {
          eligible: boolean;
          reason_code: string;
        }[];
      };
      current_restaurant_id: { Args: never; Returns: string };
      current_student_id: { Args: never; Returns: string };
      current_university_id: { Args: never; Returns: string };
      current_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      expire_semester_balances: {
        Args: { p_semester_id: string };
        Returns: number;
      };
      generate_receipt_number: { Args: { p_prefix: string }; Returns: string };
      is_admin_or_university_admin: { Args: never; Returns: boolean };
      resolve_swipe_rate: {
        Args: { p_restaurant_id: string; p_semester_id: string };
        Returns: {
          rate_source: string;
          rate_ugx: number;
        }[];
      };
    };
    Enums: {
      audit_action:
        | "login"
        | "qr_generated"
        | "qr_validated"
        | "meal_redeemed"
        | "payment_initiated"
        | "payment_completed"
        | "payment_failed"
        | "payment_expired"
        | "refund_issued"
        | "wallet_credited"
        | "wallet_debited"
        | "photo_approved"
        | "photo_rejected"
        | "semester_rolled"
        | "payout_generated"
        | "payout_approved"
        | "admin_action"
        | "reconciliation_run"
        | "fraud_alert_created";
      fraud_alert_status: "open" | "investigating" | "resolved" | "dismissed";
      ledger_reason:
        | "plan_purchase"
        | "credit_top_up"
        | "meal_redemption"
        | "extra_purchase"
        | "refund"
        | "semester_expiry"
        | "admin_adjustment"
        | "fraud_reversal";
      notification_channel: "email" | "sms" | "push";
      payment_provider: "mtn_momo" | "airtel_money";
      payment_status:
        | "pending"
        | "processing"
        | "success"
        | "failed"
        | "expired"
        | "refunded";
      payment_type: "meal_plan" | "dining_cash_top_up";
      payout_status: "draft" | "pending_approval" | "approved" | "paid" | "cancelled";
      photo_status: "pending" | "approved" | "rejected";
      reconciliation_status: "running" | "passed" | "failed" | "resolved";
      reconciliation_type:
        | "wallet_ledger"
        | "flutterwave_payments"
        | "flutterwave_settlement"
        | "payout_audit";
      restaurant_application_status:
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected";
      restaurant_status: "pending" | "active" | "inactive" | "suspended";
      student_account_status:
        | "registered"
        | "pending_verification"
        | "active"
        | "suspended";
      transaction_type:
        | "meal_redemption"
        | "extra_only"
        | "plan_purchase"
        | "credit_top_up"
        | "refund"
        | "void";
      user_role:
        | "student"
        | "restaurant_staff"
        | "restaurant_manager"
        | "admin"
        | "university_admin";
      user_status: "active" | "suspended" | "pending";
      validation_session_status: "active" | "consumed" | "expired";
      wallet_status: "active" | "frozen" | "closed";
      wallet_type: "swipe" | "dining_plus" | "dining_cash";
      webhook_processing_status:
        | "received"
        | "processed"
        | "ignored_duplicate"
        | "failed"
        | "manual_review";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      audit_action: [
        "login",
        "qr_generated",
        "qr_validated",
        "meal_redeemed",
        "payment_initiated",
        "payment_completed",
        "payment_failed",
        "payment_expired",
        "refund_issued",
        "wallet_credited",
        "wallet_debited",
        "photo_approved",
        "photo_rejected",
        "semester_rolled",
        "payout_generated",
        "payout_approved",
        "admin_action",
        "reconciliation_run",
        "fraud_alert_created",
      ],
      fraud_alert_status: ["open", "investigating", "resolved", "dismissed"],
      ledger_reason: [
        "plan_purchase",
        "credit_top_up",
        "meal_redemption",
        "extra_purchase",
        "refund",
        "semester_expiry",
        "admin_adjustment",
        "fraud_reversal",
      ],
      notification_channel: ["email", "sms", "push"],
      payment_provider: ["mtn_momo", "airtel_money"],
      payment_status: [
        "pending",
        "processing",
        "success",
        "failed",
        "expired",
        "refunded",
      ],
      payment_type: ["meal_plan", "dining_cash_top_up"],
      payout_status: ["draft", "pending_approval", "approved", "paid", "cancelled"],
      photo_status: ["pending", "approved", "rejected"],
      reconciliation_status: ["running", "passed", "failed", "resolved"],
      reconciliation_type: [
        "wallet_ledger",
        "flutterwave_payments",
        "flutterwave_settlement",
        "payout_audit",
      ],
      restaurant_application_status: [
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
      restaurant_status: ["pending", "active", "inactive", "suspended"],
      student_account_status: [
        "registered",
        "pending_verification",
        "active",
        "suspended",
      ],
      transaction_type: [
        "meal_redemption",
        "extra_only",
        "plan_purchase",
        "credit_top_up",
        "refund",
        "void",
      ],
      user_role: [
        "student",
        "restaurant_staff",
        "restaurant_manager",
        "admin",
        "university_admin",
      ],
      user_status: ["active", "suspended", "pending"],
      validation_session_status: ["active", "consumed", "expired"],
      wallet_status: ["active", "frozen", "closed"],
      wallet_type: ["swipe", "dining_plus", "dining_cash"],
      webhook_processing_status: [
        "received",
        "processed",
        "ignored_duplicate",
        "failed",
        "manual_review",
      ],
    },
  },
} as const;
