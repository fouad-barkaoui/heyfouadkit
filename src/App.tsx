import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppShell } from '@/components/shell/AppShell';
import { AuthProvider } from '@/state/authStore';
import { LanguageProvider } from '@/state/languageStore';
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
                  <AppShell />
                </UIProvider>
              </WorkspaceProvider>
            </TeamProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
