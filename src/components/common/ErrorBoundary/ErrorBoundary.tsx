import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { reportFrontendError } from '@/services/seedLotRealtimeClient';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * The app-wide crash net. A render error anywhere below this boundary shows
 * a friendly recovery screen instead of a blank white page, and is reported
 * to the backend's error-aggregation service (best-effort — reportFrontendError
 * swallows its own failures so a reporting problem never masks the original
 * crash or blocks the recovery UI from rendering).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void reportFrontendError({
      message: error.message,
      stackTrace: error.stack,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      context: { componentStack: info.componentStack ?? undefined },
    });
  }

  handleRetry = (): void => {
    this.setState({ error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <AlertTriangle size={40} className={styles.icon} />
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.message}>
            This page hit an unexpected error. It's been reported automatically. You can try continuing, or reload the
            page if the problem persists.
          </p>
          <p className={styles.detail}>{error.message}</p>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={this.handleRetry}>
              <RotateCcw size={16} /> Try Again
            </button>
            <button className={styles.secondaryButton} onClick={this.handleReload}>
              <RefreshCw size={16} /> Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
