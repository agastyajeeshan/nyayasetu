import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, LogOut, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NyayaSetu ErrorBoundary] Uncaught client error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('nyayasetu_token');
      localStorage.removeItem('kavach_token');
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F8FA] text-[#172033] flex flex-col justify-between selection:bg-[#12355B] selection:text-white font-sans p-6">
          <div className="gov-tricolor-strip fixed top-0 left-0 z-50" />

          <div className="w-full max-w-2xl mx-auto pt-8">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded bg-[#12355B] text-white flex items-center justify-center font-bold text-xs font-mono">
                NA
              </div>
              <div>
                <div className="text-xs font-bold text-[#12355B] tracking-tight">NYAYASETU AI</div>
                <div className="text-[10px] text-[#64748B]">Workstation Recovery Subsystem • SIH26190</div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card p-6 sm:p-8 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-btn bg-[#FDF2F2] border border-[#F8D7DA] text-[#C53D3D] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-[#172033]">
                    Workstation Session Recovery
                  </h1>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    An unexpected render interruption occurred while loading this view. Your evidentiary records and audit ledgers remain secure and intact on the central server.
                  </p>
                </div>
              </div>

              {this.state.error && (
                <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono text-[#C53D3D] overflow-x-auto">
                  <div className="font-bold text-[#172033] mb-1 font-sans text-[11px] uppercase tracking-wider">
                    Error Diagnostic:
                  </div>
                  <span>{this.state.error.toString()}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={this.handleReload}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Workstation</span>
                </button>

                <button
                  onClick={this.handleResetSession}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn bg-white hover:bg-[#FDF2F2] text-[#C53D3D] border border-[#F8D7DA] text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Clear Session & Return to Login</span>
                </button>
              </div>
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto text-center text-[11px] text-[#94A3B8] pb-4">
            National Informatics Centre (NIC) • Ministry of Home Affairs • NyayaSetu v1.0
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
