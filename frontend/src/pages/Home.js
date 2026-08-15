import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Smart Queue</h1>
          <div className="flex gap-4">
            {user ? (
              <Link
                to={user.role === 'ADMIN' ? '/admin' : '/login'}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-gray-900"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Smart Queue Management
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join a digital queue, track your position in real time, and reduce unnecessary waiting.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Link
            to="/register"
            className="block p-8 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors"
          >
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Queue</h3>
            <p className="text-gray-600 text-sm">
              Create and manage digital queues for your organization
            </p>
          </Link>

          <Link
            to="/admin-access"
            className="block p-8 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors"
          >
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Queue</h3>
            <p className="text-gray-600 text-sm">
              Access queue management with admin code
            </p>
          </Link>

          <Link
            to="/join/scan"
            className="block p-8 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors"
          >
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Into Queue</h3>
            <p className="text-gray-600 text-sm">
              Scan QR code or enter queue code to join
            </p>
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-4 gap-6 text-center">
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">Real-time</div>
            <div className="text-gray-600 text-sm">Live queue updates</div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">Smart</div>
            <div className="text-gray-600 text-sm">AI wait time prediction</div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">Secure</div>
            <div className="text-gray-600 text-sm">Document verification</div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">Fast</div>
            <div className="text-gray-600 text-sm">Instant token generation</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
