import React, { useState, useEffect } from 'react';
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
    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${lightColor}`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold mt-2 text-gray-900">{value}</h3>
        {trend && (
          <div className="flex items-center mt-2">
            {trend > 0 ? (
              <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={12} className="mr-1" /> +{trend}%
              </span>
            ) : (
              <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                <ArrowDownRight size={12} className="mr-1" /> {trend}%
              </span>
            )}
            <span className="text-xs text-gray-400 ml-2">vs last month</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${lightColor} ${color}`}>
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

  useEffect(() => {
    fetchStats();
    
    // Real-time updates: Poll the server every 5 seconds for new graph and stat data
    const interval = setInterval(() => {
      // Pass a boolean to fetchStats to not trigger the full-page loading spinner
      fetchStats(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [timeRange, activityRange]);

  const fetchStats = async (showLoading = true) => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight transition-all">Overview</h1>
          <p className="text-gray-500 mt-1">Real-time library activity and metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTimeRange('Yearly')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              timeRange === 'Yearly' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Yearly
          </button>
          <button 
            onClick={() => setTimeRange('Monthly')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              timeRange === 'Monthly' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernStatCard 
          title="Total Books" 
          value={stats.totalBooks} 
          icon={BookOpen} 
          trend={12}
          color="text-blue-600"
          lightColor="bg-blue-50"
        />
        <ModernStatCard 
          title="Active Students" 
          value={stats.totalUsers} 
          icon={Users} 
          trend={8}
          color="text-purple-600"
          lightColor="bg-purple-50"
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
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              Activity Trend
            </h3>
            <select 
              value={activityRange}
              onChange={(e) => setActivityRange(e.target.value)}
              className="bg-gray-50 border-none text-xs font-semibold rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="issued" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorIssued)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Library size={20} className="text-blue-600" />
              Quick Stats
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
              <span className="text-gray-600 text-sm">Books in System</span>
              <span className="font-bold text-gray-900">{stats.totalBooks}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
              <span className="text-gray-600 text-sm">Available for Issue</span>
              <span className="font-bold text-gray-900 text-emerald-600">{stats.totalBooks - stats.issuedBooks}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
              <span className="text-gray-600 text-sm">Action Required (Overdue)</span>
              <span className="font-bold text-gray-900 text-rose-500">{stats.overdueBooks}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">New Students This Week</span>
              <span className="font-bold text-gray-900">{stats.newStudents}</span>
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 bg-opacity-50 rounded-2xl border border-blue-100/50">
               <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Pro Tip</p>
               <p className="text-sm text-blue-700">Check the "Issue/Return" tab to manage active book rentals. Overdue notifications are automatically sent to students.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
