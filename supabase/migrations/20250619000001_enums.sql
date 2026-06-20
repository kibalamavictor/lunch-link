-- 001_enums.sql — LunchLink domain enums (Technical Foundation v2)

CREATE TYPE user_role AS ENUM (
  'student',
  'restaurant_staff',
  'restaurant_manager',
  'admin',
  'university_admin'
);

CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');

CREATE TYPE photo_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE student_account_status AS ENUM (
  'registered',
  'pending_verification',
  'active',
  'suspended'
);

CREATE TYPE wallet_status AS ENUM ('active', 'frozen', 'closed');

CREATE TYPE restaurant_status AS ENUM (
  'pending',
  'active',
  'inactive',
  'suspended'
);

CREATE TYPE restaurant_application_status AS ENUM (
  'submitted',
  'under_review',
  'approved',
  'rejected'
);

CREATE TYPE wallet_type AS ENUM ('swipe', 'dining_plus', 'dining_cash');

CREATE TYPE ledger_reason AS ENUM (
  'plan_purchase',
  'credit_top_up',
  'meal_redemption',
  'extra_purchase',
  'refund',
  'semester_expiry',
  'admin_adjustment',
  'fraud_reversal'
);

CREATE TYPE transaction_type AS ENUM (
  'meal_redemption',
  'extra_only',
  'plan_purchase',
  'credit_top_up',
  'refund',
  'void'
);

CREATE TYPE payment_type AS ENUM ('meal_plan', 'dining_cash_top_up');

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'success',
  'failed',
  'expired',
  'refunded'
);

CREATE TYPE payment_provider AS ENUM ('mtn_momo', 'airtel_money');

CREATE TYPE payout_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'paid',
  'cancelled'
);

CREATE TYPE reconciliation_type AS ENUM (
  'wallet_ledger',
  'flutterwave_payments',
  'flutterwave_settlement',
  'payout_audit'
);

CREATE TYPE reconciliation_status AS ENUM (
  'running',
  'passed',
  'failed',
  'resolved'
);

CREATE TYPE webhook_processing_status AS ENUM (
  'received',
  'processed',
  'ignored_duplicate',
  'failed',
  'manual_review'
);

CREATE TYPE fraud_alert_status AS ENUM (
  'open',
  'investigating',
  'resolved',
  'dismissed'
);

CREATE TYPE validation_session_status AS ENUM (
  'active',
  'consumed',
  'expired'
);

CREATE TYPE audit_action AS ENUM (
  'login',
  'qr_generated',
  'qr_validated',
  'meal_redeemed',
  'payment_initiated',
  'payment_completed',
  'payment_failed',
  'payment_expired',
  'refund_issued',
  'wallet_credited',
  'wallet_debited',
  'photo_approved',
  'photo_rejected',
  'semester_rolled',
  'payout_generated',
  'payout_approved',
  'admin_action',
  'reconciliation_run',
  'fraud_alert_created'
);

CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push');
