import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary/ErrorBoundary';
import { ToastProvider } from '@/components/common/Toast';
import { AppRoutes } from '@/routes/AppRoutes';
import { AiAssistant } from '@/components/assistant/AiAssistant/AiAssistant';
import { DemoModeBadge } from '@/components/common/DemoModeBadge/DemoModeBadge';
import { GlobalBackButton } from '@/components/common/BackButton/GlobalBackButton';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
            {/* Mounted once here, outside the router's layouts, so the
                assistant is available on every page of every module. */}
            <AiAssistant />
            <DemoModeBadge />
            <GlobalBackButton />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
