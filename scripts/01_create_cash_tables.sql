-- Create daily_entries table
CREATE TABLE daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cash_in DECIMAL(10, 2) NOT NULL,
  deposited DECIMAL(10, 2) NOT NULL,
  to_back_safe DECIMAL(10, 2) NOT NULL,
  actual_left_in_front DECIMAL(10, 2) NOT NULL,
  left_in_front DECIMAL(10, 2),
  difference DECIMAL(10, 2),
  discrepancy_reason TEXT,
  manually_approved BOOLEAN DEFAULT FALSE,
  approval_note TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create back_safe_withdrawals table
CREATE TABLE back_safe_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create back_safe_transactions table
CREATE TABLE back_safe_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  entry_id UUID REFERENCES daily_entries(id) ON DELETE SET NULL,
  withdrawal_id UUID REFERENCES back_safe_withdrawals(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create monthly_archives table
CREATE TABLE monthly_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  starting_front_safe DECIMAL(10, 2),
  starting_back_safe DECIMAL(10, 2),
  ending_front_safe DECIMAL(10, 2),
  ending_back_safe DECIMAL(10, 2),
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Create indexes for better query performance
CREATE INDEX idx_daily_entries_user_date ON daily_entries(user_id, date);
CREATE INDEX idx_back_safe_withdrawals_user_date ON back_safe_withdrawals(user_id, date);
CREATE INDEX idx_back_safe_transactions_user_date ON back_safe_transactions(user_id, date);
CREATE INDEX idx_monthly_archives_user_month ON monthly_archives(user_id, month);

-- Enable RLS (Row Level Security)
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE back_safe_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE back_safe_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_archives ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only view their own entries"
  ON daily_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries"
  ON daily_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
  ON daily_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
  ON daily_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only view their own withdrawals"
  ON back_safe_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawals"
  ON back_safe_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withdrawals"
  ON back_safe_withdrawals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own withdrawals"
  ON back_safe_withdrawals FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only view their own transactions"
  ON back_safe_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON back_safe_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only view their own archives"
  ON monthly_archives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own archives"
  ON monthly_archives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own archives"
  ON monthly_archives FOR UPDATE
  USING (auth.uid() = user_id);
