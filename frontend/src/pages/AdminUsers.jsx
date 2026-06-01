import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '../api/users.js';
import { extractError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ page, limit: PAGE_SIZE });
      setUsers(res.data.users);
      setMeta(res.meta);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (u, role) => {
    try {
      const updated = await usersApi.update(u.id, { role });
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
      toast.success(`${u.name} is now ${role}`);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const toggleActive = async (u) => {
    try {
      const updated = await usersApi.update(u.id, { isActive: !u.isActive });
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
      toast.success(`${u.name} ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Users</h1>
          <p className="muted">Admin-only. Manage roles and account status. {meta.total} total.</p>
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading users…</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me.id;
                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge--${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={u.isActive ? 'dot dot--on' : 'dot dot--off'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="row-actions">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot change your own role' : 'Change role'}
                        onChange={(e) => changeRole(u, e.target.value)}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        className={`btn btn--sm ${u.isActive ? 'btn--danger' : 'btn--ghost'}`}
                        disabled={isSelf}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            className="btn btn--ghost"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
