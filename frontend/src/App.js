import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import NewExpense from './pages/NewExpense';
import ExpenseDetail from './pages/ExpenseDetail';
import Approvals from './pages/Approvals';
import Users from './pages/Users';
import ApprovalRules from './pages/ApprovalRules';
import  UserDashboard from './pages/userDashboard';
import  UserLoginPage from './pages/userlogin';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
      <Route path="/expenses/new" element={<PrivateRoute roles={['employee', 'admin']}><NewExpense /></PrivateRoute>} />
      <Route path="/expenses/:id" element={<PrivateRoute><ExpenseDetail /></PrivateRoute>} />
      <Route path="/approvals" element={<PrivateRoute roles={['manager', 'admin']}><Approvals /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute roles={['admin']}><Users /></PrivateRoute>} />
      <Route path="/approval-rules" element={<PrivateRoute roles={['admin']}><ApprovalRules /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/user" element={<UserDashboard></UserDashboard>} />
      <Route path="/userlogin" element={<UserLoginPage></UserLoginPage>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
