import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingApprovals } from '../services/api';

function fmt(amount, currency) {
  if (!amount && amount !== 0) return '—';
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

export default function Approvals() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPendingApprovals().then(r => setExpenses(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Pending Approvals</div>
        <div className="page-sub">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} waiting for your action</div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <div>No pending approvals — you're all caught up</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount (submitted)</th>
                  <th>Amount (company)</th>
                  <th>Rule</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e._id}>
                    <td>{e.employee?.name}</td>
                    <td style={{ maxWidth: 180 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</div>
                    </td>
                    <td>{e.category}</td>
                    <td className="text-muted">{new Date(e.date).toLocaleDateString()}</td>
                    <td>{fmt(e.amount, e.currency)}</td>
                    <td>{fmt(e.amountInCompanyCurrency, e.companyCurrency)}</td>
                    <td className="text-muted text-sm">{e.approvalRule?.name || '—'}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/expenses/${e._id}`)}>
                        Review →
                      </button>
                    </td>
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
