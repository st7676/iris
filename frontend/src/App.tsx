import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import SimulationPage from './pages/SimulationPage'
import ReportPage from './pages/ReportPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import { useSimulationStore } from './hooks/useSimulation'

function ProtectedRoute({ element }: { element: React.ReactNode }) {
  const userId = useSimulationStore((state) => state.userId)
  return userId ? element : <Navigate to="/login" replace />
}

function App() {
  const userId = useSimulationStore((state) => state.userId)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={userId ? <HomePage /> : <Navigate to="/login" replace />} />
      <Route path="/simulation" element={<ProtectedRoute element={<SimulationPage />} />} />
      <Route path="/report" element={<ProtectedRoute element={<ReportPage />} />} />
      <Route path="/history" element={<ProtectedRoute element={<HistoryPage />} />} />
    </Routes>
  )
}

export default App
