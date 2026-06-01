import { api } from './client.js';

export const usersApi = {
  list: (params) => api.get('/users', { params }).then((r) => r.data),
  update: (id, payload) => api.patch(`/users/${id}`, payload).then((r) => r.data.data.user),
};
