import assert from "node:assert/strict";
import test from "node:test";
import {
  createTransactionsCsv,
  exportFinanceJson,
  exportTransactionsCsv,
} from "./exportData.ts";
import { createDemoFinanceData } from "./financeStorage.ts";

test("transaction CSV quotes commas, quotes, and line breaks", () => {
  const data = createDemoFinanceData(new Date(2026, 9, 15));
  data.transactions = [
    {
      id: "csv-check",
      name: 'Cafe, "North"\nBranch',
      category: "Food, drink",
      date: "2026-10-15",
      amount: 1250,
      kind: "expense",
    },
  ];

  const csv = createTransactionsCsv(data);
  assert.equal(
    csv,
    [
      '"Date","Description","Category","Type","Amount (INR)"',
      '"2026-10-15","Cafe, ""North""\nBranch","Food, drink","expense","1250"',
    ].join("\r\n"),
  );
});

test("transaction CSV neutralizes spreadsheet formula prefixes in text fields", () => {
  const data = createDemoFinanceData(new Date(2026, 9, 15));
  data.transactions = [
    {
      id: "formula-check",
      name: " =HYPERLINK(\"https://example.invalid\",\"click\")",
      category: "+SUM(1,1)",
      date: "2026-10-15",
      amount: 1250,
      kind: "expense",
    },
  ];

  const csv = createTransactionsCsv(data);
  assert.ok(csv.includes(`"' =HYPERLINK(""https://example.invalid"",""click"")"`));
  assert.ok(csv.includes(`"'+SUM(1,1)"`));
});

test("JSON export source retains transactions, budgets, and goals", () => {
  const data = createDemoFinanceData(new Date(2026, 9, 15));
  const downloadedJson = JSON.stringify(data);
  const restoredData = JSON.parse(downloadedJson);

  assert.deepEqual(restoredData.transactions, data.transactions);
  assert.deepEqual(restoredData.budgets, data.budgets);
  assert.deepEqual(restoredData.savingsGoals, data.savingsGoals);
});

test("JSON and CSV export actions download the current data", async () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const downloads = [];

  URL.createObjectURL = (blob) => {
    downloads.push({ blob, href: "blob:test" });
    return "blob:test";
  };
  URL.revokeObjectURL = () => {};
  globalThis.window = { setTimeout: (callback) => callback() };
  globalThis.document = {
    body: { append: () => {} },
    createElement: () => ({
      style: {},
      click() {
        this.clicked = true;
      },
      remove() {},
    }),
  };

  try {
    const data = createDemoFinanceData(new Date(2026, 9, 15));
    exportFinanceJson(data);
    exportTransactionsCsv(data);

    assert.equal(downloads.length, 2);
    const jsonContents = await downloads[0].blob.text();
    const csvContents = await downloads[1].blob.text();
    const csvBytes = new Uint8Array(await downloads[1].blob.arrayBuffer());
    assert.deepEqual(JSON.parse(jsonContents), data);
    assert.deepEqual(Array.from(csvBytes.slice(0, 3)), [0xef, 0xbb, 0xbf]);
    assert.ok(csvContents.startsWith('"Date","Description"'));
    assert.ok(csvContents.includes('"Salary deposit"'));
  } finally {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});
