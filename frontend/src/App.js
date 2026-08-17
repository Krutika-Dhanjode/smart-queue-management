import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import AdminDashboard from './pages/AdminDashboard';
import JoinQueue from './pages/JoinQueue';
import UserDashboard from './pages/UserDashboard';
import AdminQueueAccess from './pages/AdminQueueAccess';
import GetIntoQueue from './pages/GetIntoQueue';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/get-into-queue" element={<GetIntoQueue />} />
            <Route path="/join/:publicCode" element={<JoinQueue />} />
            <Route path="/join-sub/:subCode" element={<JoinQueue />} />
            <Route path="/admin-access" element={<AdminQueueAccess />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/queue/:memberId"
              element={<UserDashboard />}
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
