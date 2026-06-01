import { useState } from 'react';

const empty = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' };

/** Create / edit form. Pass `initial` (a task) to edit; omit to create. */
export default function TaskForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(
    initial
      ? {
          title: initial.title || '',
          description: initial.description || '',
          status: initial.status || 'todo',
          priority: initial.priority || 'medium',
          dueDate: initial.dueDate ? initial.dueDate.slice(0, 10) : '',
        }
      : empty
  );

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>
        Title
        <input name="title" value={form.title} onChange={onChange} required maxLength={140} placeholder="What needs doing?" />
      </label>
      <label>
        Description
        <textarea name="description" value={form.description} onChange={onChange} rows={3} maxLength={2000} placeholder="Optional details" />
      </label>
      <div className="form-row">
        <label>
          Status
          <select name="status" value={form.status} onChange={onChange}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>
          Priority
          <select name="priority" value={form.priority} onChange={onChange}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Due date
          <input type="date" name="dueDate" value={form.dueDate} onChange={onChange} />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
