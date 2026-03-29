import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = {
  admin: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/expenses', label: 'All Expenses' },
    { path: '/approvals', label: 'Pending Approvals' },
    { path: '/users', label: 'Users' },
    { path: '/approval-rules', label: 'Approval Rules' },
  ],
  manager: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/expenses', label: 'Team Expenses' },
    { path: '/approvals', label: 'Pending Approvals' },
  ],
  employee: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/expenses', label: 'My Expenses' },
    { path: '/expenses/new', label: 'Submit Expense' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = NAV[user?.role] || [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          Reimburse
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div
              key={item.path}
              className={`nav-item ${location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.name}</div>
          <div className="sidebar-role">{user?.role} · {user?.company?.currency?.code}</div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
            onClick={() => { logout(); navigate('/login'); }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
