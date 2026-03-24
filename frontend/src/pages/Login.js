import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../services/apiService';
import { setToken, setUser } from '../services/authService';
import { FiAlertCircle, FiArrowRight, FiBookOpen, FiLock, FiUser } from 'react-icons/fi';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!username || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      const response = await loginAdmin(username, password);
      setToken(response.data.token);
      setUser(response.data.user);
      
      if (response.data.user.role === 'student') {
        navigate('/student-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-600 via-sky-100 to-white flex items-center justify-center px-4 py-8">
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-cyan-300/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-blue-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white/85 backdrop-blur-xl shadow-[0_20px_70px_-25px_rgba(15,23,42,0.45)] p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-300/60">
            <FiBookOpen size={22} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome</h1>
          <p className="mt-2 text-sm text-slate-600">Login to continue</p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/95 p-3">
            <FiAlertCircle className="mt-0.5 flex-shrink-0 text-rose-600" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
            <div className="relative group">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full rounded-xl border border-slate-300/90 bg-white/90 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative group">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-300/90 bg-white/90 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2.5 font-semibold transition hover:from-blue-700 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-300/50"
          >
            {loading ? 'Logging in...' : 'Login'}
            {!loading && <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white/70 p-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Demo Credentials</p>
          <p className="mt-2 text-xs text-slate-600">Admin: <span className="font-mono text-slate-800">admin</span> / <span className="font-mono text-slate-800">admin123</span></p>
          <p className="mt-1 text-xs text-slate-600">Student: <span className="font-mono text-slate-800">student</span> / <span className="font-mono text-slate-800">student123</span></p>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Welcome to Library Management System
        </p>
      </div>
    </div>
  );
};

export default Login;
