import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenses } from '../services/api';
import { useAuth } from '../context/AuthContext';

function fmt(amount, currency) {
  if (!amount && amount !== 0) return '—';
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

export default function Expenses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getExpenses().then(res => setExpenses(res.data)).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.status === filter);

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <div className="page-title">{user.role === 'employee' ? 'My Expenses' : 'Team Expenses'}</div>
            <div className="page-sub">{expenses.length} total records</div>
          </div>
          {user.role === 'employee' && (
            <button className="btn btn-primary" onClick={() => navigate('/expenses/new')}>
              + New Expense
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <div key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              ({s === 'all' ? expenses.length : expenses.filter(e => e.status === s).length})
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">�</div>
            <div>No {filter !== 'all' ? filter : ''} expenses found</div>
            {user.role === 'employee' && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/expenses/new')}>
                Submit your first expense
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {user.role !== 'employee' && <th>Employee</th>}
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  {user.role !== 'employee' && <th>In {user.company?.currency?.code}</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/expenses/${e._id}`)}>
                    {user.role !== 'employee' && <td>{e.employee?.name}</td>}
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</div>
                    </td>
                    <td>{e.category}</td>
                    <td className="text-muted">{new Date(e.date).toLocaleDateString()}</td>
                    <td>{fmt(e.amount, e.currency)}</td>
                    {user.role !== 'employee' && <td>{fmt(e.amountInCompanyCurrency, e.companyCurrency)}</td>}
                    <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
