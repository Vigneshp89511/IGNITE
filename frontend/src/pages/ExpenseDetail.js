import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExpense, approveExpense, rejectExpense } from '../services/api';
import { useAuth } from '../context/AuthContext';

function fmt(amount, currency) {
  if (!amount && amount !== 0) return '—';
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

export default function ExpenseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const load = () => getExpense(id).then(r => setExpense(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const currentStep = expense?.approvalSteps?.[expense.currentStep];
  const isMyTurn = currentStep?.approver?._id === user._id && expense?.status === 'pending';

  const handleApprove = async () => {
    setActionLoading(true); setError('');
    try {
      const res = await approveExpense(id, { comment });
      setExpense(res.data); setComment('');
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!comment.trim()) return setError('Comment required for rejection');
    setActionLoading(true); setError('');
    try {
      const res = await rejectExpense(id, { comment });
      setExpense(res.data); setComment(''); setShowRejectModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!expense) return <div className="card">Expense not found</div>;

  const stepStatuses = ['Draft', 'Waiting approval', 'Approved'];

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <div className="page-title">Expense Details</div>
            <div className="page-sub">#{expense._id.slice(-8).toUpperCase()}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      {/* Status bar */}
      <div className={`approval-bar ${expense.status}`}>
        <span>{expense.status === 'approved' ? '✓' : expense.status === 'rejected' ? '✕' : '—'}</span>
        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{expense.status}</span>
        {expense.approvalSteps.length > 0 && (
          <span className="text-muted" style={{ marginLeft: 8 }}>
            · Step {Math.min(expense.currentStep + 1, expense.approvalSteps.length)} of {expense.approvalSteps.length}
          </span>
        )}
        {expense.rejectionReason && (
          <span className="text-muted" style={{ marginLeft: 8 }}>· "{expense.rejectionReason}"</span>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Main info */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Expense Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div className="form-label">Description</div>
                <div>{expense.description}</div>
              </div>
              <div>
                <div className="form-label">Category</div>
                <div>{expense.category}</div>
              </div>
              <div>
                <div className="form-label">Date</div>
                <div>{new Date(expense.date).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <div>
                <div className="form-label">Submitted by</div>
                <div>{expense.employee?.name}</div>
              </div>
              <div>
                <div className="form-label">Amount (submitted)</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(expense.amount, expense.currency)}</div>
              </div>
              {expense.amountInCompanyCurrency && expense.currency !== expense.companyCurrency && (
                <div>
                  <div className="form-label">Amount ({expense.companyCurrency})</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
                    {fmt(expense.amountInCompanyCurrency, expense.companyCurrency)}
                  </div>
                </div>
              )}
            </div>

            {expense.receiptUrl && (
              <div style={{ marginTop: 16 }}>
                <div className="form-label">Receipt</div>
                <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  View Receipt
                </a>
              </div>
            )}

            {expense.approvalRule && (
              <div style={{ marginTop: 16, padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                <span className="text-muted">Approval rule: </span>
                <span>{expense.approvalRule?.name || 'Custom rule'}</span>
              </div>
            )}
          </div>

          {/* Action panel - only if it's my turn */}
          {isMyTurn && (
            <div className="card" style={{ borderColor: 'rgba(79,124,255,0.4)', background: 'rgba(79,124,255,0.04)' }}>
              <div className="card-title">Action Required</div>
              <div className="form-group">
                <label className="form-label">Comment (optional for approval, required for rejection)</label>
                <textarea className="form-textarea" value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment..." rows={3} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success" onClick={handleApprove} disabled={actionLoading}>
                  Approve
                </button>
                <button className="btn btn-danger" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Admin override */}
          {user.role === 'admin' && expense.status === 'pending' && !isMyTurn && (
            <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
              <div className="card-title">Admin Override</div>
              <div className="form-group">
                <label className="form-label">Override Comment</label>
                <textarea className="form-textarea" value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Reason for override..." rows={2} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success btn-sm" onClick={handleApprove} disabled={actionLoading}>Override Approve</button>
                <button className="btn btn-danger btn-sm" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>Override Reject</button>
              </div>
            </div>
          )}
        </div>

        {/* Approval Steps sidebar */}
        <div>
          <div className="card">
            <div className="card-title">Approval Workflow</div>
            {expense.approvalSteps.length === 0 ? (
              <div className="text-muted text-sm">No approval required — auto approved.</div>
            ) : (
              <div className="steps">
                {expense.approvalSteps.map((step, idx) => (
                  <div key={idx} className="step" style={idx === expense.currentStep && expense.status === 'pending' ? { borderColor: 'var(--primary)' } : {}}>
                    <div className={`step-dot ${step.status}`}>{idx + 1}</div>
                    <div className="step-info">
                      <div className="step-name">
                        {step.approver?.name}
                        {step.isManagerStep && <span className="text-muted text-sm"> (Manager)</span>}
                      </div>
                      <div className="step-meta">
                        {step.approver?.role} · {step.status}
                        {step.actionAt && ` · ${new Date(step.actionAt).toLocaleDateString()}`}
                      </div>
                      {step.comment && (
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          "{step.comment}"
                        </div>
                      )}
                    </div>
                    {idx === expense.currentStep && expense.status === 'pending' && (
                      <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>NOW</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Reject Expense</div>
            <div className="form-group">
              <label className="form-label">Reason for rejection *</label>
              <textarea className="form-textarea" value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Please explain why you're rejecting this expense..." rows={4} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={actionLoading || !comment.trim()}>
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
