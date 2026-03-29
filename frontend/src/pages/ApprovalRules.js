import React, { useState, useEffect } from 'react';
import { getApprovalRules, createApprovalRule, updateApprovalRule, deleteApprovalRule, getUsers } from '../services/api';

export default function ApprovalRules() {
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: '', description: '', category: '', amountThreshold: '',
    isManagerApprover: false,
    approvers: [], // [{userId, order}]
    conditionalApproval: {
      enabled: false, percentageThreshold: '', specificApprover: '', hybridMode: false,
    },
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [r, u] = await Promise.all([getApprovalRules(), getUsers()]);
    setRules(r.data);
    setUsers(u.data.filter(u => u.isActive));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditRule(null); setForm(emptyForm); setError(''); setShowModal(true); };

  const openEdit = rule => {
    setEditRule(rule);
    setForm({
      name: rule.name,
      description: rule.description || '',
      category: rule.category || '',
      amountThreshold: rule.amountThreshold != null ? String(rule.amountThreshold) : '',
      isManagerApprover: rule.isManagerApprover,
      approvers: rule.approvers.map(a => ({ userId: a.user._id, order: a.order })),
      conditionalApproval: {
        enabled: rule.conditionalApproval?.enabled || false,
        percentageThreshold: rule.conditionalApproval?.percentageThreshold != null ? String(rule.conditionalApproval.percentageThreshold) : '',
        specificApprover: rule.conditionalApproval?.specificApprover?._id || rule.conditionalApproval?.specificApprover || '',
        hybridMode: rule.conditionalApproval?.hybridMode || false,
      },
    });
    setError('');
    setShowModal(true);
  };

  const addApprover = () => {
    const order = form.approvers.length;
    setForm({ ...form, approvers: [...form.approvers, { userId: '', order }] });
  };

  const removeApprover = idx => {
    const updated = form.approvers.filter((_, i) => i !== idx).map((a, i) => ({ ...a, order: i }));
    setForm({ ...form, approvers: updated });
  };

  const updateApprover = (idx, userId) => {
    const updated = [...form.approvers];
    updated[idx] = { ...updated[idx], userId };
    setForm({ ...form, approvers: updated });
  };

  const handleSave = async () => {
    if (!form.name) return setError('Name is required');
    if (form.approvers.length === 0 && !form.isManagerApprover) return setError('Add at least one approver');
    if (form.approvers.some(a => !a.userId)) return setError('Select a user for each approver slot');

    setError(''); setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      category: form.category || null,
      amountThreshold: form.amountThreshold !== '' ? parseFloat(form.amountThreshold) : null,
      isManagerApprover: form.isManagerApprover,
      approvers: form.approvers.map(a => ({ user: a.userId, order: a.order })),
      conditionalApproval: {
        enabled: form.conditionalApproval.enabled,
        percentageThreshold: form.conditionalApproval.percentageThreshold !== '' ? parseFloat(form.conditionalApproval.percentageThreshold) : null,
        specificApprover: form.conditionalApproval.specificApprover || null,
        hybridMode: form.conditionalApproval.hybridMode,
      },
    };
    try {
      if (editRule) await updateApprovalRule(editRule._id, payload);
      else await createApprovalRule(payload);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this rule?')) return;
    await deleteApprovalRule(id);
    load();
  };

  const setCA = patch => setForm(f => ({ ...f, conditionalApproval: { ...f.conditionalApproval, ...patch } }));

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <div className="page-title">Approval Rules</div>
            <div className="page-sub">Define who approves what, in which order</div>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ New Rule</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : rules.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚙</div>
            <div>No approval rules yet</div>
            <div className="text-muted text-sm" style={{ marginTop: 6 }}>Without rules, expenses are auto-approved</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={openCreate}>Create first rule</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map(rule => (
            <div className="card" key={rule._id}>
              <div className="flex-between">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{rule.name}</div>
                  {rule.description && <div className="text-muted text-sm" style={{ marginTop: 2 }}>{rule.description}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {rule.category && <span className="badge badge-draft">Category: {rule.category}</span>}
                    {rule.amountThreshold != null && <span className="badge badge-draft">Threshold: &gt; {rule.amountThreshold}</span>}
                    {rule.isManagerApprover && <span className="badge badge-manager">Manager first</span>}
                    {rule.conditionalApproval?.enabled && <span className="badge badge-pending">Conditional</span>}
                    <span className={`badge ${rule.isActive ? 'badge-approved' : 'badge-rejected'}`}>{rule.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(rule)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rule._id)}>Delete</button>
                </div>
              </div>

              {/* Approver chain */}
              <div style={{ marginTop: 12 }}>
                <div className="form-label">Approval chain</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {rule.isManagerApprover && (
                    <div style={{ padding: '4px 10px', background: 'rgba(168,85,247,0.1)', borderRadius: 999, fontSize: 12, color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
                      Step 0: Employee's Manager
                    </div>
                  )}
                  {[...rule.approvers].sort((a, b) => a.order - b.order).map((a, i) => (
                    <div key={i} style={{ padding: '4px 10px', background: 'var(--bg-input)', borderRadius: 999, fontSize: 12, border: '1px solid var(--border)' }}>
                      Step {rule.isManagerApprover ? i + 1 : i}: {a.user?.name} ({a.user?.role})
                    </div>
                  ))}
                  {rule.approvers.length === 0 && !rule.isManagerApprover && (
                    <span className="text-muted text-sm">No approvers defined</span>
                  )}
                </div>
              </div>

              {/* Conditional info */}
              {rule.conditionalApproval?.enabled && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                  <strong>Conditional:</strong>{' '}
                  {rule.conditionalApproval.percentageThreshold != null && `${rule.conditionalApproval.percentageThreshold}% approval`}
                  {rule.conditionalApproval.hybridMode && ' OR '}
                  {rule.conditionalApproval.specificApprover && `Specific approver override`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editRule ? 'Edit Rule' : 'Create Approval Rule'}</div>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Rule Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Approval rule for miscellaneous expenses" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category filter (blank = all)</label>
                <input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Travel" />
              </div>
              <div className="form-group">
                <label className="form-label">Amount threshold (applies if &gt; this)</label>
                <input className="form-input" type="number" value={form.amountThreshold} onChange={e => setForm({ ...form, amountThreshold: e.target.value })} placeholder="e.g. 1000 (blank = all)" />
              </div>
            </div>

            <hr className="divider" />

            {/* Manager first toggle */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.isManagerApprover}
                  onChange={e => setForm({ ...form, isManagerApprover: e.target.checked })} />
                <span><strong>Is Manager Approver</strong> — Employee's manager must approve first</span>
              </label>
            </div>

            {/* Approvers */}
            <div className="form-group">
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Approvers (in order)</label>
                <button className="btn btn-ghost btn-sm" type="button" onClick={addApprover}>+ Add Approver</button>
              </div>
              {form.approvers.length === 0 && (
                <div className="text-muted text-sm">No approvers added. Use "Add Approver" to build the chain.</div>
              )}
              {form.approvers.map((a, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <span className="text-muted text-sm" style={{ width: 24, flexShrink: 0 }}>#{idx + 1}</span>
                  <select className="form-select" value={a.userId} onChange={e => updateApprover(idx, e.target.value)}>
                    <option value="">Select user</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                  </select>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => removeApprover(idx)}>✕</button>
                </div>
              ))}
            </div>

            <hr className="divider" />

            {/* Conditional approval */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 10 }}>
                <input type="checkbox" checked={form.conditionalApproval.enabled}
                  onChange={e => setCA({ enabled: e.target.checked })} />
                <span><strong>Conditional Approval</strong> — Auto-approve based on rules</span>
              </label>

              {form.conditionalApproval.enabled && (
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Percentage threshold — if X% of approvers approve → auto-approved</label>
                    <input className="form-input" type="number" min="0" max="100"
                      value={form.conditionalApproval.percentageThreshold}
                      onChange={e => setCA({ percentageThreshold: e.target.value })}
                      placeholder="e.g. 60 (blank = disabled)" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specific approver — if this person approves → auto-approved</label>
                    <select className="form-select" value={form.conditionalApproval.specificApprover}
                      onChange={e => setCA({ specificApprover: e.target.value })}>
                      <option value="">None</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                  {form.conditionalApproval.percentageThreshold && form.conditionalApproval.specificApprover && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={form.conditionalApproval.hybridMode}
                        onChange={e => setCA({ hybridMode: e.target.checked })} />
                      <span>Hybrid mode — percentage OR specific approver (either triggers auto-approval)</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
