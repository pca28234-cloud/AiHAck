import React, { useEffect, useState } from 'react';
import { getFarmers, getHarvests, getBuyers, getOrders, getVehicles } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Network, Sprout, ShoppingCart, Truck, ArrowRight, ShieldCheck, Activity, Users, Route } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    farmers: 0,
    buyers: 0,
    vehicles: 0,
    totalVolume: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mocking supply chain linkages for the admin view
  const supplyChainLinks = [
    { id: 1, date: 'Today, 10:30 AM', status: 'In Transit', farmer: 'Ravi Kumar', farmerLoc: 'Kolar District', volume: 500, quality: 'Grade A', transporter: 'KA-01-AB-1234', buyer: 'Restaurant Group', buyerLoc: 'Bangalore City' },
    { id: 2, date: 'Yesterday', status: 'Completed', farmer: 'Lakshmi N.', farmerLoc: 'Tumkur', volume: 1200, quality: 'Grade B', transporter: 'MH-12-PQ-5678', buyer: 'Market Traders', buyerLoc: 'Mysore' },
    { id: 3, date: 'Oct 01, 2026', status: 'Completed', farmer: 'Srinivas Gowda', farmerLoc: 'Mandya', volume: 300, quality: 'Grade A', transporter: 'KA-02-XY-9876', buyer: 'FreshMart Inc', buyerLoc: 'Bangalore City' },
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [fRes, hRes, bRes, vRes] = await Promise.all([
          getFarmers(), getHarvests(), getBuyers(), getVehicles()
        ]);
        
        const totalVol = hRes.data.reduce((sum, h) => sum + h.estimated_quantity, 0);

        setStats({
          farmers: fRes.data.length,
          buyers: bRes.data.length,
          vehicles: vRes.data.length,
          totalVolume: totalVol
        });
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) return <LoadingSpinner message="Initializing Admin Systems..." />;
  if (error) return <div className="p-8 text-rose-500 font-bold text-center">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-sky-500" /> System Overview
          </h1>
          <p className="text-stone-500 mt-1">Monitor the AI-driven supply chain network</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100 shadow-sm">
          <Activity className="w-4 h-4 animate-pulse" /> Network Healthy
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4 text-primary-600"><Sprout className="w-6 h-6" /></div>
          <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Registered Farmers</p>
          <h3 className="font-display text-4xl font-bold text-stone-900">{stats.farmers}</h3>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-harvest-50 flex items-center justify-center mb-4 text-harvest-600"><ShoppingCart className="w-6 h-6" /></div>
          <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Active Buyers</p>
          <h3 className="font-display text-4xl font-bold text-stone-900">{stats.buyers}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4 text-violet-600"><Truck className="w-6 h-6" /></div>
          <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Fleet Vehicles</p>
          <h3 className="font-display text-4xl font-bold text-stone-900">{stats.vehicles}</h3>
        </div>

        <div className="bg-gradient-to-br from-sky-500 to-sky-700 p-6 rounded-2xl shadow-lg shadow-sky-500/20 text-white">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm"><Route className="w-6 h-6 text-white" /></div>
          <p className="text-sm font-bold text-sky-100 uppercase tracking-wider mb-1">Total Volume Processed</p>
          <h3 className="font-display text-4xl font-bold text-white">{stats.totalVolume.toLocaleString()} <span className="text-xl font-sans font-medium text-sky-200">kg</span></h3>
        </div>
      </div>

      {/* Supply Chain Trace */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-card overflow-hidden">
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Network className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-stone-900">Supply Chain Linkages</h2>
              <p className="text-sm text-stone-500">Live AI matching history between Farmers, Transporters, and Buyers</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {supplyChainLinks.map((link) => (
            <div key={link.id} className="p-8 hover:bg-stone-50/30 transition-colors">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-stone-500">{link.date}</span>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${link.status === 'In Transit' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {link.status}
                </span>
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Farmer Node */}
                <div className="flex-1 w-full bg-white border border-stone-200 rounded-2xl p-5 shadow-sm text-center relative group hover:border-primary-300 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Sprout className="w-6 h-6" /></div>
                  <h4 className="font-display font-bold text-lg text-stone-900">{link.farmer}</h4>
                  <p className="text-xs text-stone-500 font-medium">Farmer • {link.farmerLoc}</p>
                </div>

                {/* Arrow & Load Info */}
                <div className="flex flex-col items-center justify-center px-4">
                  <div className="text-xs font-bold text-stone-900 bg-stone-100 px-3 py-1 rounded-full mb-2 border border-stone-200">
                    {link.volume} kg • {link.quality}
                  </div>
                  <ArrowRight className="w-6 h-6 text-stone-300 md:block hidden" />
                </div>

                {/* Transporter Node */}
                <div className="flex-1 w-full bg-white border border-stone-200 rounded-2xl p-5 shadow-sm text-center relative group hover:border-violet-300 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Truck className="w-6 h-6" /></div>
                  <h4 className="font-display font-bold text-lg text-stone-900">{link.transporter}</h4>
                  <p className="text-xs text-stone-500 font-medium">Logistics Provider</p>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center justify-center px-4">
                  <ArrowRight className="w-6 h-6 text-stone-300 md:block hidden" />
                </div>

                {/* Buyer Node */}
                <div className="flex-1 w-full bg-white border border-stone-200 rounded-2xl p-5 shadow-sm text-center relative group hover:border-harvest-300 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-harvest-100 text-harvest-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><ShoppingCart className="w-6 h-6" /></div>
                  <h4 className="font-display font-bold text-lg text-stone-900">{link.buyer}</h4>
                  <p className="text-xs text-stone-500 font-medium">Buyer • {link.buyerLoc}</p>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
