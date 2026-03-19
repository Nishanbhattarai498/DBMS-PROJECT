import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Library
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'framer-motion';
import { getDashboardStats } from '../services/apiService';

const ModernStatCard = ({ title, value, icon: Icon, trend, color, lightColor }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/85 backdrop-blur-sm p-6 rounded-2xl shadow-[0_10px_30px_-15px_rgba(15,23,42,0.35)] border border-slate-200/70 hover:shadow-[0_18px_45px_-20px_rgba(14,116,144,0.45)] transition-all relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${lightColor}`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold mt-2 text-slate-900">{value}</h3>
        {trend && (
          <div className="flex items-center mt-2">
            {trend > 0 ? (
              <span className="flex items-center text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={12} className="mr-1" /> +{trend}%
              </span>
            ) : (
              <span className="flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                <ArrowDownRight size={12} className="mr-1" /> {trend}%
              </span>
            )}
            <span className="text-xs text-slate-400 ml-2">vs last month</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ring-1 ring-slate-200/60 ${lightColor} ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('Monthly');
  const [activityRange, setActivityRange] = useState('Last 7 Days');
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    issuedBooks: 0,
    returnedBooks: 0,
    overdueBooks: 0,
    newStudents: 0,
    chartData: [
      { name: 'Mon', issued: 0, returned: 0 },
      { name: 'Tue', issued: 0, returned: 0 },
      { name: 'Wed', issued: 0, returned: 0 },
      { name: 'Thu', issued: 0, returned: 0 },
      { name: 'Fri', issued: 0, returned: 0 },
      { name: 'Sat', issued: 0, returned: 0 },
      { name: 'Sun', issued: 0, returned: 0 },
    ]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await getDashboardStats(timeRange, activityRange);
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, activityRange]);

  useEffect(() => {
    fetchStats();

    // Real-time updates: Poll the server every 5 seconds for new graph and stat data
    const interval = setInterval(() => {
      // Pass a boolean to fetchStats to not trigger the full-page loading spinner
      fetchStats(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-50/70 via-slate-50 to-white p-5 sm:p-7">
      <div className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-indigo-200/35 blur-3xl" />

      <div className="relative z-10 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight transition-all">Overview</h1>
            <p className="text-slate-500 mt-1">Real-time library activity and metrics.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTimeRange('Yearly')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                timeRange === 'Yearly' 
                  ? 'bg-slate-900 text-cyan-200 shadow-lg shadow-slate-300/70 hover:bg-slate-800' 
                  : 'bg-white/80 border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Yearly
            </button>
            <button 
              onClick={() => setTimeRange('Monthly')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                timeRange === 'Monthly' 
                  ? 'bg-slate-900 text-cyan-200 shadow-lg shadow-slate-300/70 hover:bg-slate-800' 
                  : 'bg-white/80 border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ModernStatCard 
            title="Total Books" 
            value={stats.totalBooks} 
            icon={BookOpen} 
            trend={12}
            color="text-cyan-700"
            lightColor="bg-cyan-50"
          />
          <ModernStatCard 
            title="Active Students" 
            value={stats.totalUsers} 
            icon={Users} 
            trend={8}
            color="text-indigo-700"
            lightColor="bg-indigo-50"
          />
          <ModernStatCard 
            title="Books Issued" 
            value={stats.issuedBooks} 
            icon={Clock} 
            trend={-2}
            color="text-amber-600"
            lightColor="bg-amber-50"
          />
          <ModernStatCard 
            title="Returned" 
            value={stats.returnedBooks} 
            icon={CheckCircle2} 
            trend={15}
            color="text-emerald-600"
            lightColor="bg-emerald-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-[0_15px_35px_-20px_rgba(15,23,42,0.4)] border border-slate-200/70"
          >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-cyan-700" />
              Activity Trend
            </h3>
            <select 
              value={activityRange}
              onChange={(e) => setActivityRange(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="issued" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorIssued)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-[0_15px_35px_-20px_rgba(15,23,42,0.4)] border border-slate-200/70"
          >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Library size={20} className="text-cyan-700" />
              Quick Stats
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-600 text-sm">Books in System</span>
              <span className="font-bold text-slate-900">{stats.totalBooks}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-600 text-sm">Available for Issue</span>
              <span className="font-bold text-teal-700">{stats.totalBooks - stats.issuedBooks}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-600 text-sm">Action Required (Overdue)</span>
              <span className="font-bold text-rose-500">{stats.overdueBooks}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">New Students This Week</span>
              <span className="font-bold text-slate-900">{stats.newStudents}</span>
            </div>
            
            <div className="mt-8 p-4 bg-cyan-50/70 rounded-2xl border border-cyan-100/80">
               <p className="text-xs font-semibold text-cyan-900 uppercase tracking-wider mb-2">Pro Tip</p>
               <p className="text-sm text-cyan-800">Check the "Issue/Return" tab to manage active book rentals. Overdue notifications are automatically sent to students.</p>
            </div>
          </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
