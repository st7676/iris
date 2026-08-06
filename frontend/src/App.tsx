import { Routes, Route } from 'react-router-dom'
import LiveStatusBar from './components/common/LiveStatusBar'
import HomePage from './pages/HomePage'
import SimulationPage from './pages/SimulationPage'
import ReportPage from './pages/ReportPage'
import HistoryPage from './pages/HistoryPage'

function App() {
  return (
    <>
      <LiveStatusBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </>
  )
}

export default App
