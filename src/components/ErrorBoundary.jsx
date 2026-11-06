import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('creamy_coffee_pos_db_v3');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Terjadi Kendala Tampilan</h2>
              <p className="text-xs text-slate-500 mt-1">
                Komponen halaman mengalami kendala pemuatan data. Klik tombol di bawah untuk menyegarkan tampilan.
              </p>
              {this.state.error && (
                <div className="mt-3 p-2 bg-slate-50 rounded text-[11px] font-mono text-rose-700 text-left overflow-x-auto max-h-24">
                  {String(this.state.error.message || this.state.error)}
                </div>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-[#0f2b5b] hover:bg-[#153a7a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              Segarkan &amp; Pulihkan Tampilan
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
