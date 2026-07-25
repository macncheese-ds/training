import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TrainingList from './pages/trainings/TrainingList';
import TrainingForm from './pages/trainings/TrainingForm';
import TrainingDetail from './pages/trainings/TrainingDetail';
import ExamBuilder from './pages/exams/ExamBuilder';
import ExamTaker from './pages/exams/ExamTaker';
import ExamList from './pages/exams/ExamList';
import SkillMatrix from './pages/skills/SkillMatrix';
import SkillConfig from './pages/skills/SkillConfig';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import EmployeeSearch from './pages/employees/EmployeeSearch';
import MyTrainings from './pages/MyTrainings';

// ── Recruitment Module ────────────────────────────────────
import RecruitDashboard from './pages/recruit/RecruitDashboard';
import VacanciesList    from './pages/recruit/VacanciesList';
import VacancyForm      from './pages/recruit/VacancyForm';
import CandidatesList   from './pages/recruit/CandidatesList';
import CandidateDetail  from './pages/recruit/CandidateDetail';
import CandidateForm    from './pages/recruit/CandidateForm';

function getUser() {
  const raw = sessionStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function Protected({ children }) {
  const user = getUser();
  if (!user || !sessionStorage.getItem('token')) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.platformRole !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function ManagerOnly({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.platformRole !== 'admin' && user.platformRole !== 'manager') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        {/* ── General ── */}
        <Route index element={<Dashboard />} />
        <Route path="my-trainings" element={<MyTrainings />} />
        <Route path="profile" element={<EmployeeProfile />} />

        {/* ── Gestion (manager+) ── */}
        <Route path="trainings" element={<ManagerOnly><TrainingList /></ManagerOnly>} />
        <Route path="trainings/new" element={<AdminOnly><TrainingForm /></AdminOnly>} />
        <Route path="trainings/:id" element={<TrainingDetail />} />
        <Route path="trainings/:id/edit" element={<AdminOnly><TrainingForm /></AdminOnly>} />
        <Route path="employees" element={<ManagerOnly><EmployeeSearch /></ManagerOnly>} />
        <Route path="employees/:id" element={<ManagerOnly><EmployeeProfile /></ManagerOnly>} />
        <Route path="skills" element={<ManagerOnly><SkillMatrix /></ManagerOnly>} />

        {/* ── Administracion (admin only) ── */}
        <Route path="exams" element={<AdminOnly><ExamList /></AdminOnly>} />
        <Route path="exams/new" element={<AdminOnly><ExamBuilder /></AdminOnly>} />
        <Route path="exams/:id/edit" element={<AdminOnly><ExamBuilder /></AdminOnly>} />
        <Route path="exams/:id/take" element={<ExamTaker />} />
        <Route path="skills/config" element={<AdminOnly><SkillConfig /></AdminOnly>} />

        {/* ── Reclutamiento (admin only) ── */}
        <Route path="recruit" element={<AdminOnly><RecruitDashboard /></AdminOnly>} />
        <Route path="recruit/vacancies" element={<AdminOnly><VacanciesList /></AdminOnly>} />
        <Route path="recruit/vacancies/new" element={<AdminOnly><VacancyForm /></AdminOnly>} />
        <Route path="recruit/vacancies/:id" element={<AdminOnly><VacancyForm /></AdminOnly>} />
        <Route path="recruit/vacancies/:id/edit" element={<AdminOnly><VacancyForm /></AdminOnly>} />
        <Route path="recruit/candidates" element={<AdminOnly><CandidatesList /></AdminOnly>} />
        <Route path="recruit/candidates/new" element={<AdminOnly><CandidateForm /></AdminOnly>} />
        <Route path="recruit/candidates/:id" element={<AdminOnly><CandidateDetail /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


