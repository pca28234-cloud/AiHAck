import React, { useEffect, useState } from 'react';
import { getDashboard } from '../services/api';
import KPICard from '../components/KPICard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Sprout, ShoppingCart, CheckCircle2, Truck, Users, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const QUALITY_COLORS = { A: '#16a34a', B: '#f97316', C: '#ef4444' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboard();
      setData(res.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <AlertTriangle className="w-8 h-8 text-harvest-500 mx-auto mb-3" />
      <p className="text-stone-600">{error}</p>
    </div>
  );
  if (!data) return null;

  const supplyDemandData = [
    { name: 'Supply', value: data.total_harvest, fill: '#16a34a' },
    { name: 'Demand', value: data.total_demand, fill: '#f97316' },
    { name: 'Matched', value: data.total_matched, fill: '#0ea5e9' },
  ];

  const qualityData = Object.entries(data.quality_distribution || {})
    .filter(([, v]) => v > 0)
    .map(([grade, qty]) => ({
      name: `Grade ${grade}`,
      value: qty,
      color: QUALITY_COLORS[grade],
    }));

  const transportData = [
    { name: 'Used', value: data.total_transport_capacity - data.total_available_transport },
    { name: 'Available', value: data.total_available_transport },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-stone-500 mt-1">Real-time overview of supply, demand, and coordination status.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Available Harvest" value={data.total_harvest} unit="kg" icon={Sprout} color="green" delay={0} />
        <KPICard title="Buyer Demand" value={data.total_demand} unit="kg" icon={ShoppingCart} color="orange" delay={100} />
        <KPICard title="Matched" value={data.total_matched} unit="kg" icon={CheckCircle2} color="blue" delay={200} />
        <KPICard title="Transport Capacity" value={data.total_transport_capacity} unit="kg" icon={Truck} color="purple" delay={300} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Supply vs Demand */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-card" id="chart-supply-demand">
          <h3 className="font-display font-semibold text-stone-900 mb-4">Supply vs Demand</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={supplyDemandData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 13, fill: '#78716c' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: '13px' }}
                formatter={(value) => [`${value} kg`, '']}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {supplyDemandData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Distribution */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-card" id="chart-quality">
          <h3 className="font-display font-semibold text-stone-900 mb-4">Quality Distribution</h3>
          {qualityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={qualityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value} kg`}
                  labelLine={false}
                >
                  {qualityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} kg`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-stone-400">No quality data available</div>
          )}
        </div>
      </div>

      {/* Bottom row: Stats + Fairness */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Entities */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-card" id="active-entities">
          <h3 className="font-display font-semibold text-stone-900 mb-4">Active Entities</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-sm text-stone-600">Active Farmers</span>
              <span className="font-semibold text-stone-900">{data.active_farmers}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-sm text-stone-600">Active Buyers</span>
              <span className="font-semibold text-stone-900">{data.active_buyers}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-sm text-stone-600">Active Orders</span>
              <span className="font-semibold text-stone-900">{data.active_orders}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-stone-600">Collection Slots</span>
              <span className="font-semibold text-stone-900">{data.collection_slots}</span>
            </div>
          </div>
        </div>

        {/* Fairness Panel */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-card" id="fairness-panel">
          <h3 className="font-display font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Producer Participation
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-stone-600">Small Producers</span>
                <span className="text-sm font-semibold text-primary-700">{data.small_producers}</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2.5">
                <div
                  className="bg-primary-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${data.active_farmers > 0 ? (data.small_producers / data.active_farmers * 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-stone-600">Large Producers</span>
                <span className="text-sm font-semibold text-harvest-700">{data.large_producers}</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2.5">
                <div
                  className="bg-harvest-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${data.active_farmers > 0 ? (data.large_producers / data.active_farmers * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Unallocated */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-card" id="unallocated-panel">
          <h3 className="font-display font-semibold text-stone-900 mb-4">Allocation Gaps</h3>
          <div className="space-y-5">
            <div>
              <p className="text-sm text-stone-500 mb-1">Unallocated Supply</p>
              <p className="text-2xl font-display font-bold text-harvest-600">{data.unallocated} <span className="text-sm font-normal text-stone-400">kg</span></p>
            </div>
            <div>
              <p className="text-sm text-stone-500 mb-1">Unmet Demand</p>
              <p className="text-2xl font-display font-bold text-rose-600">{data.unmet_demand} <span className="text-sm font-normal text-stone-400">kg</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
