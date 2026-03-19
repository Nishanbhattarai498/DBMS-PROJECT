import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import Books from './pages/Books';
import Users from './pages/Users';
import Issue from './pages/Issue';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { isAuthenticated, getRole } from './services/authService';
import './App.css';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const location = useLocation(); // Triggers re-render when route changes
  const role = getRole();
  const authenticated = isAuthenticated();
  const defaultDashboard = role === 'student' ? '/student-dashboard' : '/dashboard';

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={authenticated ? defaultDashboard : '/login'} replace />}
      />
      <Route path="/login" element={<Login />} />

      {authenticated ? (
        <Route
          path="/*"
          element={
            <div className="flex h-screen overflow-hidden bg-slate-50">
              <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
              <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                  <Routes>
                    {role === 'student' ? (
                      <>
                        <Route path="/student-dashboard" element={<StudentDashboard />} />
                        <Route path="/search-books" element={<Books />} />
                        <Route path="*" element={<Navigate to="/student-dashboard" replace />} />
                      </>
                    ) : (
                      <>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/books" element={<Books />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/issues" element={<Issue />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </>
                    )}
                  </Routes>
                </main>
              </div>
            </div>
          }
        />
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
