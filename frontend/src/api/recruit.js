/**
 * recruit.js — API helpers for the Recruitment module.
 * All calls go through the shared axios instance (token + 401 handling included).
 */
import api from './axios';

// ── Dashboard ─────────────────────────────────────────────
export const getDashboardKpis     = (params) => api.get('/recruit/dashboard/kpis',      { params });
export const getDashboardPipeline = (params) => api.get('/recruit/dashboard/pipeline',  { params });
export const getDashboardByMonth  = (params) => api.get('/recruit/dashboard/by-month',  { params });
export const getDashboardDecisions= (params) => api.get('/recruit/dashboard/decisions', { params });
export const getDashboardSources  = (params) => api.get('/recruit/dashboard/sources',   { params });

// ── Vacancies ─────────────────────────────────────────────
export const listVacancies    = (params)     => api.get('/recruit/vacancies',          { params });
export const getVacancy       = (id)         => api.get(`/recruit/vacancies/${id}`);
export const createVacancy    = (data)       => api.post('/recruit/vacancies',         data);
export const updateVacancy    = (id, data)   => api.put(`/recruit/vacancies/${id}`,   data);
export const deleteVacancy    = (id)         => api.delete(`/recruit/vacancies/${id}`);

// ── Candidates ────────────────────────────────────────────
export const listCandidates   = (params)     => api.get('/recruit/candidates',         { params });
export const getCandidate     = (id)         => api.get(`/recruit/candidates/${id}`);
export const createCandidate  = (data)       => api.post('/recruit/candidates',        data);
export const updateCandidate  = (id, data)   => api.put(`/recruit/candidates/${id}`,  data);
export const deleteCandidate  = (id)         => api.delete(`/recruit/candidates/${id}`);
export const addCandidateNote = (id, data)   => api.post(`/recruit/candidates/${id}/notes`,   data);
export const hireCandidate    = (id, data)   => api.post(`/recruit/candidates/${id}/hire`,     data);
export const rescoreCandidate = (id)         => api.post(`/recruit/candidates/${id}/rescore`);

// CV upload (multipart)
export const uploadCV = (candidateId, file, onProgress) => {
  const form = new FormData();
  form.append('cv', file);
  return api.post(`/recruit/candidates/${candidateId}/upload-cv`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
};

// ── Settings ─────────────────────────────────────────────
export const getDepartments    = ()           => api.get('/recruit/settings/departments');
export const createDepartment  = (data)       => api.post('/recruit/settings/departments',       data);
export const updateDepartment  = (id, data)   => api.put(`/recruit/settings/departments/${id}`,  data);
export const deleteDepartment  = (id)         => api.delete(`/recruit/settings/departments/${id}`);

export const getSources        = ()           => api.get('/recruit/settings/sources');
export const createSource      = (data)       => api.post('/recruit/settings/sources',       data);
export const updateSource      = (id, data)   => api.put(`/recruit/settings/sources/${id}`,  data);
export const deleteSource      = (id)         => api.delete(`/recruit/settings/sources/${id}`);

export const getRecruiters     = ()           => api.get('/recruit/settings/recruiters');
