import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Server, ExternalLink } from 'lucide-react';
import { APP_CONFIG, HealthCheckResponse } from '@bookleaf/shared';
import { Button } from '@/components/ui/button';

  export function App() {
    const [apiHealth, setApiHealth] = useState<HealthCheckResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkHealth = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/health');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data: HealthCheckResponse = await res.json();
        setApiHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reach API');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      checkHealth();
    }, []);

    return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
              <main className="max-w-xl w-full bg-white rounded-xl shadow-md border border-slate-200 p-8 space-y-6">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{APP_CONFIG.name}</h1>
                    <p className="text-sm text-slate-500">Monorepo Setup & Verification</p>
                  </div>
                </div>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Stack Verification
                  </h2>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>Frontend: React + Vite + Tailwind CSS + Lucide</span>
                    </li>
                    <li className="flex items-center text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>UI Components: shadcn/ui configured</span>
                    </li>
                    <li className="flex items-center text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>Shared Package: Consuming @bookleaf/shared</span>
                    </li>
                  </ul>
                </div>

                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Server className="w-4 h-4 text-slate-600" />
                          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                            Backend API Status
                          </h2>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={checkHealth}
                          disabled={loading}
                        >
                          {loading ? 'Checking...' : 'Check Health'}
                        </Button>
                      </div>

                      {loading && !apiHealth && (
                        <p className="text-sm text-slate-500">Connecting to API...</p>
                      )}

                      {apiHealth && (
                        <div className="mt-2 text-sm text-slate-700 space-y-1">
                          <div className="flex items-center text-emerald-700 font-medium">
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            API is reachable ({apiHealth.status.toUpperCase()})
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            Message: {apiHealth.message}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            Environment: {apiHealth.environment}
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="mt-2 text-sm text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                          <p className="font-medium">API is currently offline or unreachable.</p>
                          <p className="text-xs text-amber-600 mt-1">
                            Start backend with <code className="bg-amber-100 px-1 rounded">npm run dev:api</code> or <code className="bg-amber-100 px-1 rounded">npm run dev</code> ({error}).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>Version {APP_CONFIG.version}</span>
                      <span className="flex items-center">
                        Ready for feature development
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </span>
                    </div>
            </main>
          </div>
          );
}

          export default App;
