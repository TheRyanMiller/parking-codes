import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { residentAPI } from '../services/api';
import { ParkingCode } from '../types';

const ResidentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [codes, setCodes] = useState<ParkingCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      setIsLoading(true);
      const response = await residentAPI.getCodes();
      setCodes(response.data);
    } catch (err: any) {
      setError('Failed to load codes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(code);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      setError('Failed to copy code to clipboard');
    }
  };

  const sendAllCodes = () => {
    const assignedCodes = codes.filter(code => code.status === 'assigned');
    const codesList = assignedCodes.map(code => code.code).join('\n');
    const currentMonth = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    const message = `My parking codes for ${currentMonth}:\n\n${codesList}\n\n`;
    
    // For mobile devices, try to open native sharing
    if (navigator.share) {
      navigator.share({
        title: 'Parking Codes',
        text: message,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback for desktop - create mailto link
      const subject = encodeURIComponent(`Parking Codes - ${currentMonth}`);
      const body = encodeURIComponent(message);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    }
  };

  const currentMonth = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Parking Codes ✨</h1>
              <p className="text-sm text-gray-600 mt-1">
                {user?.name} • Unit {user?.unit}
              </p>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentMonth} Codes
            </h2>
            {codes.some(code => code.status === 'assigned') && (
              <button
                onClick={sendAllCodes}
                className="btn btn-primary text-sm"
              >
                📤 Send All
              </button>
            )}
          </div>
          <p className="text-gray-600 text-sm">
            Tap any code to copy
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            {error}
          </div>
        )}

        {codes.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-orange-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Codes Allocated</h3>
            <p className="text-orange-600 font-medium mb-2">
              ⚠️ You were not allocated your expected codes this month
            </p>
            <p className="text-gray-600">
              Please contact the admin to resolve this issue and get your parking codes assigned.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => {
              const code = codes[index];
              const cardVariants = ['card-mint', 'card-yellow', 'card-pink', 'card-lavender'];
              const cardClass = cardVariants[index % cardVariants.length];
              
              return (
                <div key={index}>
                  {code ? (
                    <button
                      onClick={() => copyToClipboard(code.code)}
                      className={`card ${cardClass} hover-lift p-4 w-full text-center transition-all border-none cursor-pointer`}
                    >
                      <div className="text-xl font-bold text-gray-900 font-mono">
                        {code.code}
                      </div>
                    </button>
                  ) : (
                    <div className={`card ${cardClass} p-4 text-center opacity-50`}>
                      <div className="text-xl font-bold text-gray-400 font-mono">
                        ──────
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Fixed position toast for copy success */}
      {copySuccess && (
        <div className="fixed top-4 right-4 alert alert-success shadow-lg z-50 animate-fade-in">
          ✅ "{copySuccess}" copied!
        </div>
      )}
    </div>
  );
};

export default ResidentDashboard;