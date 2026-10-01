import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === '1234') {
      navigate('/dashboard');
    } else {
      setError('Invalid admin credentials.');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface-50 flex flex-col items-center justify-center">
      {/* Background styling */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 50% 25%, rgba(14, 165, 233, 0.2) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(56, 189, 248, 0.1) 0%, transparent 50%)',
        }} />
      </div>

      <button 
        onClick={() => navigate('/')} 
        className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors z-20"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="w-full max-w-sm px-4 relative z-10 animate-scale-in">
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-stone-100/50 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-400 to-sky-600" />

          <div className="text-center mb-8 mt-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/30 mx-auto mb-5">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
              Admin Access
            </h1>
            <p className="text-stone-500 text-sm mt-1">Authorized personnel only</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-slide-up">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 ml-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-medium" 
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 ml-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-5 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-medium" 
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-4 rounded-xl bg-sky-600 text-white font-bold text-lg hover:bg-sky-700 transition-all duration-200 shadow-xl shadow-sky-600/20 hover:-translate-y-0.5"
            >
              AUTHENTICATE
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
