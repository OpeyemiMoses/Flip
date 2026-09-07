import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FLIP ErrorBoundary caught exception]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAF9F6',
            color: '#1A1816',
            padding: '2rem',
            fontFamily: "'Inter', sans-serif",
            textAlign: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '16px',
              padding: '2.5rem',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(229, 9, 20, 0.1)',
                color: '#E50914',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                fontSize: '1.5rem',
                fontWeight: 900,
              }}
            >
              !
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#6B7280', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                backgroundColor: '#1A1816',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '24px',
                padding: '0.75rem 1.75rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload FLIP
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
