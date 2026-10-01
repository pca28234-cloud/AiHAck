import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, User, Truck, ShoppingCart, Shield } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState('farmer');
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    if (role === 'farmer' && (username !== 'farmer1' || password !== '1234')) {
      setError('Invalid username or password');
      return;
    }

    if (role === 'buyer' && (username !== 'buyer1' || password !== '1234')) {
      setError('Invalid username or password');
      return;
    }

    if (role === 'transporter' && (username !== 'transporter1' || password !== '1234')) {
      setError('Invalid username or password');
      return;
    }
    
    setError('');

    if (role === 'farmer') {
      navigate('/farmer-dashboard');
    } else if (role === 'buyer') {
      navigate('/buyer-dashboard');
    } else if (role === 'transporter') {
      navigate('/transporter-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleAdminLogin = () => {
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface-50 flex flex-col items-center justify-center">
      {/* Background styling similar to Landing */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(74, 222, 128, 0.4) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(34, 197, 94, 0.3) 0%, transparent 50%)',
        }} />
      </div>

      <div className="w-full max-w-md px-4 relative z-10 animate-scale-in">
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl border border-stone-100/50 relative overflow-hidden">
          
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary-400 to-primary-600" />

          {/* Logo & Title */}
          <div className="text-center mb-10 mt-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 mx-auto mb-5">
              <Sprout className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">
              Harvest<span className="text-primary-500">Link</span> AI
            </h1>
            <p className="text-stone-500 text-sm mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            
            {step === 1 ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider ml-1 mb-2">
                  Select Your Role
                </label>
                
                {/* Farmer Option */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  role === 'farmer' ? 'border-primary-500 bg-primary-50' : 'border-stone-200 hover:border-primary-200 hover:bg-stone-50'
                }`}>
                  <input type="radio" name="role" value="farmer" checked={role === 'farmer'} onChange={() => setRole('farmer')} className="hidden" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${role === 'farmer' ? 'bg-primary-100 text-primary-600' : 'bg-stone-100 text-stone-500'}`}>
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${role === 'farmer' ? 'text-primary-900' : 'text-stone-700'}`}>Farmer</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${role === 'farmer' ? 'border-primary-500' : 'border-stone-300'}`}>
                    {role === 'farmer' && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                  </div>
                </label>

                {/* Buyer Option */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  role === 'buyer' ? 'border-harvest-500 bg-harvest-50' : 'border-stone-200 hover:border-harvest-200 hover:bg-stone-50'
                }`}>
                  <input type="radio" name="role" value="buyer" checked={role === 'buyer'} onChange={() => setRole('buyer')} className="hidden" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${role === 'buyer' ? 'bg-harvest-100 text-harvest-600' : 'bg-stone-100 text-stone-500'}`}>
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${role === 'buyer' ? 'text-harvest-900' : 'text-stone-700'}`}>Buyer</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${role === 'buyer' ? 'border-harvest-500' : 'border-stone-300'}`}>
                    {role === 'buyer' && <div className="w-2.5 h-2.5 rounded-full bg-harvest-500" />}
                  </div>
                </label>

                {/* Transporter Option */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  role === 'transporter' ? 'border-violet-500 bg-violet-50' : 'border-stone-200 hover:border-violet-200 hover:bg-stone-50'
                }`}>
                  <input type="radio" name="role" value="transporter" checked={role === 'transporter'} onChange={() => setRole('transporter')} className="hidden" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${role === 'transporter' ? 'bg-violet-100 text-violet-600' : 'bg-stone-100 text-stone-500'}`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${role === 'transporter' ? 'text-violet-900' : 'text-stone-700'}`}>Transporter</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${role === 'transporter' ? 'border-violet-500' : 'border-stone-300'}`}>
                    {role === 'transporter' && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                  </div>
                </label>

              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-primary-600 hover:text-primary-700 mb-4 inline-block">&larr; Back to roles</button>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider ml-1 mb-2">Username</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider ml-1 mb-2">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                {error && <p className="text-rose-500 text-sm">{error}</p>}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-stone-900 text-white font-semibold text-lg hover:bg-stone-800 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 flex items-center justify-center gap-2 group mt-8"
            >
              {step === 1 ? 'CONTINUE' : 'LOGIN'}
            </button>
          </form>
        </div>
      </div>

      {/* Admin Button (Top Right) */}
      <button 
        onClick={handleAdminLogin}
        className="absolute top-8 right-8 flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 hover:text-stone-900 shadow-lg hover:shadow-xl transition-all group z-20"
      >
        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
          <Shield className="w-3.5 h-3.5" />
        </div>
        Admin
      </button>

    </div>
  );
}
