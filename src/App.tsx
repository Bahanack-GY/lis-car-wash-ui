import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Reservations from '@/pages/Reservations'
import FichesPiste from '@/pages/FichesPiste'
import Coupons from '@/pages/Coupons'
import CouponDetail from '@/pages/CouponDetail'
import Caisse from '@/pages/Caisse'
import Clients from '@/pages/Clients'
import ClientDetail from '@/pages/ClientDetail'
import Inventaire from '@/pages/Inventaire'
import Employes from '@/pages/Employes'
import EmployeDetail from '@/pages/EmployeDetail'
import Stations from '@/pages/Stations'
import TypesLavage from '@/pages/TypesLavage'
import ServicesAdditionnels from '@/pages/ServicesAdditionnels'
import Incidents from '@/pages/Incidents'
import NouveauLavage from '@/pages/NouveauLavage'
import SelectStation from '@/pages/SelectStation'
import GlobalDashboard from '@/pages/GlobalDashboard'
import MonEspace from '@/pages/MonEspace'
import Commercial from '@/pages/Commercial'
import CommercialAnalytics from '@/pages/CommercialAnalytics'
import Marketing from '@/pages/Marketing'
import Unauthorized from '@/pages/Unauthorized'

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/select-station" element={<SelectStation />} />
        <Route path="/global-dashboard" element={<GlobalDashboard />} />

        {/* Protected — inside Layout */}
        <Route element={<Layout />}>
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/dashboard" element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/nouveau-lavage" element={
            <ProtectedRoute roles={['super_admin', 'manager', 'controleur']}>
              <NouveauLavage />
            </ProtectedRoute>
          } />

          <Route path="/reservations" element={
            <ProtectedRoute roles={['super_admin', 'manager', 'controleur', 'caissiere']}>
              <Reservations />
            </ProtectedRoute>
          } />

          <Route path="/fiches-piste" element={
            <ProtectedRoute roles={['super_admin', 'manager', 'controleur']}>
              <FichesPiste />
            </ProtectedRoute>
          } />

          <Route path="/coupons" element={
            <ProtectedRoute roles={['super_admin', 'manager', 'controleur', 'caissiere']}>
              <Coupons />
            </ProtectedRoute>
          } />

          <Route path="/coupons/:id" element={
            <ProtectedRoute roles={['super_admin', 'manager', 'controleur', 'caissiere']}>
              <CouponDetail />
            </ProtectedRoute>
          } />

          <Route path="/caisse" element={
            <ProtectedRoute roles={['super_admin', 'manager', 'caissiere']}>
              <Caisse />
            </ProtectedRoute>
          } />

          <Route path="/clients" element={
            <ProtectedRoute roles={['super_admin', 'manager', 'controleur', 'caissiere']}>
              <Clients />
            </ProtectedRoute>
          } />

          <Route path="/clients/:id" element={
            <ProtectedRoute roles={['super_admin', 'manager', 'controleur', 'caissiere']}>
              <ClientDetail />
            </ProtectedRoute>
          } />

          <Route path="/inventaire" element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <Inventaire />
            </ProtectedRoute>
          } />

          <Route path="/employes" element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <Employes />
            </ProtectedRoute>
          } />

          <Route path="/employes/:id" element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <EmployeDetail />
            </ProtectedRoute>
          } />

          <Route path="/stations" element={
            <ProtectedRoute roles={['super_admin']}>
              <Stations />
            </ProtectedRoute>
          } />

          <Route path="/types-lavage" element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <TypesLavage />
            </ProtectedRoute>
          } />

          <Route path="/services-additionnels" element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <ServicesAdditionnels />
            </ProtectedRoute>
          } />

          <Route path="/incidents" element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <Incidents />
            </ProtectedRoute>
          } />

          <Route path="/mon-espace" element={
            <ProtectedRoute roles={['laveur']}>
              <MonEspace />
            </ProtectedRoute>
          } />

          <Route path="/espace-commercial" element={
            <ProtectedRoute roles={['commercial']}>
              <Commercial />
            </ProtectedRoute>
          } />

          <Route path="/commercial-analytics" element={
            <ProtectedRoute roles={['commercial']}>
              <CommercialAnalytics />
            </ProtectedRoute>
          } />

          <Route path="/marketing" element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <Marketing />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
