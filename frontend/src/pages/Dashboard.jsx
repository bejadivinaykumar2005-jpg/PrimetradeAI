import { useCallback, useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks.js';
import { extractError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import TaskForm from '../components/TaskForm.jsx';

const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
const PAGE_SIZE = 6;

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: PAGE_SIZE };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const res = await tasksApi.list(params);
      setTasks(res.data.tasks);
      setMeta(res.meta);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setShowForm(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await tasksApi.update(editing.id, payload);
        toast.success('Task updated');
      } else {
        await tasksApi.create(payload);
        toast.success('Task created');
      }
      setShowForm(false);
      setEditing(null);
      // Jump back to first page so a newly created task is visible.
      setFilters((f) => ({ ...f, page: editing ? f.page : 1 }));
      if (editing) load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (task, status) => {
    try {
      await tasksApi.update(task.id, { status });
      setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, status } : t)));
      toast.success(`Marked "${task.title}" as ${STATUS_LABEL[status]}`);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await tasksApi.remove(task.id);
      toast.success('Task deleted');
      // If we removed the last item on a page, step back a page.
      const lastOnPage = tasks.length === 1 && filters.page > 1;
      setFilters((f) => ({ ...f, page: lastOnPage ? f.page - 1 : f.page }));
      if (!lastOnPage) load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const onSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
    load();
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Tasks</h1>
          <p className="muted">
            {isAdmin ? 'Admin view — showing every user’s tasks.' : 'Your personal task list.'}{' '}
            {meta.total} total.
          </p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>
          + New task
        </button>
      </div>

      <div className="toolbar">
        <form className="toolbar__search" onSubmit={onSearch}>
          <input
            placeholder="Search by title…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <button className="btn btn--ghost">Search</button>
        </form>
        <div className="toolbar__filters">
          {['', 'todo', 'in_progress', 'done'].map((s) => (
            <button
              key={s || 'all'}
              className={`chip ${filters.status === s ? 'chip--active' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, status: s, page: 1 }))}
            >
              {s ? STATUS_LABEL[s] : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="empty">
          <p>No tasks found.</p>
          <button className="btn btn--primary" onClick={openCreate}>
            Create your first task
          </button>
        </div>
      ) : (
        <div className="task-grid">
          {tasks.map((task) => (
            <article key={task.id} className={`task-card task-card--${task.priority}`}>
              <div className="task-card__top">
                <span className={`status-pill status-pill--${task.status}`}>
                  {STATUS_LABEL[task.status]}
                </span>
                <span className={`prio prio--${task.priority}`}>{task.priority}</span>
              </div>
              <h3>{task.title}</h3>
              {task.description && <p className="task-card__desc">{task.description}</p>}
              <div className="task-card__meta">
                {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>}
                {isAdmin && task.owner?.email && <span>👤 {task.owner.email}</span>}
              </div>
              <div className="task-card__actions">
                <select
                  value={task.status}
                  onChange={(e) => quickStatus(task, e.target.value)}
                  aria-label="Change status"
                >
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
                <button className="btn btn--ghost btn--sm" onClick={() => openEdit(task)}>
                  Edit
                </button>
                <button className="btn btn--danger btn--sm" onClick={() => handleDelete(task)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn--ghost"
            disabled={meta.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            ← Prev
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            className="btn btn--ghost"
            disabled={meta.page >= meta.totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Next →
          </button>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit task' : 'New task'} onClose={() => setShowForm(false)}>
          <TaskForm
            initial={editing}
            submitting={saving}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}
