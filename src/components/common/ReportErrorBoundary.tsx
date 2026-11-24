import React from 'react';

interface ReportErrorBoundaryProps {
  children: React.ReactNode;
  onRetry: () => void;
}

interface ReportErrorBoundaryState {
  hasError: boolean;
}

export class ReportErrorBoundary extends React.Component<
  ReportErrorBoundaryProps,
  ReportErrorBoundaryState
> {
  constructor(props: ReportErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ReportErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[ReportErrorBoundary] render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-rose-50/40 rounded-2xl border border-rose-200">
          <p className="text-base font-bold text-slate-900 mb-3">
            화면 표시 중 일시적인 오류가 발생했습니다.
          </p>
          <p className="text-sm text-slate-600 mb-5">
            결제하신 이용권은 소진되지 않아 바로 다시 불러올 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
            className="px-6 py-3 bg-slate-950 text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            다시 불러오기
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ReportErrorBoundary;
