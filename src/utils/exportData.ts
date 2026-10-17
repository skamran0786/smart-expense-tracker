import type { FinanceData } from "../types/finance";

const csvHeaders = ["Date", "Description", "Category", "Type", "Amount (INR)"];

function escapeCsvValue(value: string | number): string {
  const rawText = String(value);
  const text =
    typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(rawText)
      ? `'${rawText}`
      : rawText;
  return `"${text.replace(/"/g, '""')}"`;
}

export function createTransactionsCsv(data: FinanceData): string {
  const rows = data.transactions.map((transaction) => [
    transaction.date,
    transaction.name,
    transaction.category,
    transaction.kind,
    transaction.amount,
  ]);

  return [csvHeaders, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");
}

export function downloadFile(
  filename: string,
  contents: string,
  mimeType: string,
): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportFinanceJson(data: FinanceData): void {
  downloadFile(
    `smart-expense-tracker-${new Date().toISOString().slice(0, 10)}.json`,
    `${JSON.stringify(data, null, 2)}\n`,
    "application/json;charset=utf-8",
  );
}

export function exportTransactionsCsv(data: FinanceData): void {
  downloadFile(
    `smart-expense-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    `\uFEFF${createTransactionsCsv(data)}`,
    "text/csv;charset=utf-8",
  );
}
