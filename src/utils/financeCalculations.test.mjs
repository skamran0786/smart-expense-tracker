import assert from "node:assert/strict";
import test from "node:test";
import {
  filterTransactions,
  getMonthlyBudgetProgress,
  getMonthlyTotals,
  getMonthlyTrend,
  hasValidSavingsGoalAmounts,
} from "./financeCalculations.ts";

function transaction(id, date, amount, kind = "expense", category = "Food & drink") {
  return { id, name: id, date, amount, kind, category };
}

function budget(limit = 100) {
  return {
    id: "food-budget",
    name: "Food & drink",
    categories: ["Food & drink"],
    limit,
    color: "violet",
  };
}

test("month filtering handles year boundaries without mixing adjacent months", () => {
  const transactions = [
    transaction("december", "2024-12-31", 40),
    transaction("january", "2025-01-01", 60),
    transaction("february", "2025-02-01", 80),
  ];

  assert.deepEqual(
    filterTransactions(transactions, "2024-12", "all").map(({ id }) => id),
    ["december"],
  );
  assert.deepEqual(
    filterTransactions(transactions, "2025-01", "all").map(({ id }) => id),
    ["january"],
  );
  assert.deepEqual(
    filterTransactions(transactions, "2025-01", "expense").map(({ id }) => id),
    ["january"],
  );
});

test("monthly trend rolls from the previous year into January", () => {
  const transactions = [
    transaction("december-income", "2024-12-31", 1200, "income", "Income"),
    transaction("january-expense", "2025-01-01", 450),
  ];
  const trend = getMonthlyTrend(transactions, new Date(2025, 0, 15));

  assert.equal(trend.length, 6);
  assert.equal(trend[4].monthKey, "2024-12");
  assert.equal(trend[4].income, 1200);
  assert.equal(trend[5].monthKey, "2025-01");
  assert.equal(trend[5].expenses, 450);
});

test("empty transaction data returns zero monthly totals and an empty trend", () => {
  assert.deepEqual(getMonthlyTotals([]), {
    income: 0,
    expenses: 0,
    net: 0,
    transactionCount: 0,
  });
  assert.ok(getMonthlyTrend([], new Date(2025, 5, 1)).every(
    ({ income, expenses }) => income === 0 && expenses === 0,
  ));
});

test("budget threshold status is on track below 80%, warning at 80%, at limit at 100%, and exceeded above 100%", () => {
  const statusAt = (amount) =>
    getMonthlyBudgetProgress(
      budget(),
      [transaction("expense", "2025-06-10", amount)],
      "2025-06",
    ).status;

  assert.equal(statusAt(79.99), "on-track");
  assert.equal(statusAt(80), "approaching");
  assert.equal(statusAt(100), "at-limit");
  assert.equal(statusAt(100.01), "exceeded");
});

test("monthly budget counts only matching expenses from the selected month", () => {
  const result = getMonthlyBudgetProgress(
    budget(200),
    [
      transaction("in-month", "2025-06-12", 75),
      transaction("income", "2025-06-13", 900, "income", "Food & drink"),
      transaction("other-category", "2025-06-14", 60, "expense", "Transport"),
      transaction("other-month", "2025-07-01", 125),
    ],
    "2025-06",
  );

  assert.equal(result.spent, 75);
  assert.equal(result.remaining, 125);
  assert.equal(result.percentage, 37.5);
  assert.equal(result.status, "on-track");
});

test("savings goal amounts reject non-positive targets and negative or non-finite saved amounts", () => {
  assert.equal(hasValidSavingsGoalAmounts(1000, 0), true);
  assert.equal(hasValidSavingsGoalAmounts(1000, 500), true);
  assert.equal(hasValidSavingsGoalAmounts(0, 0), false);
  assert.equal(hasValidSavingsGoalAmounts(1000, -1), false);
  assert.equal(hasValidSavingsGoalAmounts(Number.POSITIVE_INFINITY, 0), false);
  assert.equal(hasValidSavingsGoalAmounts(1000, Number.NaN), false);
});
