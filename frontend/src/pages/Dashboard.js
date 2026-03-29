import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenses, getPendingApprovals } from '../services/api';
import { useAuth } from '../context/AuthContext';

function fmt(amount, currency) {
  if (!amount) return '—';
  return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount);
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getExpenses(),
      (user.role !== 'employee') ? getPendingApprovals() : Promise.resolve({ data: [] }),
    ]).then(([e, p]) => {
      setExpenses(e.data);
      setPending(p.data);
    }).finally(() => setLoading(false));
  }, [user.role]);

  const stats = {
    total: expenses.length,
    approved: expenses.filter(e => e.status === 'approved').length,
    pending: expenses.filter(e => e.status === 'pending').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
    totalAmount: expenses.reduce((s, e) => s + (e.amountInCompanyCurrency || 0), 0),
  };

  const recent = [...expenses].slice(0, 5);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Welcome back, {user.name}</div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.approved}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.rejected}</div>
        </div>
        {user.role !== 'employee' && (
          <div className="stat-card">
            <div className="stat-label">My Queue</div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>{pending.length}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: user.role !== 'employee' ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Recent Expenses */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>Recent Expenses</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>View all</button>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">�</div>
              <div>No expenses yet</div>
              {user.role === 'employee' && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/expenses/new')}>Submit Expense</button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr></thead>
                <tbody>
                  {recent.map(e => (
                    <tr key={e._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/expenses/${e._id}`)}>
                      <td>
                        <div>{e.description}</div>
                        <div className="text-muted text-sm">{e.category}</div>
                      </td>
                      <td>{fmt(e.amountInCompanyCurrency || e.amount, e.companyCurrency || e.currency)}</td>
                      <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        {user.role !== 'employee' && (
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ margin: 0 }}>Needs Your Approval</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/approvals')}>View all</button>
            </div>
            {pending.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✓</div>
                <div>All caught up</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Employee</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr></thead>
                  <tbody>
                    {pending.slice(0, 5).map(e => (
                      <tr key={e._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/expenses/${e._id}`)}>
                        <td>{e.employee?.name}</td>
                        <td>
                          <div>{e.description}</div>
                          <div className="text-muted text-sm">{e.category}</div>
                        </td>
                        <td>{fmt(e.amountInCompanyCurrency || e.amount, e.companyCurrency || e.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
