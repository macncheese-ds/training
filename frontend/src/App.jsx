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
        <Route index element={<Dashboard />} />
        <Route path="my-trainings" element={<MyTrainings />} />
        <Route path="trainings" element={<ManagerOnly><TrainingList /></ManagerOnly>} />
        <Route path="trainings/new" element={<AdminOnly><TrainingForm /></AdminOnly>} />
        <Route path="trainings/:id" element={<TrainingDetail />} />
        <Route path="trainings/:id/edit" element={<AdminOnly><TrainingForm /></AdminOnly>} />
        <Route path="exams" element={<AdminOnly><ExamList /></AdminOnly>} />
        <Route path="exams/new" element={<AdminOnly><ExamBuilder /></AdminOnly>} />
        <Route path="exams/:id/edit" element={<AdminOnly><ExamBuilder /></AdminOnly>} />
        <Route path="exams/:id/take" element={<ExamTaker />} />
        <Route path="skills" element={<ManagerOnly><SkillMatrix /></ManagerOnly>} />
        <Route path="skills/config" element={<AdminOnly><SkillConfig /></AdminOnly>} />
        <Route path="employees" element={<ManagerOnly><EmployeeSearch /></ManagerOnly>} />
        <Route path="employees/:id" element={<ManagerOnly><EmployeeProfile /></ManagerOnly>} />
        <Route path="profile" element={<EmployeeProfile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
