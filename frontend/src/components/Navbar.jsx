import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.info('Logged out');
    navigate('/login');
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        ⬡ Primetrade<span>Tasks</span>
      </Link>

      {isAuthenticated && (
        <nav className="navbar__links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          {isAdmin && <NavLink to="/admin/users">Users</NavLink>}
        </nav>
      )}

      <div className="navbar__right">
        {isAuthenticated ? (
          <>
            <span className="navbar__user">
              {user.name}
              <span className={`badge badge--${user.role}`}>{user.role}</span>
            </span>
            <button className="btn btn--ghost" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="btn btn--ghost">
              Login
            </NavLink>
            <NavLink to="/register" className="btn btn--primary">
              Sign up
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
