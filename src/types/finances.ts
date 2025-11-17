// Financial transaction interface shared across the application
export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  tags?: string[] | null;
  account_id?: string | null;
  attachment_url?: string | null;
}

export type TransactionType = "income" | "expense";

export interface FinancialGoal {
  id: string;
  user_id: string;
  goal_type: string;
  target_value: number;
  period_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
