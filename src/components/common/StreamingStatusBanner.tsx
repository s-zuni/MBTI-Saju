import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StreamingStatusBannerProps {
  isStreaming: boolean;
  hasData: boolean;
  error?: string | null;
  onRetry?: (() => void) | undefined;
  streamingTitle?: string;
  streamingSubtitle?: string;
  completedText?: string;
  isFree?: boolean;
}

export const StreamingStatusBanner: React.FC<StreamingStatusBannerProps> = ({
  isStreaming,
  hasData,
  error,
  onRetry,
  streamingTitle = '결제가 완료되어 풀이를 실시간으로 작성하고 있습니다',
  streamingSubtitle = '완성된 문단부터 아래에 바로 표시됩니다.',
  completedText = '풀이가 완료되었습니다.',
  isFree = false,
}) => {
  if (error && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-rose-50/50 rounded-2xl border border-rose-200 space-y-4">
        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-rose-600" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-lg font-bold text-slate-900">분석 중 오류가 발생했습니다</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{error}</p>
          {!isFree && (
            <p className="text-sm font-bold text-slate-900">
              결제하신 이용권은 소진되지 않아 바로 다시 시도하실 수 있습니다.
            </p>
          )}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-7 py-3.5 bg-slate-950 hover:bg-slate-800 text-white rounded-full font-bold text-sm transition-colors"
          >
            다시 시도하기
          </button>
        )}
      </div>
    );
  }

  if (isStreaming && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-[#FAF7F0] rounded-2xl border border-[#E6DFD1] space-y-3">
        {!isFree && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            결제가 정상 완료되었습니다
          </div>
        )}
        <Loader2 className="w-9 h-9 text-indigo-900 animate-spin my-2 stroke-[1.75]" />
        <p className="text-slate-900 font-bold text-lg tracking-tight">{streamingTitle}</p>
        <p className="text-stone-600 text-sm">{streamingSubtitle}</p>
      </div>
    );
  }

  if (isStreaming && hasData) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
        <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug">{streamingTitle}</p>
          <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">{streamingSubtitle}</p>
        </div>
      </div>
    );
  }

  if (!isStreaming && hasData) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 text-sm font-semibold">
        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>{completedText}</span>
      </div>
    );
  }

  return null;
};

export default StreamingStatusBanner;
