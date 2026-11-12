import { DirectionProvider } from '@radix-ui/react-direction';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppShell } from '@/components/shell/AppShell';
import { AuthProvider } from '@/state/authStore';
import { LanguageProvider, useLanguage } from '@/state/languageStore';
import { NotificationsProvider } from '@/state/notificationsStore';
import { TeamProvider } from '@/state/teamStore';
import { ThemeProvider } from '@/state/themeStore';
import { UIProvider } from '@/state/uiStore';
import { WorkspaceProvider } from '@/state/workspaceStore';

/** Radix menus, popovers and dialogs default to left-to-right; this hands them the page's direction. */
function RadixDirection({ children }: { children: ReactNode }): JSX.Element {
  const { isArabic } = useLanguage();
  return <DirectionProvider dir={isArabic ? 'rtl' : 'ltr'}>{children}</DirectionProvider>;
}

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <RadixDirection>
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
          </RadixDirection>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
