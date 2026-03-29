# Reimbursement Management — MERN MVP

Full-stack expense reimbursement system built with MongoDB, Express, React, Node.js.

---

## Features

- **Auth** — Signup creates a Company + Admin. Login with JWT.
- **Roles** — Admin, Manager, Employee with enforced permissions.
- **Multi-currency** — Submit in any currency; converted to company's default via ExchangeRate API.
- **Country/Currency** — Loaded from `restcountries.com` on signup.
- **Expense Submission** — Description, category, date, amount, currency, receipt upload.
- **OCR** — Upload a receipt image → Tesseract.js auto-fills amount & date.
- **Approval Rules** — Admin defines rules with: category filter, amount threshold, sequential approvers, manager-first flag.
- **Sequential Approval** — Expense moves to next approver only after current one acts.
- **Conditional Approval** — Percentage rule, specific-approver rule, or hybrid (OR logic).
- **Manager View** — See team expenses, pending queue.
- **Admin Override** — Admin can approve/reject any expense regardless of current step.

---

## Project Structure

```
reimbursement-app/
├── backend/
│   ├── models/         User, Company, Expense, ApprovalRule
│   ├── routes/         auth, users, expenses, approval-rules
│   ├── middleware/     JWT auth, role guard
│   ├── utils/          approvalHelper (rule matching, step building, conditional eval)
│   ├── uploads/        (auto-created for receipt files)
│   └── server.js
└── frontend/
    └── src/
        ├── context/    AuthContext
        ├── services/   api.js (axios)
        ├── components/ Layout (sidebar)
        └── pages/      Login, Signup, Dashboard, Expenses, NewExpense,
                        ExpenseDetail, Approvals, Users, ApprovalRules
```

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI and JWT_SECRET
npm install
npm run dev   # or: npm start
# Runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
# Proxies /api/* to http://localhost:5000
```

---

## Usage Flow

1. **Signup** → Creates your company (selects country → sets currency) and your Admin account.
2. **Create Users** → Admin → Users → Add employees and managers, assign manager relationships.
3. **Create Approval Rules** → Admin → Approval Rules → Define who approves what.
   - Set category/threshold filters
   - Toggle "Is Manager Approver" for manager-first flow
   - Add sequential approvers
   - Enable conditional approval (%, specific person, or hybrid)
4. **Submit Expense** → Employee → Submit Expense → fill form or use OCR scan.
5. **Approve/Reject** → Manager/Admin → Pending Approvals → Review and act.
6. **Track** → All roles see status in real-time on expense detail page.

---

## API Endpoints

### Auth
- `POST /api/auth/signup` — Create company + admin
- `POST /api/auth/login` — Login
- `GET  /api/auth/me` — Current user

### Users (Admin only)
- `GET    /api/users`
- `POST   /api/users`
- `PUT    /api/users/:id`
- `DELETE /api/users/:id` (deactivates)

### Expenses
- `GET  /api/expenses` — Role-filtered list
- `POST /api/expenses` — Submit (multipart/form-data)
- `GET  /api/expenses/pending-approval` — Manager/Admin queue
- `GET  /api/expenses/:id`
- `POST /api/expenses/:id/approve`
- `POST /api/expenses/:id/reject`
- `POST /api/expenses/ocr/extract` — OCR receipt

### Approval Rules (Admin only)
- `GET    /api/approval-rules`
- `POST   /api/approval-rules`
- `PUT    /api/approval-rules/:id`
- `DELETE /api/approval-rules/:id`

---

## External APIs Used

- **Countries + Currencies**: `https://restcountries.com/v3.1/all?fields=name,currencies`
- **Exchange Rates**: `https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}`
