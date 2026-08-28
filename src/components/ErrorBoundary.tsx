import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = (error?.message || '').toLowerCase();
    if (
      msg.includes('cannot listen to the event from the provided iframe') ||
      msg.includes('contentwindow is not available') ||
      msg.includes('speechsynthesis') ||
      msg.includes('speech synthesis')
    ) {
      return { hasError: false, errorMsg: "" };
    }
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMsg: "" });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/20 p-8 rounded-2xl max-w-lg w-full text-center space-y-4">
            <AlertCircle size={48} className="text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-zinc-100">Beklenmedik bir hata oluştu</h1>
            <p className="text-sm text-zinc-400 font-mono overflow-auto max-h-32 bg-black p-2 rounded">
              {this.state.errorMsg || "Bilinmeyen bir hata gerçekleşti."}
            </p>
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors duration-200 ease-out font-bold uppercase tracking-widest text-sm"
            >
              <RefreshCcw size={16} /> Uygulamayı Yeniden Başlat
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
