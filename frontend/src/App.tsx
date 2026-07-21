import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SimulationPage from './pages/SimulationPage'
import ReportPage from './pages/ReportPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/simulation" element={<SimulationPage />} />
      <Route path="/report" element={<ReportPage />} />
    </Routes>
  )
}

export default App
