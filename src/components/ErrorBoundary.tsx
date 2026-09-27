import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface State {
  error: Error | null;
}

/**
 * One malformed record must never blank the whole workspace. The boundary
 * keeps the failure local and offers a way back without losing the session.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[heyfouad] render error', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="surface-card w-full max-w-[460px] p-6">
          <h1 className="text-[17px] font-medium tracking-[-0.016em] text-paper">Something in this view failed</h1>
          <p className="mt-2 text-[13px] leading-[1.6] text-ash">
            The rest of the workspace is intact. Reloading usually clears it; your data is stored separately from
            the view that broke.
          </p>
          <pre className="mono mt-4 max-h-[140px] overflow-auto rounded-[6px] bg-void px-3 py-2.5 text-[11.5px] text-fog shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            {error.message}
          </pre>
          <div className="mt-5 flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              <RefreshCw size={13} strokeWidth={1.9} aria-hidden />
              Reload
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
