import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppShell } from '@/components/shell/AppShell';
import { AuthProvider } from '@/state/authStore';
import { LanguageProvider } from '@/state/languageStore';
import { NotificationsProvider } from '@/state/notificationsStore';
import { TeamProvider } from '@/state/teamStore';
import { ThemeProvider } from '@/state/themeStore';
import { UIProvider } from '@/state/uiStore';
import { WorkspaceProvider } from '@/state/workspaceStore';

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TeamProvider>
              <WorkspaceProvider>
                <UIProvider>
                  <NotificationsProvider>
                    <AppShell />
                  </NotificationsProvider>
                </UIProvider>
              </WorkspaceProvider>
            </TeamProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
