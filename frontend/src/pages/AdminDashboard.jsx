// frontend/src/pages/AdminDashboard.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Users, MessageSquare, Flag, Activity, CheckCircle,
  Search, ChevronDown, UserCheck, UserX, Edit3, BarChart2
} from 'lucide-react';
import { adminService, analyticsService } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TABS = [
  { id: 'overview',  label: 'Overview',     icon: BarChart2 },
  { id: 'users',     label: 'Users',        icon: Users },
  { id: 'reports',   label: 'Reports',      icon: Flag },
];

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="font-display text-2xl font-bold text-primary-color">{value ?? '—'}</p>
      <p className="text-xs text-secondary-color mt-0.5">{label}</p>
      {sub && <p className="text-xs text-green-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab]       = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole]     = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [page, setPage]             = useState(1);
  const qc = useQueryClient();

  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.getOverview(),
    select: d => d.data?.data,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userSearch, userRole, userStatus, page],
    queryFn: () => adminService.getUsers({ search: userSearch, role: userRole, status: userStatus, page, limit: 20 }),
    select: d => d.data?.data,
    enabled: tab === 'users',
  });

  const { data: reportsData } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminService.getReports({ status: 'pending' }),
    select: d => d.data?.data,
    enabled: tab === 'reports',
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }) => adminService.updateUser(id, data),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries(['admin-users']);
    },
    onError: () => toast.error('Failed to update user'),
  });

  const stats = overview?.stats;

  const roleColor = {
    student: 'text-emerald-400 bg-emerald-500/10',
    researcher: 'text-purple-400 bg-purple-500/10',
    faculty: 'text-amber-400 bg-amber-500/10',
    admin: 'text-red-400 bg-red-500/10',
  };

  const statusColor = {
    active: 'text-green-400',
    suspended: 'text-red-400',
    pending_verification: 'text-amber-400',
    inactive: 'text-gray-400',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-color">Admin Dashboard</h1>
          <p className="text-xs text-secondary-color">Vicharanshala Lab — IIT Ropar</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              tab === id
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                : 'glass-card text-secondary-color hover:text-primary-color border border-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'reports' && reportsData?.pagination?.total > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {reportsData.pagination.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- OVERVIEW TAB ---- */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Users" value={stats?.total_users} icon={Users} color="from-blue-500 to-cyan-500" sub={`+${stats?.new_users_week || 0} this week`} />
            <StatCard label="Total Questions" value={stats?.total_questions} icon={MessageSquare} color="from-purple-500 to-primary-500" sub={`+${stats?.new_questions_week || 0} this week`} />
            <StatCard label="Total Answers" value={stats?.total_answers} icon={CheckCircle} color="from-green-500 to-emerald-500" />
            <StatCard label="Engagement Rate" value={`${stats?.engagement_rate || 0}%`} icon={Activity} color="from-amber-500 to-orange-500" />
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display font-bold text-primary-color mb-4">Top Categories</h2>
            <div className="space-y-3">
              {overview?.top_categories?.map((cat, i) => {
                const max = Math.max(...(overview.top_categories.map(c => c.question_count) || [1]));
                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-xs text-secondary-color w-4">{i + 1}</span>
                    <span className="text-sm text-primary-color w-32 truncate">{cat.name}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.question_count / max) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-primary-color w-8 text-right">{cat.question_count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- USERS TAB ---- */}
      {tab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Filters */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-color" />
              <input
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, email, username..."
                className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-primary-color placeholder-secondary-color outline-none transition-all"
              />
            </div>
            <select
              value={userRole}
              onChange={e => { setUserRole(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-primary-color outline-none"
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="researcher">Researcher</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={userStatus}
              onChange={e => { setUserStatus(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-primary-color outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending_verification">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Users table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-secondary-color">
                    <th className="text-left px-5 py-3 font-semibold">User</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Role</th>
                    <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Status</th>
                    <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Stats</th>
                    <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Joined</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-5 py-4">
                          <div className="skeleton h-8 rounded-lg w-full" />
                        </td>
                      </tr>
                    ))
                  ) : usersData?.users?.map(u => (
                    <tr key={u.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.full_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary-color">{u.full_name}</p>
                            <p className="text-xs text-secondary-color truncate max-w-[160px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${roleColor[u.role] || 'bg-white/10 text-secondary-color'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs font-medium capitalize ${statusColor[u.status] || 'text-secondary-color'}`}>
                          {u.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-secondary-color hidden lg:table-cell">
                        {u.question_count}Q · {u.answer_count}A · {u.reputation_score}pts
                      </td>
                      <td className="px-4 py-3 text-xs text-secondary-color hidden lg:table-cell">
                        {format(new Date(u.created_at), 'dd MMM yy')}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.status !== 'suspended' ? (
                            <button
                              onClick={() => updateUserMutation.mutate({ id: u.id, status: 'suspended' })}
                              className="p-1.5 rounded-lg text-secondary-color hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Suspend user"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => updateUserMutation.mutate({ id: u.id, status: 'active' })}
                              className="p-1.5 rounded-lg text-secondary-color hover:text-green-400 hover:bg-green-500/10 transition-all"
                              title="Activate user"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <select
                            value={u.role}
                            onChange={e => updateUserMutation.mutate({ id: u.id, role: e.target.value })}
                            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-secondary-color outline-none"
                          >
                            <option value="student">Student</option>
                            <option value="researcher">Researcher</option>
                            <option value="faculty">Faculty</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersData?.pagination && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-xs text-secondary-color">
                <span>{usersData.pagination.total} total users</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 glass-card rounded-lg disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="px-3 py-1.5">Page {page}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * 20 >= usersData.pagination.total}
                    className="px-3 py-1.5 glass-card rounded-lg disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ---- REPORTS TAB ---- */}
      {tab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {reportsData?.reports?.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="font-display text-xl font-bold text-primary-color mb-2">All Clear!</p>
              <p className="text-secondary-color">No pending reports to review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportsData?.reports?.map(report => (
                <div key={report.id} className="glass-card rounded-2xl p-5 border border-red-500/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 capitalize">
                          {report.reason?.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-secondary-color">
                          by {report.reporter?.username}
                        </span>
                      </div>
                      {report.question_title && (
                        <p className="text-sm font-medium text-primary-color mb-1 line-clamp-1">
                          Q: {report.question_title}
                        </p>
                      )}
                      {report.description && (
                        <p className="text-xs text-secondary-color line-clamp-2">{report.description}</p>
                      )}
                      <p className="text-xs text-secondary-color mt-2">
                        {format(new Date(report.created_at), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/25 hover:bg-green-500/20 transition-all">
                        Dismiss
                      </button>
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 transition-all">
                        Remove Content
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
