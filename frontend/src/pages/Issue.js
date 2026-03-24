import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   
  RotateCw, 
   
   
  BookOpen, 
  Filter, 
  Loader2, 
   
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getIssuedBooks, issueBook, returnBook, getBooks, getUsers } from '../services/apiService';
import { cn } from '../utils/utils';

const Issue = () => {
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1 });
  const [status, setStatus] = useState('all');
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('');
  const [userBatchFilter, setUserBatchFilter] = useState('');

  const [issueForm, setIssueForm] = useState({
    book_id: '',
    copy_number: '',
    user_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [issuedRes, booksRes, usersRes] = await Promise.all([
        getIssuedBooks(page, 10, status),
        getBooks(1, 1000), // Get all books for dropdown
        getUsers(1, 1000), // Get all users for dropdown
      ]);

      setIssuedBooks(issuedRes.data.issuedBooks);
      setPagination(issuedRes.data.pagination);
      setBooks(booksRes.data.books);
      setUsers(usersRes.data.users);
    } catch (err) {
      setError('Failed to sync circulation data');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleIssueBook = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...issueForm,
        copy_number: issueForm.copy_number ? parseInt(issueForm.copy_number, 10) : undefined,
      };
      const res = await issueBook(payload);
      const copyCode = res.data?.copy_code;
      const copyNumber = res.data?.copy_number;
      setSuccess(
        copyCode
          ? `Book successfully issued (Copy No: ${copyNumber || 'N/A'}, Code: ${copyCode})`
          : 'Book successfully issued'
      );
      setIssueForm({
        book_id: '',
        copy_number: '',
        user_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setShowIssueForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Issuance failed');
    }
  };

  const handleReturnBook = async (id) => {
    try {
      const returnDate = new Date().toISOString().split('T')[0];
      const res = await returnBook({ issue_id: id, return_date: returnDate });
      if (res.data.fine_amount > 0) {
        setSuccess(`Book returned systematically. Late Fine collected: $${res.data.fine_amount}`);
      } else {
        setSuccess('Book returned systematically.');
      }
      fetchData();
    } catch (err) {
      setError('System error during return');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchSearch = userSearchTerm ? (user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || (user.student_id && user.student_id.toLowerCase().includes(userSearchTerm.toLowerCase()))) : true;
    const matchDept = userDeptFilter ? (user.department && user.department.toLowerCase() === userDeptFilter.toLowerCase()) : true;
    const matchBatch = userBatchFilter ? (user.batch_year && user.batch_year.toString() === userBatchFilter) : true;
    return matchSearch && matchDept && matchBatch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Circulation Desk</h1>
          <p className="text-slate-500 mt-2 font-medium">Track book movements and manage student returns.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowIssueForm(true)}
          className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-rose-200 transition-all"
        >
          <ArrowRightLeft className="w-5 h-5" />
          Assign Book
        </motion.button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-red-50 text-red-700 px-6 py-4 rounded-2xl border border-red-100 shadow-sm"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium text-sm">{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-6 py-4 rounded-2xl border border-emerald-100 shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium text-sm">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Quick View (Contextual) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-amber-50 rounded-2xl">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Loans</p>
            <h3 className="text-2xl font-black text-slate-900">
              {issuedBooks.filter(b => b.status === 'issued').length}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 rounded-2xl">
            <RotateCw className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">History Count</p>
            <h3 className="text-2xl font-black text-slate-900">
              {issuedBooks.filter(b => b.status === 'returned').length}
            </h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-400 ml-2" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full bg-transparent border-none focus:ring-0 text-slate-600 font-bold appearance-none bg-no-repeat bg-[right_1rem_center]"
          >
            <option value="all">Filter: View All Records</option>
            <option value="issued">Filter: Currently Loaned</option>
            <option value="returned">Filter: Returned History</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="font-bold text-slate-400 uppercase tracking-[0.2em] text-xs">Syncing Transactions</p>
          </div>
        ) : issuedBooks.length === 0 ? (
          <div className="py-32 text-center opacity-50">
            <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-medium text-slate-500">No circulation records found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Resource Info</th>
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Student Link</th>
                  <th className="px-8 py-5 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                  <th className="px-8 py-5 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issuedBooks.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl">
                          <BookOpen className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{record.title}</p>
                          <p className="text-xs font-medium text-slate-400 mt-0.5">{record.author}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1">Copy No: {record.copy_number || 'N/A'}</p>
                          <p className="text-[10px] font-bold text-indigo-500 mt-1">Copy: {record.copy_code || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                          {record.student_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{record.student_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{record.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">Due: {record.due_date}</span>
                        <span className="text-[10px] font-bold text-slate-300">Issued: {record.issued_date}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={cn(
                          "inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          record.status === 'issued' 
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        )}>
                          {record.status}
                        </span>
                        {record.fine_amount > 0 && (
                          <div className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Fine: ${record.fine_amount}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {record.status === 'issued' ? (
                        <button
                          onClick={() => handleReturnBook(record.id)}
                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100"
                        >
                          <RotateCw size={14} className="animate-pulse" />
                          Receive
                        </button>
                      ) : (
                        <div className="flex items-center justify-end text-slate-300 gap-1 text-[10px] font-bold uppercase tracking-widest">
                          <CheckCircle2 size={14} /> Closed
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {!loading && issuedBooks.length > 0 && (
          <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page {page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Issuance Form (Modern Modal) */}
      <AnimatePresence>
        {showIssueForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                  <ArrowRightLeft className="w-8 h-8 text-rose-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Issue a Book</h2>
                <p className="text-slate-500 font-medium mt-2">Map catalog items to library members.</p>
                
                <form onSubmit={handleIssueBook} className="w-full mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Catalog Item</label>
                    <select
                      required
                      value={issueForm.book_id}
                      onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value, copy_number: '' })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-bold appearance-none bg-no-repeat bg-[right_1.25rem_center]"
                    >
                      <option value="">Choose Book...</option>
                      {books.filter(b => b.available_quantity > 0).map(book => (
                        <option key={book.id} value={book.id}>{book.title} ({book.available_quantity} left)</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Copy Number (Optional Manual Selection)</label>
                    <input
                      type="number"
                      min="1"
                      value={issueForm.copy_number}
                      onChange={(e) => setIssueForm({ ...issueForm, copy_number: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-bold"
                      placeholder="Type copy number like 1, 2, 3..."
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Leave blank to auto-assign the first available copy.
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search & Filter Members</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input 
                        type="text" 
                        placeholder="Search name or ID..." 
                        value={userSearchTerm} 
                        onChange={(e) => setUserSearchTerm(e.target.value)} 
                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-medium"
                      />
                      <select 
                        value={userDeptFilter} onChange={(e) => setUserDeptFilter(e.target.value)}
                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-medium appearance-none"
                      >
                         <option value="">All Departments</option>
                         <option value="BAM">BAM</option>
                         <option value="BCT">BCT</option>
                         <option value="BEX">BEX</option>
                         <option value="BCE">BCE</option>
                         <option value="BME">BME</option>
                         <option value="BEI">BEI</option>
                         <option value="BGE">BGE</option>
                         <option value="BAR">BAR</option>
                      </select>
                      <input 
                         type="number" 
                         placeholder="Batch (e.g. 2079)" 
                         value={userBatchFilter} onChange={(e) => setUserBatchFilter(e.target.value)}
                         className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Recipient</label>
                    <select
                      required
                      value={issueForm.user_id}
                      onChange={(e) => setIssueForm({ ...issueForm, user_id: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-bold appearance-none bg-no-repeat bg-[right_1.25rem_center]"
                    >
                      <option value="">Choose Member...</option>
                      {filteredUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} 
                          {user.student_id ? ` (SID: ${user.student_id})` : ''} 
                          {user.department ? ` - ${user.department}` : ''}
                          {user.batch_year ? ` ${user.batch_year}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Date</label>
                    <input
                      type="date"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-bold"
                      value={issueForm.issue_date}
                      onChange={(e) => setIssueForm({ ...issueForm, issue_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                    <input
                      type="date"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-bold"
                      value={issueForm.due_date}
                      onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 pt-4 flex gap-4">
                    <button type="button" onClick={() => setShowIssueForm(false)} className="flex-1 px-8 py-4 rounded-2xl font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">Discard</button>
                    <button type="submit" className="flex-[2] px-8 py-4 rounded-2xl font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all active:scale-95">Complete Issuance</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Issue;
