// frontend/src/pages/AnalyticsPage.jsx
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { analyticsService } from '../services/api';
import { TrendingUp, Users, MessageSquare, CheckCircle, BarChart2, Globe, Map } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-4 py-3 border border-white/10 text-xs">
      <p className="font-semibold text-primary-color mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-secondary-color capitalize">{p.name}:</span>
          <span className="font-bold text-primary-color">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// D3 Knowledge Graph
function KnowledgeGraph({ data }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const d3 = window.d3;
    if (!d3) return; // fallback if d3 not loaded

    const svg = svgRef.current;
    const { width, height } = svg.getBoundingClientRect();

    // Clear previous
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.edges.map(e => ({
      source: nodes.findIndex(n => n.id === e.source),
      target: nodes.findIndex(n => n.id === e.target),
      value: e.weight,
    })).filter(l => l.source >= 0 && l.target >= 0);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20));

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    // Links
    links.forEach(link => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', 'rgba(99,102,241,0.2)');
      line.setAttribute('stroke-width', Math.min(link.value, 4));
      g.appendChild(line);
      link._el = line;
    });

    // Nodes
    nodes.forEach((node, i) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const r = Math.max(8, Math.min(25, 6 + (node.usage_count || 1) * 1.5));
      circle.setAttribute('r', r);
      circle.setAttribute('fill', COLORS[i % COLORS.length]);
      circle.setAttribute('fill-opacity', '0.7');
      circle.setAttribute('stroke', COLORS[i % COLORS.length]);
      circle.setAttribute('stroke-width', '1.5');
      circle.style.cursor = 'pointer';
      g.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = node.name;
      text.setAttribute('font-size', '9');
      text.setAttribute('fill', 'rgba(241,245,249,0.8)');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', r + 12);
      g.appendChild(text);

      node._circle = circle;
      node._text = text;
    });

    simulation.on('tick', () => {
      nodes.forEach(n => {
        if (n._circle) {
          n._circle.setAttribute('cx', n.x);
          n._circle.setAttribute('cy', n.y);
          n._text.setAttribute('x', n.x);
          n._text.setAttribute('y', n.y);
        }
      });
      links.forEach(l => {
        if (l._el && l.source.x) {
          l._el.setAttribute('x1', l.source.x);
          l._el.setAttribute('y1', l.source.y);
          l._el.setAttribute('x2', l.target.x);
          l._el.setAttribute('y2', l.target.y);
        }
      });
    });
  }, [data]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
}

export default function AnalyticsPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.getOverview(),
    select: d => d.data?.data,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => analyticsService.getHeatmap(),
    select: d => d.data?.data?.categories,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', 30],
    queryFn: () => analyticsService.getActivity({ days: 30 }),
    select: d => d.data?.data?.timeline?.map(t => ({
      ...t,
      date: format(new Date(t.date), 'MMM dd'),
      questions: parseInt(t.questions),
      answers: parseInt(t.answers),
      users: parseInt(t.users),
    })),
  });

  const { data: graphData } = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: () => analyticsService.getKnowledgeGraph(),
    select: d => d.data?.data,
  });

  const { data: researchMap } = useQuery({
    queryKey: ['research-map'],
    queryFn: () => analyticsService.getResearchMap(),
    select: d => d.data?.data?.topics,
  });

  const stats = overview?.stats;

  const statCards = [
    { label: 'Active Members', value: stats?.total_users, icon: Users, color: 'from-blue-500 to-cyan-500', suffix: '' },
    { label: 'Total Questions', value: stats?.total_questions, icon: MessageSquare, color: 'from-purple-500 to-primary-500', suffix: '' },
    { label: 'Total Answers', value: stats?.total_answers, icon: CheckCircle, color: 'from-green-500 to-teal-500', suffix: '' },
    { label: 'Engagement Rate', value: stats?.engagement_rate, icon: TrendingUp, color: 'from-amber-500 to-orange-500', suffix: '%' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-primary-color mb-1 flex items-center gap-2">
          <BarChart2 className="w-8 h-8 text-primary-400" />
          Analytics <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-secondary-color text-sm">Community insights and knowledge trends</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, suffix }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card rounded-2xl p-5 hover-lift"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-display text-2xl font-bold text-primary-color">{value || '—'}{suffix}</p>
            <p className="text-xs text-secondary-color mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h2 className="font-display font-bold text-primary-color mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            30-Day Activity
          </h2>
          {timeline?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="questions" stroke="#6366f1" fill="url(#qGrad)" strokeWidth={2} name="Questions" />
                <Area type="monotone" dataKey="answers" stroke="#10b981" fill="url(#aGrad)" strokeWidth={2} name="Answers" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-secondary-color text-sm">Loading chart...</div>
          )}
        </div>

        {/* Top Categories Pie */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display font-bold text-primary-color mb-4">Top Categories</h2>
          {overview?.top_categories?.length ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={overview.top_categories}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={70}
                    dataKey="question_count"
                    nameKey="name"
                  >
                    {overview.top_categories.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'Questions']} contentStyle={{ background: '#1e2a4a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {overview.top_categories.slice(0, 4).map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                    <span className="text-secondary-color flex-1 truncate">{cat.name}</span>
                    <span className="font-bold text-primary-color">{cat.question_count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-secondary-color text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Category Heatmap */}
      {heatmapData?.length > 0 && (
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="font-display font-bold text-primary-color mb-6 flex items-center gap-2">
            <Map className="w-5 h-5 text-primary-400" />
            FAQ Heatmap — Questions per Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {heatmapData.map((cat, i) => {
              const max = Math.max(...heatmapData.map(c => parseInt(c.question_count) || 0));
              const ratio = max > 0 ? (parseInt(cat.question_count) || 0) / max : 0;
              const opacity = 0.15 + ratio * 0.85;
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl p-4 border border-white/5 transition-all hover:scale-105 cursor-default"
                  style={{ background: `rgba(99,102,241,${opacity})` }}
                >
                  <p className="text-xl mb-2">{cat.icon}</p>
                  <p className="text-xs font-semibold text-white/90 leading-tight mb-1">{cat.name}</p>
                  <p className="text-lg font-bold text-white">{cat.question_count}</p>
                  <p className="text-[10px] text-white/60">questions</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Knowledge Graph */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display font-bold text-primary-color mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-400" />
            Knowledge Graph
          </h2>
          <p className="text-xs text-secondary-color mb-4">Tag relationships — nodes sized by usage</p>
          <div className="h-64 rounded-xl overflow-hidden bg-white/2">
            {graphData ? (
              <KnowledgeGraph data={graphData} />
            ) : (
              <div className="flex items-center justify-center h-full text-secondary-color text-sm">Loading graph...</div>
            )}
          </div>
        </div>

        {/* Research Map */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display font-bold text-primary-color mb-4">Research Interest Map</h2>
          <p className="text-xs text-secondary-color mb-4">Top topics discussed in the community</p>
          {researchMap?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={researchMap.slice(0, 8)} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="topic" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#1e2a4a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
                  {researchMap.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-secondary-color text-sm">No research data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
