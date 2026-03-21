import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Book as BookIcon, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getBooks, addBook, updateBook, deleteBook } from '../services/apiService';
import { cn } from '../utils/utils';
import { getRole } from '../services/authService';

const Books = () => {
  const role = getRole();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [faculty, setfaculty] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    faculty: '',
    isbn: '',
    total_quantity: 1,
  });

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBooks(page, 8, search, faculty);
      setBooks(response.data.books);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to fetch books. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [page, search, faculty]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateBook(editingId, formData);
        setSuccess('Book updated successfully');
      } else {
        await addBook(formData);
        setSuccess('New book added successfully');
      }
      resetForm();
      fetchBooks();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await deleteBook(id);
        setSuccess('Book deleted successfully');
        fetchBooks();
      } catch (err) {
        setError('Failed to delete book');
      }
    }
  };

  const resetForm = () => {
    setFormData({ title: '', author: '', faculty: '', isbn: '', total_quantity: 1 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (book) => {
    setFormData(book);
    setEditingId(book.id);
    setShowForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Library Catalog</h1>
            <p className="text-slate-500 mt-2 font-medium">Browse and search our available collection.</p>
          </div>
          {role === 'admin' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add New Book
            </motion.button>
          )}
      </div>
      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl shadow-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <div className="relative w-full md:w-64">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <select
            value={faculty}
            onChange={(e) => { setfaculty(e.target.value); setPage(1); }}
            className="w-full pl-12 pr-10 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 appearance-none text-slate-700 font-medium"
          >
            <option value="">All Faculties</option>
            <option value="BAM">BAM</option>
            <option value="BCT">BCT</option>
            <option value="BEX">BEX</option>
            <option value="BCE">BCE</option>
            <option value="BME">BME</option>
            <option value="BEI">BEI</option>
            <option value="BGE">BGE</option>
            <option value="BAR">BAR</option>
          </select>
        </div>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Syncing catalog...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-sm mb-4">
            <BookIcon className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No books found</h3>
          <p className="text-slate-500">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {books.map((book, index) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              key={book.id}
              className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <BookIcon className="w-6 h-6 text-blue-600" />
                </div>
                  {role === 'admin' && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(book)} className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(book.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 min-h-[3rem]">
                  {book.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium">{book.author}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50">
                <div className="flex justify-between items-center text-xs">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-bold uppercase tracking-wider">
                    {book.faculty || "Not Assigned"}
                  </span>
                  <span className={cn(
                    "font-bold",
                    book.available_quantity > 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {book.available_quantity}/{book.total_quantity} Left
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && books.length > 0 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 font-medium">
            Page {page} of {pagination.pages}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm">
              {page}
            </div>
            <button
              disabled={page === pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="px-8 pt-8 pb-4 flex justify-between items-center">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {editingId ? 'Edit Collection Item' : 'Add to Collection'}
                </h2>
                <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Title</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Author</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">ISBN</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-mono text-sm"
                        value={formData.isbn}
                        onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Faculty</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900 appearance-none bg-no-repeat bg-[right_1rem_center]"
                        value={formData.faculty}
                        onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      >
                        <option value="">Select Faculty</option>
                        <option value="BAM">BAM</option>
                        <option value="BCT">BCT</option>
                        <option value="BEX">BEX</option>
                        <option value="BCE">BCE</option>
                        <option value="BME">BME</option>
                        <option value="BEI">BEI</option>
                        <option value="BGE">BGE</option>
                        <option value="BAR">BAR</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                        value={formData.total_quantity}
                        onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-4 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                  >
                    {editingId ? 'Save Changes' : 'Confirm Addition'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Books;
