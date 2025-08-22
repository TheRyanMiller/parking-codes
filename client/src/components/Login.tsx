import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [unit, setUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.residentLogin(email.trim(), unit.trim());
      login(response.data.token, response.data.user);
      // Small delay to ensure token is stored before navigation
      setTimeout(() => navigate('/dashboard'), 100);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setError(err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card hover-lift p-8 relative star-corner">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Parking Codes ✨
            </h1>
            <p className="text-gray-600">
              Enter your email and unit number to view this month's codes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="unit" className="label">
                Unit Number
              </label>
              <input
                type="text"
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value.toUpperCase())}
                className="input"
                placeholder="W332, E509"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/admin/login" 
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;