import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return this.props.fallback ?? (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <h2 className="font-display text-2xl text-ink mb-2">
              Une erreur s'est produite
            </h2>
            <p className="text-sm text-ink-muted mb-4">{error.message}</p>
            <pre className="text-xs bg-bg-subtle border border-line rounded p-3 overflow-auto text-negative mb-6 max-h-40">
              {error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 bg-accent text-white text-sm rounded font-sans"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
