import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Book, 
  Users, 
  ArrowLeftRight, 
  Library,
  
  Search
} from 'lucide-react';
import { getRole } from '../services/authService';
import { cn } from '../utils/utils';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const role = getRole();
  
  const adminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/books', label: 'Books', icon: Book },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/issues', label: 'Issue/Return', icon: ArrowLeftRight },
  ];

  const studentNavItems = [
    { path: '/student-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { path: '/search-books', label: 'Search Books', icon: Search },
  ];

  const navItems = role === 'admin' ? adminNavItems : studentNavItems;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 border-r border-slate-800",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full bg-slate-900">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Library className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">LibMaster</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-6">
            <div className="px-4 mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                Main Menu
              </p>
            </div>
            <nav className="space-y-1 px-2">
              {navItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                      isActive
                        ? "bg-blue-600/10 text-blue-500 font-medium"
                        : "hover:bg-slate-800 hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        isActive ? "text-blue-500" : "text-slate-500 group-hover:text-slate-300"
                      )} />
                      <span className="flex-1 text-sm">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate capitalize">
                  {role || 'Guest'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  Role Account
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
