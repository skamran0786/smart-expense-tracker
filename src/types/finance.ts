export type TransactionKind = "income" | "expense";

export type Transaction = {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  kind: TransactionKind;
};

export type Budget = {
  id: string;
  name: string;
  categories: string[];
  limit: number;
  color: "violet" | "green" | "orange";
};

export type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  color: "violet" | "green" | "orange";
  targetDate?: string;
};

export type FinanceData = {
  schemaVersion: 1;
  openingBalance: number;
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
};
