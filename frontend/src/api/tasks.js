import { api } from './client.js';

export const tasksApi = {
  list: (params) => api.get('/tasks', { params }).then((r) => r.data),
  create: (payload) => api.post('/tasks', payload).then((r) => r.data.data.task),
  update: (id, payload) => api.patch(`/tasks/${id}`, payload).then((r) => r.data.data.task),
  remove: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
};
