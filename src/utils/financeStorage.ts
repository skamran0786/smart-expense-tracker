import type { Budget, FinanceData, SavingsGoal, Transaction } from "../types/finance";

export const FINANCE_STORAGE_KEY = "smart-expense-tracker:data:v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type FinanceLoadResult = {
  data: FinanceData;
  status: "demo" | "loaded" | "recovered" | "unavailable";
  message?: string;
};

export type FinanceSaveResult =
  | { ok: true }
  | { ok: false; message: string };

type DemoTransaction = Omit<Transaction, "id" | "date"> & {
  name: string;
  day: number;
};

const demoTransactions: DemoTransaction[] = [
  { name: "Salary deposit", category: "Income", amount: 85000, kind: "income", day: 1 },
  { name: "BigBasket", category: "Groceries", amount: 1842, kind: "expense", day: 3 },
  { name: "Blue Tokai Coffee", category: "Food & drink", amount: 540, kind: "expense", day: 5 },
  { name: "Uber", category: "Transport", amount: 385, kind: "expense", day: 7 },
  { name: "Netflix", category: "Entertainment", amount: 649, kind: "expense", day: 9 },
];

export function createDemoFinanceData(now = new Date()): FinanceData {
  const transactions = Array.from({ length: 6 }, (_, monthOffset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - monthOffset), 1, 12);
    return demoTransactions.map((sample, index) => {
      const transactionDate = new Date(date.getFullYear(), date.getMonth(), sample.day, 12);
      return {
        id: `demo-${monthOffset}-${index}`,
        name: sample.name,
        category: sample.category,
        date: toDateKey(transactionDate),
        amount: sample.amount,
        kind: sample.kind,
      } satisfies Transaction;
    });
  }).flat();

  return {
    schemaVersion: 1,
    openingBalance: 150000,
    transactions,
    budgets: [
      {
        id: "food",
        name: "Food & drink",
        categories: ["Food & drink"],
        limit: 4000,
        color: "violet",
      },
      {
        id: "groceries",
        name: "Groceries",
        categories: ["Groceries"],
        limit: 8000,
        color: "violet",
      },
      {
        id: "transport",
        name: "Transport",
        categories: ["Transport"],
        limit: 8000,
        color: "green",
      },
      {
        id: "shopping",
        name: "Shopping",
        categories: ["Shopping"],
        limit: 5000,
        color: "orange",
      },
    ],
    savingsGoals: [
      { id: "emergency-fund", name: "Emergency fund", target: 100000, saved: 65000, color: "violet" },
      { id: "goa-trip", name: "Goa trip", target: 40000, saved: 26000, color: "green" },
      { id: "new-laptop", name: "New laptop", target: 80000, saved: 32000, color: "orange" },
    ],
  };
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isOptionalDateKey(value: unknown): boolean {
  return value === undefined || isDateKey(value);
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.category) &&
    isDateKey(value.date) &&
    isFiniteNonNegative(value.amount) &&
    value.amount > 0 &&
    (value.kind === "income" || value.kind === "expense")
  );
}

function isBudget(value: unknown): value is Budget {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    Array.isArray(value.categories) &&
    value.categories.length > 0 &&
    value.categories.every(isNonEmptyString) &&
    isFiniteNonNegative(value.limit) &&
    value.limit > 0 &&
    (value.color === "violet" || value.color === "green" || value.color === "orange")
  );
}

function isSavingsGoal(value: unknown): value is SavingsGoal {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isFiniteNonNegative(value.target) &&
    value.target > 0 &&
    isFiniteNonNegative(value.saved) &&
    isOptionalDateKey(value.targetDate) &&
    (value.color === "violet" || value.color === "green" || value.color === "orange")
  );
}

function isFinanceData(value: unknown): value is FinanceData {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 1 &&
    isFiniteNonNegative(value.openingBalance) &&
    Array.isArray(value.transactions) &&
    value.transactions.every(isTransaction) &&
    Array.isArray(value.budgets) &&
    value.budgets.every(isBudget) &&
    Array.isArray(value.savingsGoals) &&
    value.savingsGoals.every(isSavingsGoal)
  );
}

function getBrowserStorage(): StorageLike {
  if (typeof window === "undefined") {
    throw new Error("Browser storage is only available in a browser.");
  }
  return window.localStorage;
}

export function loadFinanceData(storage?: StorageLike): FinanceLoadResult {
  let browserStorage: StorageLike;
  try {
    browserStorage = storage ?? getBrowserStorage();
    const rawData = browserStorage.getItem(FINANCE_STORAGE_KEY);
    if (rawData === null) {
      return { data: createDemoFinanceData(), status: "demo" };
    }

    const parsed: unknown = JSON.parse(rawData);
    if (!isFinanceData(parsed)) {
      return {
        data: createDemoFinanceData(),
        status: "recovered",
        message: "Saved data was incomplete or invalid. Demo data was loaded instead.",
      };
    }

    return { data: parsed, status: "loaded" };
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "Saved data could not be read. Demo data was loaded instead."
        : error instanceof Error
          ? `Browser storage is unavailable: ${error.message}`
          : "Browser storage is unavailable.";
    return {
      data: createDemoFinanceData(),
      status: error instanceof SyntaxError ? "recovered" : "unavailable",
      message,
    };
  }
}

export function saveFinanceData(
  data: FinanceData,
  storage?: StorageLike,
): FinanceSaveResult {
  try {
    const browserStorage = storage ?? getBrowserStorage();
    browserStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? `Your changes could not be saved in this browser: ${error.message}`
        : "Your changes could not be saved in this browser.";
    return { ok: false, message };
  }
}
