import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  
  
  Mail,
  ShieldCheck,
  Search,
  BookMarked
} from 'lucide-react';
import { getUser } from '../services/authService';
import { getUserIssuedBooks } from '../services/apiService';
import { cn } from '../utils/utils';

const StudentDashboard = () => {
  const user = getUser();
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUserHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await getUserIssuedBooks(user.id);
      setIssuedBooks(res.data);
    } catch (err) {
      console.error('Failed to load your library history');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserHistory();
  }, [fetchUserHistory]);

  const activeLoans = issuedBooks.filter(b => b.status === 'issued');
  const filteredHistory = issuedBooks.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12 overflow-hidden rounded-3xl p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/35 blur-3xl" />
      <div className="relative z-10 space-y-8">
      {/* Welcome & Profile Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-cyan-800 rounded-2xl p-6 text-white shadow-[0_18px_40px_-22px_rgba(30,58,138,0.7)]">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Welcome, {user?.name}!</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10">
                <Mail className="w-4 h-4 text-indigo-200" />
                {user?.email}
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                Role: {user?.role}
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-48 h-48 bg-indigo-400/10 rounded-full blur-xl" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }} className="bg-white/90 backdrop-blur-sm p-8 rounded-[2rem] border border-slate-200 shadow-[0_15px_35px_-20px_rgba(15,23,42,0.4)] flex items-center gap-6">
          <div className="p-4 bg-cyan-50 rounded-2xl">
            <BookOpen className="w-8 h-8 text-cyan-700" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Active Loans</p>
            <h3 className="text-3xl font-black text-slate-900">{activeLoans.length}</h3>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white/90 backdrop-blur-sm p-8 rounded-[2rem] border border-slate-200 shadow-[0_15px_35px_-20px_rgba(15,23,42,0.4)] flex items-center gap-6">
          <div className="p-4 bg-teal-50 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-teal-700" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Books Returned</p>
            <h3 className="text-3xl font-black text-slate-900">{issuedBooks.length - activeLoans.length}</h3>
          </div>
        </motion.div>

        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2rem] border border-slate-200 shadow-[0_15px_35px_-20px_rgba(15,23,42,0.4)] flex items-center gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl w-full border border-slate-100">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search history..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-900 font-bold placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Primary Content: History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookMarked className="text-indigo-600" /> My Reading Hub
            </h2>
          </div>

          {loading ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] border border-slate-200 p-20 flex flex-col items-center justify-center space-y-4 shadow-[0_15px_35px_-20px_rgba(15,23,42,0.4)]">
              <Clock className="w-10 h-10 text-cyan-300 animate-spin" />
              <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Cataloging Workspace...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] border border-slate-200 p-20 flex flex-col items-center justify-center space-y-4 shadow-[0_15px_35px_-20px_rgba(15,23,42,0.4)] text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                <BookOpen className="w-10 h-10 text-slate-200" />
              </div>
              <p className="font-bold text-slate-400">{searchTerm ? "No results found for your search." : "You haven't issued any books yet."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHistory.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] border border-slate-200 shadow-[0_15px_35px_-20px_rgba(15,23,42,0.35)] hover:shadow-[0_20px_45px_-24px_rgba(15,23,42,0.45)] transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      item.status === 'issued' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {item.status}
                    </div>
                    {item.status === 'issued' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase">
                        <AlertCircle size={12} /> Pending Return
                      </div>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-1">{item.title}</h4>
                  <p className="text-sm text-slate-400 font-medium mb-4">{item.author}</p>
                  
                  <div className="space-y-2 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400 uppercase tracking-tighter">Issue Date</span>
                      <span className="text-slate-900">{item.issued_date}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400 uppercase tracking-tighter">Due Date</span>
                      <span className="text-indigo-600">{item.due_date}</span>
                    </div>
                    {item.return_date && (
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400 uppercase tracking-tighter">Returned On</span>
                        <span className="text-emerald-600">{item.return_date}</span>
                      </div>
                    )}
                    {item.fine_amount > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-rose-400 uppercase tracking-tighter">Late Fine Paid</span>
                        <span className="text-rose-600 font-black">${item.fine_amount}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Library Guidelines or Info */}
        <div className="space-y-6">
          <div className="bg-cyan-50/80 border border-cyan-100 rounded-[2.5rem] p-8 backdrop-blur-sm">
            <h3 className="text-lg font-black text-cyan-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Library Rules
            </h3>
            <ul className="space-y-4">
              {[
                "Borrow up to 3 books at a time",
                "Due date limit is strictly 14 days",
                "Late returns incur a small fine",
                "Return books in good condition"
              ].map((rule, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
                  <p className="text-sm font-medium text-cyan-900/70">{rule}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-[0_20px_45px_-25px_rgba(15,23,42,0.7)]">
            <h3 className="text-lg font-black mb-2 relative z-10">Need Help?</h3>
            <p className="text-slate-400 text-sm font-medium mb-6 relative z-10">Contact the librarian for any issues with book returns or account locks.</p>
            <button className="w-full bg-white text-slate-900 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors relative z-10">
              Email Support
            </button>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
