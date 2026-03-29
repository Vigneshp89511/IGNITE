import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createExpense, ocrExtract } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Software', 'Hardware', 'Office Supplies', 'Marketing', 'Training', 'Medical', 'Miscellaneous'];

export default function NewExpense() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    description: '', category: '', date: new Date().toISOString().slice(0, 10),
    amount: '', currency: user?.company?.currency?.code || 'USD',
  });
  const [receipt, setReceipt] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  useEffect(() => {
    // Load all currencies from countries API
    axios.get('https://restcountries.com/v3.1/all?fields=name,currencies')
      .then(res => {
        const set = new Set();
        const list = [];
        res.data.forEach(c => {
          Object.entries(c.currencies || {}).forEach(([code, curr]) => {
            if (!set.has(code)) { set.add(code); list.push({ code, name: curr.name, symbol: curr.symbol }); }
          });
        });
        setCurrencies(list.sort((a, b) => a.code.localeCompare(b.code)));
      }).catch(() => {});
  }, []);

  const handleOCR = async () => {
    if (!receipt) return;
    setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.append('receipt', receipt);
      const res = await ocrExtract(fd);
      const { extracted, receiptUrl } = res.data;
      setOcrResult(extracted);
      if (extracted.amount) setForm(f => ({ ...f, amount: String(extracted.amount) }));
      if (extracted.date) {
        const parsed = new Date(extracted.date);
        if (!isNaN(parsed)) setForm(f => ({ ...f, date: parsed.toISOString().slice(0, 10) }));
      }
    } catch {
      setError('OCR failed. Please fill in manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (receipt) fd.append('receipt', receipt);
      const res = await createExpense(fd);
      navigate(`/expenses/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <div className="page-title">Submit Expense</div>
            <div className="page-sub">Fill in the details or scan a receipt</div>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Upload Receipt (optional)</div>
          <input
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            id="receipt-input"
            onChange={e => { setReceipt(e.target.files[0]); setOcrResult(null); }}
          />
          <label htmlFor="receipt-input" className="ocr-btn">
            {receipt ? `${receipt.name}` : 'Click to upload receipt image'}
          </label>
          {receipt && (
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 10 }}
              onClick={handleOCR}
              disabled={ocrLoading}
            >
              {ocrLoading ? 'Scanning...' : 'Auto-fill via OCR'}
            </button>
          )}
          {ocrResult && (
            <div className="alert alert-success" style={{ marginTop: 10 }}>
              OCR extracted — Amount: {ocrResult.amount || 'N/A'}, Date: {ocrResult.date || 'N/A'}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Expense Details</div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <input className="form-input" required value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Team lunch at Olive Garden" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" required value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" required value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount *</label>
                <input className="form-input" type="number" min="0.01" step="0.01" required value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Currency *</label>
                <select className="form-select" value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}>
                  <option value={user?.company?.currency?.code}>{user?.company?.currency?.code} (Company default)</option>
                  {currencies.filter(c => c.code !== user?.company?.currency?.code).map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {form.currency !== user?.company?.currency?.code && (
              <div className="alert" style={{ background: 'rgba(79,124,255,0.08)', border: '1px solid rgba(79,124,255,0.3)', color: 'var(--primary)', marginBottom: 14 }}>
                Amount will be converted to {user?.company?.currency?.code} for approval
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
