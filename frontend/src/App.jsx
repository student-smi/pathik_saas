import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import SocietyManagement from './pages/admin/SocietyManagement'
import HouseManagement from './pages/admin/HouseManagement'
import ResidentManagement from './pages/admin/ResidentManagement'
import MonthlyBillScreen from './pages/admin/MonthlyBillScreen'
import BillHistory from './pages/admin/BillHistory'
import CalcConfigScreen from './pages/admin/CalcConfigScreen'

import ResidentLayout from './pages/resident/ResidentLayout'
import ResidentDashboard from './pages/resident/ResidentDashboard'
import ResidentBillDetail from './pages/resident/ResidentBillDetail'

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/resident'} replace /> : <LoginPage />
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="ADMIN"><AdminLayout /></ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="societies" element={<SocietyManagement />} />
        <Route path="houses" element={<HouseManagement />} />
        <Route path="residents" element={<ResidentManagement />} />
        <Route path="bills" element={<MonthlyBillScreen />} />
        <Route path="history" element={<BillHistory />} />
        <Route path="config" element={<CalcConfigScreen />} />
      </Route>

      {/* Resident routes */}
      <Route path="/resident" element={
        <ProtectedRoute requiredRole="RESIDENT"><ResidentLayout /></ProtectedRoute>
      }>
        <Route index element={<ResidentDashboard />} />
        <Route path="bill/:entryId" element={<ResidentBillDetail />} />
      </Route>

      <Route path="/" element={
        user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/resident'} replace /> : <Navigate to="/login" replace />
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
