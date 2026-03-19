import React from 'react';
import { FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { clearAuth, getUser } from '../services/authService';

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const user = getUser() || {};

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-md shadow-sm border-b border-white/40">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden text-gray-600 hover:text-gray-900"
        >
          {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        <div className="flex-1"></div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{user.username || user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role || 'User'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Logout"
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
