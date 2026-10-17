# Smart Expense Tracker

A responsive personal-finance dashboard built with React and TypeScript. It
uses fictional INR transactions to demonstrate monthly cash flow, category
spending, editable budgets, savings goals, and local data export.

> This is a portfolio demo, not a banking application or financial advice. Do
> not enter passwords, banking credentials, or sensitive real account data.

## Features

- Dashboard summaries for balance, selected-month income and expenses, and
  savings goals.
- Monthly income-versus-expense trend and category spending breakdown.
- Transaction list with month and income/expense filters.
- Add transactions, create and edit category budgets, and create/update savings
  goals with optional target dates.
- Budget warnings at 80%, at the limit, and above the limit.
- INR formatting using Indian digit grouping.
- JSON backup export and CSV transaction export.
- Responsive sidebar/navigation, mobile layout, form validation, and empty
  states.
- Local browser persistence with recovery from invalid stored data.

## Technologies

- React 18
- TypeScript (strict mode)
- Vite
- CSS
- Recharts
- Lucide React
- Node.js built-in test runner

## Requirements

- Node.js 22.12 or later (or a compatible current LTS release) and npm.
- A modern browser with `localStorage` enabled.

## Setup and development

From the project directory, install dependencies and start the Vite development
server:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Keep the
development server running while using the app. To stop it, focus the terminal
and press **Ctrl+C**.

Check TypeScript and create a production build:

```powershell
npm.cmd run build
```

Run the automated storage, export, and finance calculation tests:

```powershell
npm.cmd test
```

For macOS/Linux shells, use `npm` instead of `npm.cmd`.

## Usage

1. Choose a month in the dashboard selector. Monthly cards, category spending,
   transactions, budgets, and analytics totals follow that selection. The
   selector includes the six most recent months and any older months containing
   saved transactions.
2. Use **Add transaction** to record fictional income or an expense. Income
   entries use the Income category.
3. Expand **Add a category budget** to set a monthly category limit, or use
   **Adjust monthly limit** to edit one.
4. Expand **Add a savings goal** to create a goal and optionally set a target
   date. Update saved progress on each goal card.
5. Filter the transaction list by all activity, income, or expenses.
6. Use **Export all data (JSON)** or **Export transactions (CSV)** for a local
   backup. **Reset demo data** replaces browser data only after confirmation.

Transaction and budget calculations are derived from the stored transaction
list. A budget counts only expense transactions for its category and selected
month. Savings goal amounts are entered separately and are not inferred from
transactions.

## Data and privacy limitations

- Data is stored in this browser profile on this device. It is not cloud
  storage, is not synchronized across browsers/devices, and can be deleted by
  clearing site data.
- JSON export is the only backup mechanism; keep it somewhere safe if needed.
- This demo does not include authentication, a backend, bank connections,
  multi-currency support, recurring transactions, or shared accounts.
- Demo balance is calculated from its opening balance and all recorded income
  and expenses. Savings-goal progress is separate from account balance.
- Demo transactions are fictional. Verify financial records independently.
- The trend chart is limited to the six most recent months; the transaction,
  budget, and monthly-total selectors can still access older months with saved
  transactions.
- The current production build emits a non-blocking Vite warning because the
  minified JavaScript bundle is over 500 kB; the charting library is a major
  contributor.

## Screenshots

To add portfolio screenshots, run the app locally and capture:

1. The desktop dashboard at a wide viewport.
2. A mobile dashboard at a narrow viewport, with the navigation open if useful.
3. A budget warning and a savings-goal progress card.

Save the images under `docs/screenshots/` (for example,
`docs/screenshots/dashboard.png`) and embed them here using relative Markdown
paths, such as `![Dashboard](docs/screenshots/dashboard.png)`. Do not include
real financial data in screenshots.

## Build preview

After building, preview the production output locally:

```powershell
npm.cmd run build
npm.cmd run preview
```

Vite prints the local preview URL. The generated static site is in `dist/`.

## GitHub

This project folder is separate from any other portfolio project. From this
folder, initialize Git and connect it to a new repository you created on GitHub:

```powershell
git init
git add .
git commit -m "Initial Smart Expense Tracker"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/smart-expense-tracker.git
git push -u origin main
```

Replace `<YOUR-USERNAME>` with your GitHub username. Do not commit `node_modules`
or `dist`; they are ignored by `.gitignore`.

## Netlify deployment

1. Push the project to GitHub and choose **Add new site → Import an existing
   project** in Netlify.
2. Select the repository and configure:
   - **Base directory:** project root (leave blank if it is the repository root)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Deploy. Netlify builds the static app and provides a hosted HTTPS URL.

You can also build locally and deploy the `dist/` directory with Netlify Drop.
Do not deploy `node_modules/`. Since the app is a client-side Vite single-page
dashboard with hash navigation, no server-side API or redirect rule is required.
