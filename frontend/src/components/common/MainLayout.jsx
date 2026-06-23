// frontend/src/components/common/MainLayout.jsx
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, BookOpen, Trophy, Bot, BarChart2, Settings,
  PlusCircle, Bell, LogOut, User, Shield, Menu, X, Moon, Sun,
  ChevronDown, Flame, Bookmark
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/api';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/',           icon: Home,      label: 'Home' },
  { path: '/explore',    icon: Search,    label: 'Explore FAQs' },
  { path: '/ai-assistant', icon: Bot,     label: 'AI Assistant' },
  { path: '/leaderboard', icon: Trophy,   label: 'Leaderboard' },
  { path: '/analytics',  icon: BarChart2, label: 'Analytics' },
];

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => userService.getNotifications({ limit: 1 }),
    enabled: isAuthenticated,
    refetchInterval: 30000,
    select: (d) => d.data?.data?.unread_count || 0,
  });

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setDark(!dark);
    localStorage.setItem('theme', !dark ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-primary-color flex">
      {/* ---- SIDEBAR (desktop) ---- */}
      <aside className="hidden lg:flex flex-col w-64 fixed h-full z-40 border-r border-color glass-card">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-color">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-sm gradient-text">Vicharanshala</p>
              <p className="text-xs text-secondary-color">IIT Ropar</p>
            </div>
          </Link>
        </div>

        {/* Ask Question CTA */}
        {isAuthenticated && (
          <div className="px-4 py-4">
            <Link to="/ask">
              <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-glow-sm hover:shadow-glow-md text-sm">
                <PlusCircle className="w-4 h-4" />
                Ask Question
              </button>
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link key={path} to={path}>
              <div className={`nav-item ${isActive(path) ? 'active text-primary-300' : 'text-secondary-color hover:text-primary-color'}`}>
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {path === '/explore' && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-orange-400">
                    <Flame className="w-3 h-3" />
                  </span>
                )}
              </div>
            </Link>
          ))}

          {isAuthenticated && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs font-semibold text-secondary-color uppercase tracking-wider">My Space</p>
              </div>
              <Link to={`/users/${user?.username}`}>
                <div className={`nav-item ${isActive(`/users/${user?.username}`) ? 'active text-primary-300' : 'text-secondary-color'}`}>
                  <User className="w-4 h-4" />
                  <span>My Profile</span>
                </div>
              </Link>
              <Link to="/settings">
                <div className={`nav-item ${isActive('/settings') ? 'active text-primary-300' : 'text-secondary-color'}`}>
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </div>
              </Link>
              {['admin', 'superadmin'].includes(user?.role) && (
                <Link to="/admin">
                  <div className={`nav-item ${isActive('/admin') ? 'active text-primary-300' : 'text-secondary-color'}`}>
                    <Shield className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </div>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* User profile section */}
        <div className="border-t border-color p-3">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all"
              >
                <div className="relative">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {user?.full_name?.[0] || 'U'}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-900"></span>
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-semibold text-primary-color truncate">{user?.full_name}</p>
                  <p className="text-xs text-secondary-color capitalize">{user?.role}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-secondary-color transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full mb-2 left-0 right-0 glass-card rounded-xl p-1.5 z-50"
                  >
                    <button onClick={toggleTheme} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-color hover:text-primary-color hover:bg-white/5 rounded-lg transition-all">
                      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      {dark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login">
                <button className="w-full text-sm py-2 px-4 rounded-xl border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 transition-all">
                  Sign In
                </button>
              </Link>
              <Link to="/register">
                <button className="w-full text-sm py-2 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium transition-all">
                  Get Started
                </button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="absolute left-0 top-0 h-full w-72 glass-card border-r border-color z-50 p-4"
            >
              <div className="flex justify-between items-center mb-6">
                <p className="font-display font-bold gradient-text">Vicharanshala Lab</p>
                <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5 text-secondary-color" /></button>
              </div>
              <nav className="space-y-1">
                {navItems.map(({ path, icon: Icon, label }) => (
                  <Link key={path} to={path} onClick={() => setSidebarOpen(false)}>
                    <div className={`nav-item ${isActive(path) ? 'active text-primary-300' : 'text-secondary-color'}`}>
                      <Icon className="w-4 h-4" /><span>{label}</span>
                    </div>
                  </Link>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top nav bar */}
        <header className="sticky top-0 z-30 glass-card border-b border-color px-4 py-3 flex items-center justify-between gap-4">
          <button className="lg:hidden p-2 rounded-lg hover:bg-white/10" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-secondary-color" />
          </button>

          {/* Search bar */}
          <div className="flex-1 max-w-xl">
            <Link to="/explore?focus=1">
              <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-500/30 rounded-xl px-4 py-2 cursor-pointer transition-all group">
                <Search className="w-4 h-4 text-secondary-color group-hover:text-primary-400 transition-colors" />
                <span className="text-sm text-secondary-color group-hover:text-primary-400 transition-colors">Search questions, topics...</span>
                <kbd className="ml-auto text-xs text-secondary-color bg-white/5 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
              </div>
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-white/10 text-secondary-color transition-all">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated && (
              <>
                <Link to="/settings" className="relative p-2 rounded-xl hover:bg-white/10 text-secondary-color transition-all">
                  <Bell className="w-4 h-4" />
                  {notifData > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {notifData > 9 ? '9+' : notifData}
                    </span>
                  )}
                </Link>
                <Link to="/ask">
                  <button className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white text-sm font-medium py-2 px-3 rounded-xl transition-all shadow-glow-sm">
                    <PlusCircle className="w-4 h-4" />
                    Ask
                  </button>
                </Link>
              </>
            )}
            {!isAuthenticated && (
              <Link to="/login">
                <button className="text-sm py-2 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium">
                  Sign In
                </button>
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
