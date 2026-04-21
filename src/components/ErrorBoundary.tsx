import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Runtime Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ marginBottom: '10px' }}>오류가 발생했습니다</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>앱을 실행하는 중 문제가 발생했습니다. 새로고침을 시도해 보세요.</p>
          <pre style={{ 
            textAlign: 'left', 
            padding: '15px', 
            borderRadius: '8px', 
            backgroundColor: '#f8f9fa', 
            wordBreak: 'break-all', 
            whiteSpace: 'pre-wrap', 
            fontSize: '11px', 
            color: '#dc3545',
            maxWidth: '90%',
            overflow: 'auto',
            marginBottom: '20px'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#3182f6', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
