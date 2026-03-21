import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'

// Vessel pages
import VesselListPage from './pages/vessels/VesselListPage'
import VesselEditorPage from './pages/vessels/VesselEditorPage'

// Equipment pages
import EquipmentListPage from './pages/equipment/EquipmentListPage'
import EquipmentEditorPage from './pages/equipment/EquipmentEditorPage'

// Rigging pages
import RiggingListPage from './pages/rigging/RiggingListPage'
import RiggingEditorPage from './pages/rigging/RiggingEditorPage'

// Project pages
import ProjectListPage from './pages/projects/ProjectListPage'
import NewProjectPage from './pages/projects/NewProjectPage'
import ProjectWorkspace from './pages/projects/ProjectWorkspace'
import ProjectOverviewPage from './pages/projects/ProjectOverviewPage'
import DeckLayoutPage from './pages/projects/DeckLayoutPage'
import RiggingPage from './pages/projects/RiggingPage'
import SeaFasteningPage from './pages/projects/SeaFasteningPage'
import StabilityPage from './pages/projects/StabilityPage'
import LoweringPage from './pages/projects/LoweringPage'
import AnalysisPage from './pages/projects/AnalysisPage'
import Viewer3DPage from './pages/projects/Viewer3DPage'
import ReportPage from './pages/projects/ReportPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Root redirect */}
          <Route index element={<Navigate to="/projects" replace />} />

          {/* Vessel Library */}
          <Route path="vessels" element={<VesselListPage />} />
          <Route path="vessels/new" element={<VesselEditorPage />} />
          <Route path="vessels/:id" element={<VesselEditorPage />} />

          {/* Equipment Library */}
          <Route path="equipment" element={<EquipmentListPage />} />
          <Route path="equipment/new" element={<EquipmentEditorPage />} />
          <Route path="equipment/:id" element={<EquipmentEditorPage />} />

          {/* Rigging Library */}
          <Route path="rigging" element={<RiggingListPage />} />
          <Route path="rigging/new" element={<RiggingEditorPage />} />
          <Route path="rigging/:id" element={<RiggingEditorPage />} />

          {/* Projects */}
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/new" element={<NewProjectPage />} />

          {/* Project workspace — nested routes rendered inside sidebar shell */}
          <Route path="projects/:id" element={<ProjectWorkspace />}>
            <Route index element={<ProjectOverviewPage />} />
            <Route path="deck" element={<DeckLayoutPage />} />
            <Route path="rigging" element={<RiggingPage />} />
            <Route path="seafastening" element={<SeaFasteningPage />} />
            <Route path="stability" element={<StabilityPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="lowering" element={<LoweringPage />} />
            <Route path="3d" element={<Viewer3DPage />} />
            <Route path="report" element={<ReportPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
