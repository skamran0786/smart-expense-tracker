import type { Budget, Transaction, TransactionKind } from "../types/finance";

export type MonthlyTotals = {
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
};

export type MonthlyTrendPoint = {
  monthKey: string;
  month: string;
  income: number;
  expenses: number;
};

export type CategorySpending = {
  category: string;
  amount: number;
};

export type BudgetStatus = "on-track" | "approaching" | "at-limit" | "exceeded";

export type BudgetProgress = {
  spent: number;
  remaining: number;
  percentage: number;
  progressPercentage: number;
  status: BudgetStatus;
};

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthTransactions(
  transactions: Transaction[],
  monthKey: string,
): Transaction[] {
  return transactions.filter((transaction) => transaction.date.slice(0, 7) === monthKey);
}

export function filterTransactions(
  transactions: Transaction[],
  monthKey: string,
  kind: TransactionKind | "all",
): Transaction[] {
  return getMonthTransactions(transactions, monthKey).filter(
    (transaction) => kind === "all" || transaction.kind === kind,
  );
}

export function getMonthlyTotals(transactions: Transaction[]): MonthlyTotals {
  const totals = transactions.reduce<MonthlyTotals>(
    (totals, transaction) => {
      if (transaction.kind === "income") totals.income += transaction.amount;
      else totals.expenses += transaction.amount;
      totals.transactionCount += 1;
      return totals;
    },
    { income: 0, expenses: 0, net: 0, transactionCount: 0 },
  );
  totals.net = totals.income - totals.expenses;
  return totals;
}

export function getMonthlyTrend(
  transactions: Transaction[],
  now: Date,
  monthCount = 6,
): MonthlyTrendPoint[] {
  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - monthCount + index + 1, 1);
    const monthKey = getMonthKey(date);
    const totals = getMonthlyTotals(getMonthTransactions(transactions, monthKey));
    return {
      monthKey,
      month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date),
      income: totals.income,
      expenses: totals.expenses,
    };
  });
}

export function getCategorySpending(transactions: Transaction[]): CategorySpending[] {
  const spending = new Map<string, number>();
  transactions.forEach((transaction) => {
    if (transaction.kind !== "expense") return;
    spending.set(
      transaction.category,
      (spending.get(transaction.category) ?? 0) + transaction.amount,
    );
  });
  return Array.from(spending, ([category, amount]) => ({ category, amount }));
}

export function getBudgetProgress(
  budget: Budget,
  transactions: Transaction[],
): BudgetProgress {
  const spent = transactions.reduce(
    (total, transaction) =>
      transaction.kind === "expense" && budget.categories.includes(transaction.category)
        ? total + transaction.amount
        : total,
    0,
  );
  const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  return {
    spent,
    remaining: Math.max(budget.limit - spent, 0),
    percentage,
    progressPercentage: Math.min(percentage, 100),
    status:
      percentage > 100
        ? "exceeded"
        : percentage >= 100
          ? "at-limit"
          : percentage >= 80
            ? "approaching"
            : "on-track",
  };
}

export function getMonthlyBudgetProgress(
  budget: Budget,
  transactions: Transaction[],
  monthKey: string,
): BudgetProgress {
  return getBudgetProgress(budget, getMonthTransactions(transactions, monthKey));
}

export function hasValidSavingsGoalAmounts(target: number, saved: number): boolean {
  return Number.isFinite(target) && target > 0 && Number.isFinite(saved) && saved >= 0;
}
