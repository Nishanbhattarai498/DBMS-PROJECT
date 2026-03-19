import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../services/apiService';
import { setToken, setUser } from '../services/authService';
import { motion } from 'framer-motion';
import { FiBookOpen, FiAlertCircle, FiUser, FiLock, FiArrowRight } from 'react-icons/fi';

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
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-28 h-[26rem] w-[26rem] rounded-full bg-blue-600/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.25) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden rounded-3xl border border-slate-700/40 bg-slate-900/60 p-10 backdrop-blur-xl lg:block"
          >
            <div className="mb-10 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-500/20 p-3 text-cyan-300">
                <FiBookOpen size={24} />
              </div>
              <div>
                <p className="text-2xl font-extrabold tracking-tight text-white">LibMaster</p>
                <p className="text-sm text-slate-400">Digital Knowledge Hub</p>
              </div>
            </div>

            <h1 className="max-w-md text-4xl font-black leading-tight text-white">
              Access Your Library Workspace In Seconds
            </h1>
            <p className="mt-4 max-w-md text-slate-300">
              Manage books, students, issues, returns, and real-time stats from one modern control panel.
            </p>

            <div className="mt-10 space-y-4">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-slate-300">
                Fast admin and student access
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-slate-300">
                Dashboard insights with live updates
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-slate-300">
                Fine tracking and automated notifications
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="w-full"
          >
            <div className="rounded-3xl border border-slate-700/40 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 lg:mx-0">
                  <FiBookOpen size={24} />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">Welcome Back</h2>
                <p className="mt-2 text-slate-300">Sign in to continue to your dashboard.</p>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
                  <FiAlertCircle className="mt-0.5 flex-shrink-0 text-rose-300" />
                  <p className="text-sm text-rose-200">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Username</label>
                  <div className="group relative">
                    <FiUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/70 py-3 pl-11 pr-4 text-slate-100 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
                  <div className="group relative">
                    <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/70 py-3 pl-11 pr-4 text-slate-100 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Logging in...' : 'Login'}
                  {!loading && <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />}
                </button>
              </form>

              <div className="mt-7 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Demo Credentials</p>
                <p className="mt-2 text-xs text-slate-300">Admin: <span className="font-mono text-cyan-300">admin</span> / <span className="font-mono text-cyan-300">admin123</span></p>
                <p className="mt-1 text-xs text-slate-300">Student: <span className="font-mono text-cyan-300">student</span> / <span className="font-mono text-cyan-300">student123</span></p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
