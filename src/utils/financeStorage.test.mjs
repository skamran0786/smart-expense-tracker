import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoFinanceData,
  FINANCE_STORAGE_KEY,
  loadFinanceData,
  saveFinanceData,
} from "./financeStorage.ts";

function createMemoryStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem(key) {
      return key === FINANCE_STORAGE_KEY ? value : null;
    },
    setItem(key, nextValue) {
      if (key === FINANCE_STORAGE_KEY) value = nextValue;
    },
  };
}

test("saved data survives a simulated page refresh", () => {
  const storage = createMemoryStorage();
  const data = createDemoFinanceData(new Date(2026, 9, 15));
  data.transactions.push({
    id: "refresh-check",
    name: "Refresh check",
    category: "Shopping",
    date: "2026-10-15",
    amount: 2500,
    kind: "expense",
  });

  assert.deepEqual(saveFinanceData(data, storage), { ok: true });

  const refreshedPageData = loadFinanceData(storage);
  assert.equal(refreshedPageData.status, "loaded");
  assert.deepEqual(refreshedPageData.data, data);
});

test("invalid JSON recovers to safe demo data without throwing", () => {
  const storage = createMemoryStorage("{broken json");

  assert.doesNotThrow(() => {
    const result = loadFinanceData(storage);
    assert.equal(result.status, "recovered");
    assert.match(result.message, /Demo data was loaded/);
    assert.ok(result.data.transactions.length > 0);
    assert.ok(result.data.budgets.length > 0);
    assert.ok(result.data.savingsGoals.length > 0);
  });
});

test("invalid data structures recover to safe demo data", () => {
  const storage = createMemoryStorage(JSON.stringify({ schemaVersion: 1, transactions: [] }));
  const result = loadFinanceData(storage);

  assert.equal(result.status, "recovered");
  assert.ok(result.data.budgets.length > 0);
});
