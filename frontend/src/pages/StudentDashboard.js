import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Mail,
  ShieldCheck,
  Search,
  BookMarked,
  X, Save, Edit2,
  CalendarDays,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { getUser } from '../services/authService';
import { getUserIssuedBooks, getUserById, updateUser, changePassword } from '../services/apiService';
import { cn } from '../utils/utils';

const StudentDashboard = () => {
  const user = getUser();
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileData, setProfileData] = useState({ student_id: '', semester: '', department: '', batch_year: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (showProfileModal || showPasswordModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showProfileModal, showPasswordModal]);
  
  const fetchFullProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await getUserById(user.id);
      setProfileData({
        student_id: res.data.student_id || '',
        semester: res.data.semester || '',
        department: res.data.department || '',
        batch_year: res.data.batch_year || ''
      });
    } catch (err) {
      console.error('Failed to fetch full profile');
    }
  }, [user?.id]);
  
  useEffect(() => {
    fetchFullProfile();
  }, [fetchFullProfile]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateUser(user.id, profileData);
      setShowProfileModal(false);
      fetchFullProfile();
      alert('Profile updated successfully');
    } catch (err) {
      console.error("Update failed", err);
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setPasswordError('Please fill all password fields');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    if (passwordForm.current_password === passwordForm.new_password) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess(res.data?.message || 'Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        resetPasswordForm();
      }, 1200);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

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

  const activeLoans = useMemo(() => issuedBooks.filter((b) => b.status === 'issued'), [issuedBooks]);
  const nextDueBook = useMemo(() => {
    if (activeLoans.length === 0) return null;
    const sorted = [...activeLoans].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    return sorted[0];
  }, [activeLoans]);

  const filteredHistory = issuedBooks.filter((b) => {
    const title = String(b.title || '').toLowerCase();
    const author = String(b.author || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return title.includes(q) || author.includes(q);
  });

  return (
    <div className="relative max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12 overflow-hidden rounded-3xl p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/35 blur-3xl" />
      <div className="relative z-10 space-y-8">
      {/* Welcome & Profile Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-sky-50 to-cyan-50 rounded-3xl p-6 md:p-8 text-slate-900 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.35)] border border-slate-200">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Welcome, {user?.name}!</h1>
            <p className="text-slate-600 text-sm font-medium">Your personal library space is ready.</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
              {nextDueBook && (
                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg text-sm font-medium border border-amber-200">
                  <CalendarDays className="w-4 h-4 text-amber-600" />
                  Next Due: {nextDueBook.due_date}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-cyan-100/70 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-48 h-48 bg-indigo-100/70 rounded-full blur-xl" />
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
          >
            <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-indigo-50/30">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Edit Profile</h2>
                <p className="text-sm text-indigo-600/70 font-bold uppercase tracking-wider mt-1">Student Details</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-white rounded-full transition-shadow shadow-sm">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleProfileUpdate} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Student ID</label>
                  <input
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500/50 focus:bg-white transition-all outline-none text-slate-900 font-medium"
                    value={profileData.student_id}
                    onChange={(e) => setProfileData({ ...profileData, student_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Semester</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500/50 focus:bg-white transition-all outline-none text-slate-900 font-medium"
                    value={profileData.semester}
                    onChange={(e) => setProfileData({ ...profileData, semester: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Department</label>
                  <input
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500/50 focus:bg-white transition-all outline-none text-slate-900 font-medium"
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Batch Year</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500/50 focus:bg-white transition-all outline-none text-slate-900 font-medium"
                    value={profileData.batch_year}
                    onChange={(e) => setProfileData({ ...profileData, batch_year: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
                <Save className="w-5 h-5" /> Save Changes
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
          >
            <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-indigo-50/30">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Change Password</h2>
                <p className="text-sm text-indigo-600/70 font-bold uppercase tracking-wider mt-1">Security Settings</p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  resetPasswordForm();
                }}
                className="p-2 hover:bg-white rounded-full transition-shadow shadow-sm"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="p-8 space-y-4">
              {passwordError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 font-medium">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 font-medium">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Current Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500/50 focus:bg-white transition-all outline-none text-slate-900 font-medium"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500/50 focus:bg-white transition-all outline-none text-slate-900 font-medium"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500/50 focus:bg-white transition-all outline-none text-slate-900 font-medium"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  disabled={passwordLoading}
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-5 h-5" /> {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

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
                  <div className="mb-4 inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Copy No: {item.copy_number || 'N/A'}
                  </div>
                  
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

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] max-w-xl">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Account Controls</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Mail className="w-4 h-4 text-indigo-500" />
                {user?.email}
              </div>
              <div className="flex items-center gap-2 text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Role: {user?.role}
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 transition-colors px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300"
              >
                <Edit2 className="w-4 h-4 text-slate-700" />
                Edit Profile
              </button>
              <button
                onClick={() => {
                  resetPasswordForm();
                  setShowPasswordModal(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-colors px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-900"
              >
                <KeyRound className="w-4 h-4" />
                Change Password
              </button>
            </div>
          </div>
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

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 text-slate-900 relative overflow-hidden shadow-[0_15px_35px_-20px_rgba(15,23,42,0.35)]">
            <h3 className="text-lg font-black mb-2 relative z-10">Need Help?</h3>
            <p className="text-slate-500 text-sm font-medium mb-6 relative z-10">Contact the librarian for any issues with book returns or account locks.</p>
            <a href="mailto:library.support@example.com" className="block w-full text-center bg-slate-900 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors relative z-10">
              Email Support
            </a>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-cyan-100 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
