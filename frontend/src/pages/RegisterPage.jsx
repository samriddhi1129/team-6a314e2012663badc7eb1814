// frontend/src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { BookOpen, Eye, EyeOff, Mail, Lock, User, ArrowRight, GraduationCap } from 'lucide-react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'student',    label: 'Student',    icon: '🎓' },
  { value: 'researcher', label: 'Researcher', icon: '🔬' },
  { value: 'faculty',    label: 'Faculty',    icon: '👨‍🏫' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', username: '', role: 'student' });
  const [showPwd, setShowPwd] = useState(false);
  const [step, setStep] = useState(1);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => authService.register(form),
    onSuccess: () => {
      setStep(3); // success step
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Registration failed'),
  });

  if (step === 3) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-3xl p-10 max-w-md w-full text-center border border-white/10">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-display text-2xl font-bold text-white mb-3">Account Created!</h2>
          <p className="text-white/60 mb-6">
            We've sent a verification link to <strong className="text-white">{form.email}</strong>.
            Please check your inbox and verify your email to start using Vicharanshala Lab.
          </p>
          <Link to="/login">
            <button className="w-full bg-gradient-to-r from-primary-500 to-purple-500 text-white font-bold py-3 rounded-xl">
              Go to Login
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg hero-pattern flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-white text-lg leading-tight">Vicharanshala Lab</p>
              <p className="text-white/60 text-xs">IIT Ropar</p>
            </div>
          </Link>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-white/10">
          <h1 className="font-display text-2xl font-bold text-white mb-1">Join the Community</h1>
          <p className="text-white/60 text-sm mb-6">Create your free account</p>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {[1, 2].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-primary-500' : 'bg-white/10'}`} />
            ))}
          </div>

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  value={form.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-white/5 border border-white/10 focus:border-primary-400/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 outline-none transition-all text-sm"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-white/5 border border-white/10 focus:border-primary-400/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 outline-none transition-all text-sm"
                />
              </div>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  value={form.username}
                  onChange={e => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="Username (letters, numbers, _)"
                  className="w-full bg-white/5 border border-white/10 focus:border-primary-400/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 outline-none transition-all text-sm"
                />
              </div>
              <button
                onClick={() => {
                  if (!form.email || !form.full_name || !form.username) return toast.error('Please fill all fields');
                  setStep(2);
                }}
                className="w-full bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-400 hover:to-purple-400 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              {/* Role selection */}
              <div>
                <p className="text-sm font-semibold text-white/80 mb-3">I am a...</p>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => update('role', value)}
                      className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl text-xs font-medium transition-all border ${
                        form.role === value
                          ? 'bg-primary-500/25 text-primary-200 border-primary-500/50'
                          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="Password (min 8 chars)"
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

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-sm font-medium transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !form.password || form.password.length < 8}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                >
                  {mutation.isPending ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          )}

          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-300 hover:text-primary-200 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
