import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LiveStatusBar from './components/common/LiveStatusBar'
import BootSequence, { shouldShowBootSequence } from './components/common/BootSequence'
import { isRtl } from './lib/language'
import HomePage from './pages/HomePage'
import BriefingPage from './pages/BriefingPage'
import SimulationPage from './pages/SimulationPage'
import ReportPage from './pages/ReportPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import InstructorDashboardPage from './pages/InstructorDashboardPage'
import { useSimulationStore } from './hooks/useSimulation'

function ProtectedRoute({ element }: { element: React.ReactNode }) {
  const userId = useSimulationStore((state) => state.userId)
  return userId ? element : <Navigate to="/login" replace />
}

function App() {
  const userId = useSimulationStore((state) => state.userId)
  const [mounted, setMounted] = useState(false)
  const [booting, setBooting] = useState(shouldShowBootSequence)
  const { i18n } = useTranslation()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    document.documentElement.lang = i18n.language
    document.documentElement.dir = isRtl(i18n.language) ? 'rtl' : 'ltr'
  }, [i18n.language])

  if (!mounted) return null

  if (booting) {
    return <BootSequence onDone={() => setBooting(false)} />
  }

  return (
    <>
      <LiveStatusBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={userId ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/briefing/:scenarioId" element={<ProtectedRoute element={<BriefingPage />} />} />
        <Route path="/simulation" element={<ProtectedRoute element={<SimulationPage />} />} />
        <Route path="/report" element={<ProtectedRoute element={<ReportPage />} />} />
        <Route path="/history" element={<ProtectedRoute element={<HistoryPage />} />} />
        <Route path="/instructor-dashboard" element={<ProtectedRoute element={<InstructorDashboardPage />} />} />
      </Routes>
    </>
  )
}

export default App
