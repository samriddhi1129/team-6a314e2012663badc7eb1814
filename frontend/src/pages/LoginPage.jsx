// frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { BookOpen, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { authService } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  const from = location.state?.from?.pathname || '/explore';

  const mutation = useMutation({
    mutationFn: () => authService.login({ email, password }),
    onSuccess: (d) => {
      setAuth(d.data.data);
      toast.success(`Welcome back, ${d.data.data.user.full_name}!`);
      navigate(from, { replace: true });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Login failed'),
  });

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/auth/google`;
  };

  return (
    <div className="min-h-screen gradient-bg hero-pattern flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-white text-lg leading-tight">Vicharanshala Lab</p>
              <p className="text-white/60 text-xs">IIT Ropar</p>
            </div>
          </Link>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-white/10">
          <h1 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/60 text-sm mb-8">Sign in to continue to Vicharanshala Lab</p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/40 text-xs">or sign in with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/Password form */}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-white/5 border border-white/10 focus:border-primary-400/60 focus:bg-white/8 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 outline-none transition-all text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && mutation.mutate()}
                placeholder="Password"
                className="w-full bg-white/5 border border-white/10 focus:border-primary-400/60 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/30 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-2 mb-6">
            <Link to="/forgot-password" className="text-xs text-primary-300 hover:text-primary-200 transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !email || !password}
            className="w-full bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-400 hover:to-purple-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>Sign In <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="text-center text-white/50 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-300 hover:text-primary-200 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 glass-card rounded-2xl p-4 border border-white/10">
          <p className="text-xs text-white/50 text-center mb-2">Demo credentials</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => { setEmail('admin@vicharanshala.iitropar.ac.in'); setPassword('Admin@123!'); }}
              className="text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-white/60"
            >
              <p className="font-medium text-white/80">Admin</p>
              <p className="truncate">admin@vicharanshala...</p>
            </button>
            <button
              onClick={() => { setEmail('priya.sharma@research.iitropar.ac.in'); setPassword('Demo@1234'); }}
              className="text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-white/60"
            >
              <p className="font-medium text-white/80">Researcher</p>
              <p className="truncate">priya.sharma@...</p>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
