import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup as apiSignup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Signup() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    companyName: '', country: '', currency: null,
  });
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('https://restcountries.com/v3.1/all?fields=name,currencies')
      .then(res => {
        const list = res.data
          .filter(c => c.currencies && Object.keys(c.currencies).length > 0)
          .map(c => {
            const currCode = Object.keys(c.currencies)[0];
            const curr = c.currencies[currCode];
            return {
              name: c.name.common,
              currency: { code: currCode, name: curr.name, symbol: curr.symbol || currCode },
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(list);
      })
      .catch(() => setCountries([]))
      .finally(() => setLoadingCountries(false));
  }, []);

  const handleCountryChange = e => {
    const selected = countries.find(c => c.name === e.target.value);
    setForm({ ...form, country: e.target.value, currency: selected?.currency || null });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.currency) return setError('Please select a country');
    setError(''); setLoading(true);
    try {
      const res = await apiSignup(form);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-title">Create your account</div>
        <div className="auth-sub">You'll be set up as Admin for your company</div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input className="form-input" required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input" required value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Acme Inc." />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@company.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required minLength={6} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Country (sets default currency)</label>
            <select className="form-select" required value={form.country} onChange={handleCountryChange}>
              <option value="">{loadingCountries ? 'Loading countries...' : 'Select country'}</option>
              {countries.map(c => (
                <option key={c.name} value={c.name}>{c.name} — {c.currency.code}</option>
              ))}
            </select>
            {form.currency && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                Company currency: <strong style={{ color: 'var(--text)' }}>{form.currency.name} ({form.currency.code}) {form.currency.symbol}</strong>
              </div>
            )}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading || loadingCountries}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
