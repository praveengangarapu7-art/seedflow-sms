import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './Unauthorized.module.css';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBackToDashboard = () => {
    navigate('/procurement/dashboard');
  };

  const handleSwitchUser = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconBox}>
          <ShieldAlert size={48} className={styles.icon} />
        </div>
        <h1 className={styles.title}>Access denied</h1>
        <p className={styles.description}>
          Your role doesn't have permission to view this page.
        </p>
        <div className={styles.actions}>
          <button onClick={handleBackToDashboard} className={styles.primaryBtn}>
            Back to dashboard
          </button>
          <button onClick={handleSwitchUser} className={styles.secondaryBtn}>
            Sign in as different user
          </button>
        </div>
      </div>
    </div>
  );
}
