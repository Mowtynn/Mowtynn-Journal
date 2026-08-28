import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = (error?.message || '').toLowerCase();
    if (
      msg.includes('cannot listen to the event from the provided iframe') ||
      msg.includes('contentwindow is not available') ||
      msg.includes('speechsynthesis') ||
      msg.includes('speech synthesis')
    ) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.sectionName || 'section'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center p-6 bg-zinc-900/50 border border-red-500/20 rounded-xl">
          <div className="bg-red-500/10 p-4 rounded-full mb-4">
            <AlertTriangle className="text-red-400 w-8 h-8" />
          </div>
          <h2 className="text-zinc-200 font-bold mb-2">Veri Yüklenemedi</h2>
          <p className="text-zinc-400 text-sm text-center max-w-md">
            {this.props.sectionName 
              ? `${this.props.sectionName} yüklenirken bir hata oluştu.`
              : 'Bu alan yüklenirken beklenmeyen bir hata oluştu.'} 
          </p>
          <button
            className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors duration-200"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Tekrar Dene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
