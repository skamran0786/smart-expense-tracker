import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  ChevronDown,
  Coffee,
  CreditCard,
  Download,
  Film,
  House,
  Menu,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Budget,
  SavingsGoal,
  Transaction,
  TransactionKind,
} from "./types/finance";
import {
  createDemoFinanceData,
  loadFinanceData,
  saveFinanceData,
  toDateKey,
} from "./utils/financeStorage";
import {
  exportFinanceJson,
  exportTransactionsCsv,
} from "./utils/exportData";
import {
  filterTransactions,
  getCategorySpending,
  getMonthKey,
  getMonthlyBudgetProgress,
  getMonthlyTotals,
  getMonthlyTrend,
  hasValidSavingsGoalAmounts,
} from "./utils/financeCalculations";

type NavItem = {
  label: string;
  icon: typeof House;
  href: string;
};

const navigation: NavItem[] = [
  { label: "Overview", icon: House, href: "#overview" },
  { label: "Transactions", icon: CreditCard, href: "#transactions" },
  { label: "Analytics", icon: CalendarDays, href: "#analytics" },
  { label: "Budgets", icon: Wallet, href: "#budgets" },
  { label: "Savings goals", icon: Wallet, href: "#savings-goals" },
];

const categoryColors = ["#7b72e9", "#f0a773", "#6fb9a4", "#6c9fdb", "#e4c46c"];
const expenseCategories = [
  "Shopping",
  "Food & drink",
  "Groceries",
  "Transport",
  "Housing",
  "Entertainment",
  "Health",
  "Utilities",
  "Other",
];

type MonthlyPoint = { monthKey: string; month: string; income: number; expenses: number };
type SpendingCategory = { name: string; amount: number; color: string };

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatMoney(amount: number) {
  return currency.format(amount);
}

function formatCompactMoney(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${amount}`;
}

function formatTransactionDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function getTransactionIcon(transaction: Transaction) {
  if (transaction.kind === "income") return ArrowDownLeft;
  if (transaction.category === "Groceries") return ShoppingCart;
  if (transaction.category === "Food & drink") return Coffee;
  if (transaction.category === "Transport") return CarFront;
  if (transaction.category === "Entertainment") return Film;
  return ShoppingBag;
}

function getTransactionTone(transaction: Transaction) {
  if (transaction.kind === "income") return "mint";
  if (transaction.category === "Groceries") return "lavender";
  if (transaction.category === "Food & drink") return "peach";
  if (transaction.category === "Transport") return "blue";
  if (transaction.category === "Entertainment") return "pink";
  return "lavender";
}

function buildSpendingData(
  transactions: Transaction[],
): SpendingCategory[] {
  return getCategorySpending(transactions).map((item, index) => ({
    name: item.category,
    amount: item.amount,
    color: categoryColors[index % categoryColors.length],
  }));
}

function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");

  return (
    <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`}>
      <div className="brand-row">
        <a className="brand" href="#overview" aria-label="Finwise home">
          <span className="brand-mark">
            <Wallet size={19} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="brand-name">finwise</span>
        </a>
        <button
          className="icon-button mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className={`sidebar-content${menuOpen ? " sidebar-content-open" : ""}`}>
        <p className="nav-caption">MENU</p>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon, href }) => (
            <a
              className={`nav-link${activeNav === label ? " nav-link-active" : ""}`}
              href={href}
              key={label}
              aria-label={label}
              aria-current={activeNav === label ? "location" : undefined}
              onClick={() => {
                setActiveNav(label);
                setMenuOpen(false);
              }}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <span className="upgrade-icon">
              <Download size={17} aria-hidden="true" />
            </span>
            <p>Small steps add up.</p>
            <span className="upgrade-caption">Your budget progress stays up to date.</span>
          </div>
          <div className="profile-display">
            <span className="avatar" aria-hidden="true">KS</span>
            <span className="profile-copy">
              <strong>Kamran Siddique</strong>
              <span>Personal account</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SummaryCard({
  label,
  amount,
  context,
  icon: Icon,
  tone,
}: {
  label: string;
  amount: string;
  context: string;
  icon: typeof Wallet;
  tone: string;
}) {
  return (
    <article className="summary-card">
      <div className="summary-top">
        <span className="summary-label">{label}</span>
        <span className={`summary-icon ${tone}`}>
          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        </span>
      </div>
      <p className="summary-amount">{amount}</p>
      <p className="summary-change">
        <span className="muted">{context}</span>
      </p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  id,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`panel ${className}`} id={id}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MonthlyChart({
  data,
  hasData,
}: {
  data: MonthlyPoint[];
  hasData: boolean;
}) {
  return (
    <div
      className={`chart-wrap${hasData ? "" : " chart-empty"}`}
      role={hasData ? "group" : undefined}
      aria-label={hasData ? "Monthly income and expenses for the last six months" : undefined}
    >
      {hasData ? (
        <>
          <ul className="visually-hidden">
            {data.map((point) => (
              <li key={point.monthKey}>
                {point.monthKey}: income {formatMoney(point.income)}, expenses {formatMoney(point.expenses)}
              </li>
            ))}
          </ul>
          <div className="chart-legend" aria-hidden="true">
            <span><i className="legend-dot income-dot" />Income</span>
            <span><i className="legend-dot expense-dot" />Expenses</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 18, right: 6, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7b72e9" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#7b72e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#83c7b4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#83c7b4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#edf0f4" strokeDasharray="4 5" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#727785", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#727785", fontSize: 11 }}
                tickFormatter={formatCompactMoney}
                tickCount={5}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{
                  border: "1px solid #edf0f4",
                  borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(30, 35, 55, 0.09)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#7b72e9"
                strokeWidth={2.5}
                fill="url(#incomeFill)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#83c7b4"
                strokeWidth={2.5}
                fill="url(#expenseFill)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      ) : (
        <p className="empty-state analytics-empty-state">
          No transaction data to show yet. Add transactions to see your monthly trend.
        </p>
      )}
    </div>
  );
}

function SpendingChart({ data }: { data: SpendingCategory[] }) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="spending-chart-wrap">
      <div
        className="donut-chart"
        role="img"
        aria-label={`Spending by category: ${data.length
          ? data.map((item) => `${item.name} ${formatMoney(item.amount)}`).join(", ")
          : "no expenses recorded"}`}
      >
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="92%"
                  paddingAngle={4}
                  stroke="none"
                  cornerRadius={5}
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center" aria-hidden="true">
              <span>Total spent</span>
              <strong>{formatCompactMoney(total)}</strong>
            </div>
          </>
        ) : (
          <p className="empty-state spending-empty-state">
            No expenses recorded for this month.
          </p>
        )}
      </div>
      {data.length > 0 ? (
        <div className="category-list">
          {data.map((item) => (
            <div className="category-row" key={item.name}>
              <span className="category-name">
                <i style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <strong>
                {formatMoney(item.amount)} · {Math.round((item.amount / total) * 100)}%
              </strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Transaction</th>
            <th scope="col">Date</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((transaction) => {
              const Icon = getTransactionIcon(transaction);
              return (
                <tr key={transaction.id}>
                  <td>
                    <div className="transaction-name">
                      <span className={`transaction-icon ${getTransactionTone(transaction)}`}>
                        <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{transaction.name}</strong>
                        <small>{transaction.category}</small>
                      </span>
                    </div>
                  </td>
                  <td className="transaction-date">{formatTransactionDate(transaction.date)}</td>
                  <td className={`transaction-amount ${transaction.kind}`}>
                    {transaction.kind === "income" ? "+" : "−"}
                    {formatMoney(transaction.amount)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3}>
                <p className="empty-state">
                  No transactions match this month and type filter.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BudgetProgress({
  budgets,
  transactions,
  monthKey,
  availableCategories,
  onAddBudget,
  onUpdateBudget,
}: {
  budgets: Budget[];
  transactions: Transaction[];
  monthKey: string;
  availableCategories: string[];
  onAddBudget: (category: string, limit: number) => void;
  onUpdateBudget: (budgetId: string, limit: number) => void;
}) {
  return (
    <>
      <div className="budget-list">
        {budgets.length > 0 ? budgets.map((budget) => {
          const progress = getMonthlyBudgetProgress(budget, transactions, monthKey);
          const label = budget.categories.join(" & ");
          return (
            <div className={`budget-item budget-${progress.status}`} key={budget.id}>
              <div className="budget-label-row">
                <strong>{budget.name}</strong>
                <span>{formatMoney(progress.spent)} <small>of {formatMoney(budget.limit)}</small></span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label={`${label} budget used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress.progressPercentage)}
              >
                <span
                  className={`progress-fill ${budget.color}`}
                  style={{ width: `${progress.progressPercentage}%` }}
                />
              </div>
              <div className="budget-details">
                <span className="budget-remaining">
                  {progress.status === "exceeded"
                    ? `${formatMoney(progress.spent - budget.limit)} over budget`
                    : `${formatMoney(progress.remaining)} remaining`}
                </span>
                <span>{progress.percentage.toFixed(1)}% used</span>
              </div>
              {progress.status === "approaching" && (
                <p className="budget-alert" role="status">
                  Spending has reached at least 80% of the {label} budget.
                </p>
              )}
              {progress.status === "at-limit" && (
                <p className="budget-alert" role="status">
                  The {label} budget has reached 100%.
                </p>
              )}
              {progress.status === "exceeded" && (
                <p className="budget-alert budget-alert-exceeded" role="status">
                  The {label} budget is over its limit.
                </p>
              )}
              <BudgetLimitForm
                key={`${budget.id}-${budget.limit}`}
                budget={budget}
                onUpdateBudget={onUpdateBudget}
              />
            </div>
          );
        }) : (
          <p className="empty-state">No budgets set up yet. Create a budget to track your spending.</p>
        )}
      </div>
      <BudgetForm
        availableCategories={availableCategories}
        onAddBudget={onAddBudget}
      />
    </>
  );
}

function BudgetLimitForm({
  budget,
  onUpdateBudget,
}: {
  budget: Budget;
  onUpdateBudget: (budgetId: string, limit: number) => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limit = Number(new FormData(event.currentTarget).get("limit"));
    if (!Number.isFinite(limit) || limit <= 0) {
      setError("Monthly limit must be a positive amount.");
      setMessage("");
      return;
    }
    onUpdateBudget(budget.id, limit);
    setError("");
    setMessage("Monthly budget updated.");
  }

  return (
    <details className="budget-edit-disclosure">
      <summary>Adjust monthly limit</summary>
      <form className="budget-edit-form" onSubmit={handleSubmit}>
        <label>
          Monthly limit (₹)
          <input
            name="limit"
            type="number"
            min="1"
            step="1"
            defaultValue={budget.limit}
            required
          />
        </label>
        <button className="button-secondary" type="submit">Save limit</button>
      </form>
      {error && <span className="form-error" role="alert">{error}</span>}
      {message && <span className="form-feedback" role="status">{message}</span>}
    </details>
  );
}

function BudgetForm({
  availableCategories,
  onAddBudget,
}: {
  availableCategories: string[];
  onAddBudget: (category: string, limit: number) => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const category = formData.get("category");
    const limit = Number(formData.get("limit"));
    if (
      typeof category !== "string" ||
      !availableCategories.includes(category) ||
      !Number.isFinite(limit) ||
      limit <= 0
    ) {
      setError("Choose an unbudgeted expense category and enter a positive monthly amount.");
      setMessage("");
      return;
    }
    onAddBudget(category, limit);
    form.reset();
    setError("");
    setMessage(`${category} monthly budget added.`);
  }

  return (
    <details className="finance-form-disclosure">
      <summary>Add a category budget</summary>
      <form className="finance-inline-form" onSubmit={handleSubmit}>
        <label>
          Expense category
          <select name="category" required defaultValue="">
            <option value="" disabled>Select a category</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Monthly limit (₹)
          <input name="limit" type="number" min="1" step="1" placeholder="e.g. 5000" required />
        </label>
        <button className="button-primary" type="submit" disabled={availableCategories.length === 0}>
          <Plus size={15} aria-hidden="true" /> Add budget
        </button>
      </form>
      {availableCategories.length === 0 && (
        <p className="form-feedback">Every available expense category already has a budget.</p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-feedback" role="status">{message}</p>}
    </details>
  );
}

function SavingsGoals({
  goals,
  onAddGoal,
  onUpdateProgress,
}: {
  goals: SavingsGoal[];
  onAddGoal: (goal: SavingsGoal) => void;
  onUpdateProgress: (goalId: string, saved: number) => void;
}) {
  return (
    <>
      <div className="savings-goal-list">
        {goals.length > 0 ? goals.map((goal) => {
          const percentage = Math.min((goal.saved / goal.target) * 100, 100);
          return (
            <article className="savings-goal" key={goal.id}>
              <div className="goal-heading">
                <span className={`goal-icon ${goal.color}`}><Wallet size={17} aria-hidden="true" /></span>
                <span>{goal.name}</span>
              </div>
              <strong className="goal-amount">{formatMoney(goal.saved)}</strong>
              <span className="goal-target">of {formatMoney(goal.target)} saved</span>
              {goal.targetDate && (
                <span className="goal-target">Target: {formatTransactionDate(goal.targetDate)}</span>
              )}
              <div
                className="progress-track"
                role="progressbar"
                aria-label={`${goal.name} savings goal`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percentage)}
              >
                <span className={`progress-fill ${goal.color}`} style={{ width: `${percentage}%` }} />
              </div>
              <span className="goal-percentage">
                {Math.round(percentage)}% of goal{percentage === 100 ? " complete" : ""}
              </span>
              <GoalProgressForm
                key={`${goal.id}-${goal.saved}`}
                goal={goal}
                onUpdateProgress={onUpdateProgress}
              />
            </article>
          );
        }) : (
          <p className="empty-state">No savings goals yet. Add a goal when you are ready.</p>
        )}
      </div>
      <GoalForm onAddGoal={onAddGoal} />
    </>
  );
}

function GoalProgressForm({
  goal,
  onUpdateProgress,
}: {
  goal: SavingsGoal;
  onUpdateProgress: (goalId: string, saved: number) => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const saved = Number(new FormData(form).get("saved"));
    if (!Number.isFinite(saved) || saved < 0) {
      setError("Saved amount must be a valid non-negative amount.");
      setMessage("");
      return;
    }
    onUpdateProgress(goal.id, saved);
    setError("");
    setMessage("Savings progress updated.");
  }

  return (
    <form className="goal-progress-form" onSubmit={handleSubmit}>
      <label>
        Update saved amount (₹)
        <input
          name="saved"
          type="number"
          min="0"
          step="1"
          defaultValue={goal.saved}
          required
        />
      </label>
      <button className="button-secondary" type="submit">Update progress</button>
      {error && <span className="form-error" role="alert">{error}</span>}
      {message && <span className="form-feedback" role="status">{message}</span>}
    </form>
  );
}

function GoalForm({ onAddGoal }: { onAddGoal: (goal: SavingsGoal) => void }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nameValue = formData.get("goalName");
    const target = Number(formData.get("target"));
    const saved = Number(formData.get("initialSaved"));
    const targetDateValue = formData.get("targetDate");
    if (
      typeof nameValue !== "string" ||
      !nameValue.trim() ||
      !hasValidSavingsGoalAmounts(target, saved) ||
      (typeof targetDateValue === "string" &&
        targetDateValue !== "" &&
        !/^\d{4}-\d{2}-\d{2}$/.test(targetDateValue))
    ) {
      setError("Enter a goal name, positive target, and non-negative saved amount.");
      setMessage("");
      return;
    }
    onAddGoal({
      id: crypto.randomUUID(),
      name: nameValue.trim(),
      target,
      saved,
      color: "violet",
      ...(typeof targetDateValue === "string" && targetDateValue
        ? { targetDate: targetDateValue }
        : {}),
    });
    form.reset();
    setError("");
    setMessage("Savings goal added.");
  }

  return (
    <details className="finance-form-disclosure goal-form-disclosure">
      <summary>Add a savings goal</summary>
      <form className="finance-inline-form" onSubmit={handleSubmit}>
        <label>
          Goal name
          <input name="goalName" type="text" maxLength={60} placeholder="e.g. Family holiday" required />
        </label>
        <label>
          Target amount (₹)
          <input name="target" type="number" min="1" step="1" placeholder="e.g. 50000" required />
        </label>
        <label>
          Already saved (₹)
          <input name="initialSaved" type="number" min="0" step="1" defaultValue="0" required />
        </label>
        <label>
          Target date (optional)
          <input name="targetDate" type="date" />
        </label>
        <button className="button-primary" type="submit">
          <Plus size={15} aria-hidden="true" /> Add goal
        </button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-feedback" role="status">{message}</p>}
    </details>
  );
}

function AddTransactionDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (transaction: Transaction) => void;
}) {
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [selectedCategory, setSelectedCategory] = useState("Shopping");
  const [formError, setFormError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount"));
    const kindValue = formData.get("kind");
    const nameValue = formData.get("name");
    const categoryValue = formData.get("category");
    if (
      (kindValue !== "income" && kindValue !== "expense") ||
      typeof nameValue !== "string" ||
      typeof categoryValue !== "string"
    ) return;
    const name = nameValue.trim();
    const category = categoryValue;

    if (!name || !Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a description and a positive transaction amount.");
      return;
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      name,
      category,
      date: toDateKey(new Date()),
      amount,
      kind: kindValue,
    };
    onAdd(transaction);
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="transaction-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key === "Tab") {
            const focusableElements = event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            if (
              event.shiftKey &&
              document.activeElement === firstElement
            ) {
              event.preventDefault();
              lastElement?.focus();
            } else if (
              !event.shiftKey &&
              document.activeElement === lastElement
            ) {
              event.preventDefault();
              firstElement?.focus();
            }
          }
        }}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">YOUR FINANCES</span>
            <h2 id="dialog-title">Add a transaction</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Description
            <input name="name" type="text" placeholder="e.g. Grocery shopping" required autoFocus />
          </label>
          <div className="dialog-fields">
            <label>
              Amount (₹)
              <input name="amount" type="number" min="1" step="1" placeholder="0" required />
            </label>
            <label>
              Type
              <select
                name="kind"
                value={kind}
                onChange={(event) => {
                  const nextKind =
                    event.currentTarget.value === "income" ? "income" : "expense";
                  setKind(nextKind);
                  setSelectedCategory(nextKind === "income" ? "Income" : "Shopping");
                }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
          </div>
          <label>
            Category
            <select
              name="category"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.currentTarget.value)}
            >
              {(kind === "income" ? ["Income"] : expenseCategories).map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="dialog-actions">
            <button className="button-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button-primary" type="submit">
              <Plus size={17} aria-hidden="true" /> Add transaction
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [initialLoad] = useState(loadFinanceData);
  const [financeData, setFinanceData] = useState(initialLoad.data);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));
  const [transactionKind, setTransactionKind] = useState<TransactionKind | "all">("all");
  const [saveMessage, setSaveMessage] = useState(
    "Checking local browser storage.",
  );
  const [saveError, setSaveError] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(false);
  const currentDate = new Date();
  const monthFormatter = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  });
  const recentMonthKeys = Array.from({ length: 6 }, (_, index) =>
    getMonthKey(new Date(currentDate.getFullYear(), currentDate.getMonth() - index, 1)),
  );
  const monthKeys = new Set([
    ...recentMonthKeys,
    ...financeData.transactions.map((transaction) => transaction.date.slice(0, 7)),
  ]);
  const monthOptions = Array.from(monthKeys)
    .sort((first, second) => second.localeCompare(first))
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { key, label: monthFormatter.format(new Date(year, month - 1, 1)) };
    });
  const monthlyTransactions = filterTransactions(financeData.transactions, selectedMonth, "all");
  const monthTotals = getMonthlyTotals(monthlyTransactions);
  const allTimeTotals = getMonthlyTotals(financeData.transactions);
  const totalBalance =
    financeData.openingBalance + allTimeTotals.income - allTimeTotals.expenses;
  const totalSavings = financeData.savingsGoals.reduce((sum, goal) => sum + goal.saved, 0);
  const monthlyData = getMonthlyTrend(financeData.transactions, currentDate);
  const spendingData = buildSpendingData(monthlyTransactions);
  const sortedTransactions = filterTransactions(
    financeData.transactions,
    selectedMonth,
    transactionKind,
  ).sort((first, second) =>
    second.date.localeCompare(first.date),
  );
  const availableBudgetCategories = expenseCategories.filter(
    (category) => !financeData.budgets.some((budget) => budget.categories.includes(category)),
  );
  const budgetColors: Budget["color"][] = ["violet", "green", "orange"];
  const selectedMonthLabel =
    monthOptions.find((month) => month.key === selectedMonth)?.label ?? selectedMonth;
  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(currentDate).toUpperCase();

  useEffect(() => {
    const result = saveFinanceData(financeData);
    setSaveError(!result.ok);
    setSaveMessage(
      result.ok
        ? "Your data is saved in this browser only. It is not cloud backup."
        : result.message,
    );
  }, [financeData]);

  function handleAddTransaction(transaction: Transaction) {
    setFinanceData((current) => ({
      ...current,
      transactions: [transaction, ...current.transactions],
    }));
    setActionMessage("Transaction added.");
    setActionError(false);
  }

  function handleAddBudget(category: string, limit: number) {
    if (
      !expenseCategories.includes(category) ||
      !Number.isFinite(limit) ||
      limit <= 0 ||
      financeData.budgets.some((budget) => budget.categories.includes(category))
    ) {
      setActionMessage("That category already has a budget or the monthly limit is invalid.");
      setActionError(true);
      return;
    }
    setFinanceData((current) => ({
      ...current,
      budgets: [
        ...current.budgets,
        {
          id: crypto.randomUUID(),
          name: category,
          categories: [category],
          limit,
          color: budgetColors[current.budgets.length % budgetColors.length],
        },
      ],
    }));
    setActionMessage(`${category} monthly budget added.`);
    setActionError(false);
  }

  function handleUpdateBudget(budgetId: string, limit: number) {
    if (!Number.isFinite(limit) || limit <= 0) {
      setActionMessage("Monthly budget limit must be a positive amount.");
      setActionError(true);
      return;
    }
    setFinanceData((current) => ({
      ...current,
      budgets: current.budgets.map((budget) =>
        budget.id === budgetId ? { ...budget, limit } : budget,
      ),
    }));
    setActionMessage("Monthly budget limit updated.");
    setActionError(false);
  }

  function handleAddGoal(goal: SavingsGoal) {
    if (
      !goal.name.trim() ||
      !hasValidSavingsGoalAmounts(goal.target, goal.saved)
    ) {
      setActionMessage("Goal target must be positive and saved amount cannot be negative.");
      setActionError(true);
      return;
    }
    setFinanceData((current) => ({
      ...current,
      savingsGoals: [...current.savingsGoals, goal],
    }));
    setActionMessage(`${goal.name} savings goal added.`);
    setActionError(false);
  }

  function handleUpdateGoalProgress(goalId: string, saved: number) {
    if (!Number.isFinite(saved) || saved < 0) {
      setActionMessage("Saved amount must be a valid non-negative amount.");
      setActionError(true);
      return;
    }
    setFinanceData((current) => ({
      ...current,
      savingsGoals: current.savingsGoals.map((goal) =>
        goal.id === goalId ? { ...goal, saved } : goal,
      ),
    }));
    setActionMessage("Savings goal progress updated.");
    setActionError(false);
  }

  function handleResetDemoData() {
    const confirmed = window.confirm(
      "Reset demo data? This replaces the transactions, budgets, and savings goals saved in this browser. Export a JSON backup first if you want to keep your current data.",
    );
    if (!confirmed) return;

    setFinanceData(createDemoFinanceData());
    setSelectedMonth(getMonthKey(new Date()));
    setActionMessage("Demo data restored. Your previous browser data was replaced.");
    setActionError(false);
  }

  function handleExportJson() {
    try {
      exportFinanceJson(financeData);
      setActionMessage("JSON backup downloaded.");
      setActionError(false);
    } catch (error) {
      setActionMessage(
        error instanceof Error ? `JSON export failed: ${error.message}` : "JSON export failed.",
      );
      setActionError(true);
    }
  }

  function handleExportCsv() {
    try {
      exportTransactionsCsv(financeData);
      setActionMessage("Transaction CSV downloaded.");
      setActionError(false);
    } catch (error) {
      setActionMessage(
        error instanceof Error ? `CSV export failed: ${error.message}` : "CSV export failed.",
      );
      setActionError(true);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Pages</span>
            <span className="breadcrumb-divider">/</span>
            <strong>Overview</strong>
          </div>
          <div className="topbar-actions">
            <label className="month-select">
              <CalendarDays size={16} aria-hidden="true" />
              <select
                aria-label="Select month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.currentTarget.value)}
              >
                {monthOptions.map((month) => (
                  <option key={month.key} value={month.key}>{month.label}</option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </label>
            <span className="topbar-avatar" role="img" aria-label="Kamran Siddique">KS</span>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">{todayLabel}</p>
              <h1>Good morning, Kamran <span aria-hidden="true">✦</span></h1>
              <p className="welcome-subtitle">Here’s what’s happening with your money today.</p>
            </div>
            <button className="button-primary add-button" type="button" onClick={() => setDialogOpen(true)}>
              <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
              Add transaction
            </button>
          </section>

          <section className="summary-grid" aria-label="Monthly financial summary">
            <SummaryCard
              label="Total balance"
              amount={formatMoney(totalBalance)}
              context="Across all recorded transactions"
              icon={Wallet}
              tone="violet"
            />
            <SummaryCard
              label="Monthly income"
              amount={formatMoney(monthTotals.income)}
              context={`For ${selectedMonthLabel}`}
              icon={ArrowDownLeft}
              tone="green"
            />
            <SummaryCard
              label="Monthly expenses"
              amount={formatMoney(monthTotals.expenses)}
              context={`For ${selectedMonthLabel}`}
              icon={ArrowUpRight}
              tone="orange"
            />
            <SummaryCard
              label="Total savings"
              amount={formatMoney(totalSavings)}
              context="Across all savings goals"
              icon={Wallet}
              tone="blue"
            />
          </section>

          <div className="main-grid">
            <Panel
              title="Income vs expenses"
              subtitle="Monthly income and expense trend for the last 6 months"
              action={
                <label className="budget-month-select">
                  <span className="visually-hidden">Analytics month</span>
                  <select
                    aria-label="Analytics month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.currentTarget.value)}
                  >
                    {monthOptions.map((month) => (
                      <option key={month.key} value={month.key}>{month.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </label>
              }
              className="cashflow-panel"
              id="analytics"
            >
              <MonthlyChart
                data={monthlyData}
                hasData={monthlyData.some((month) => month.income > 0 || month.expenses > 0)}
              />
              <dl className="monthly-totals" aria-label={`${selectedMonthLabel} transaction totals`}>
                <div><dt>Transactions</dt><dd>{monthTotals.transactionCount}</dd></div>
                <div><dt>Income</dt><dd>{formatMoney(monthTotals.income)}</dd></div>
                <div><dt>Expenses</dt><dd>{formatMoney(monthTotals.expenses)}</dd></div>
                <div><dt>Net</dt><dd>{formatMoney(monthTotals.net)}</dd></div>
              </dl>
            </Panel>

            <Panel
              title="Spending by category"
              subtitle="A look at where your money goes"
              className="spending-panel"
            >
              <SpendingChart data={spendingData} />
            </Panel>

            <Panel
              title="Transactions"
              subtitle={`${selectedMonthLabel} · ${sortedTransactions.length} matching`}
              action={
                <label className="transaction-filter">
                  <span className="visually-hidden">Filter transactions by type</span>
                  <select
                    aria-label="Filter transactions by type"
                    value={transactionKind}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      if (value === "income" || value === "expense" || value === "all") {
                        setTransactionKind(value);
                      }
                    }}
                  >
                    <option value="all">All types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expenses</option>
                  </select>
                </label>
              }
              className="transactions-panel"
              id="transactions"
            >
              <TransactionsTable transactions={sortedTransactions} />
            </Panel>

            <Panel
              title="Monthly budgets"
              subtitle="Keep your spending on track"
              action={
                <label className="budget-month-select">
                  <span className="visually-hidden">Budget month</span>
                  <select
                    aria-label="Budget month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.currentTarget.value)}
                  >
                    {monthOptions.map((month) => (
                      <option key={month.key} value={month.key}>{month.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </label>
              }
              className="budgets-panel"
              id="budgets"
            >
              <BudgetProgress
                budgets={financeData.budgets}
                transactions={financeData.transactions}
                monthKey={selectedMonth}
                availableCategories={availableBudgetCategories}
                onAddBudget={handleAddBudget}
                onUpdateBudget={handleUpdateBudget}
              />
            </Panel>
            <Panel
              title="Savings goals"
              subtitle="Progress toward what matters to you"
              className="goals-panel"
              id="savings-goals"
            >
              <SavingsGoals
                goals={financeData.savingsGoals}
                onAddGoal={handleAddGoal}
                onUpdateProgress={handleUpdateGoalProgress}
              />
            </Panel>
            <Panel
              title="Your data & privacy"
              subtitle="Manage a local copy of your finance data"
              className="data-panel"
            >
              <p className="data-disclaimer">
                Data stays in this browser profile on this device. It is not cloud backup or
                synced to other devices. Do not enter passwords, banking credentials, or
                sensitive real financial account information.
              </p>
              <div className="data-actions">
                <button className="button-secondary" type="button" onClick={handleExportJson}>
                  <Download size={15} aria-hidden="true" /> Export all data (JSON)
                </button>
                <button className="button-secondary" type="button" onClick={handleExportCsv}>
                  <Download size={15} aria-hidden="true" /> Export transactions (CSV)
                </button>
                <button className="button-danger" type="button" onClick={handleResetDemoData}>
                  Reset demo data
                </button>
              </div>
              <p
                className={saveError ? "storage-warning" : "storage-status"}
                role={saveError ? "alert" : "status"}
              >
                {saveMessage}
              </p>
              {initialLoad.message && (
                <p className="storage-warning" role="alert">{initialLoad.message}</p>
              )}
              {actionMessage && (
                <p className={actionError ? "storage-warning" : "storage-status"} role={actionError ? "alert" : "status"}>
                  {actionMessage}
                </p>
              )}
              <p className="data-counts">
                {financeData.transactions.length} transactions · {financeData.budgets.length} budgets ·{" "}
                {financeData.savingsGoals.length} savings goals
              </p>
            </Panel>
          </div>
          <footer className="dashboard-footer">
            <span>Made for a little more peace of mind.</span>
            <span>All amounts shown in Indian Rupees (₹)</span>
          </footer>
        </div>
      </main>

      {dialogOpen && (
        <AddTransactionDialog
          onClose={() => setDialogOpen(false)}
          onAdd={handleAddTransaction}
        />
      )}
    </div>
  );
}

export default App;
