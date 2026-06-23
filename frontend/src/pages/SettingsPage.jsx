// frontend/src/pages/SettingsPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Settings, User, Bell, Shield, Save } from 'lucide-react';
import { userService } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    department: user?.department || '',
    designation: user?.designation || '',
    website: user?.website || '',
    github_url: user?.github_url || '',
    linkedin_url: user?.linkedin_url || '',
    notification_email: user?.notification_email ?? true,
    notification_app: user?.notification_app ?? true,
    theme_preference: user?.theme_preference || 'dark',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => userService.updateProfile(form),
    onSuccess: () => {
      updateUser(form);
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-primary-color">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold text-primary-color mb-4 flex items-center gap-2"><User className="w-4 h-4 text-primary-400" /> Profile Info</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { key: 'full_name', label: 'Full Name', placeholder: 'Your full name' },
              { key: 'designation', label: 'Designation', placeholder: 'e.g. PhD Scholar' },
              { key: 'department', label: 'Department', placeholder: 'e.g. Computer Science' },
              { key: 'website', label: 'Website', placeholder: 'https://...' },
              { key: 'github_url', label: 'GitHub URL', placeholder: 'https://github.com/...' },
              { key: 'linkedin_url', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/...' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-secondary-color mb-1">{label}</label>
                <input value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-3 py-2.5 text-sm text-primary-color placeholder-secondary-color outline-none transition-all" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-secondary-color mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Tell the community about yourself..." rows={3}
                className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-3 py-2.5 text-sm text-primary-color placeholder-secondary-color outline-none transition-all resize-none" />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold text-primary-color mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-primary-400" /> Notifications</h2>
          <div className="space-y-3">
            {[
              { key: 'notification_email', label: 'Email notifications', desc: 'Receive emails for new answers and mentions' },
              { key: 'notification_app', label: 'In-app notifications', desc: 'Get notified within the platform' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={e => update(key, e.target.checked)} className="mt-0.5 rounded accent-primary-500" />
                <div>
                  <p className="text-sm font-medium text-primary-color">{label}</p>
                  <p className="text-xs text-secondary-color">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold text-primary-color mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-primary-400" /> Appearance</h2>
          <div className="flex gap-3">
            {['light', 'dark', 'system'].map(t => (
              <button key={t} onClick={() => update('theme_preference', t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all border ${form.theme_preference === t ? 'bg-primary-500/20 text-primary-300 border-primary-500/40' : 'bg-white/5 text-secondary-color border-white/5 hover:bg-white/10'}`}>
                {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'} {t}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="w-full bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
