import React from 'react';

/** A failed optional module must not take down navigation or other running work. */
export class ModuleBoundary extends React.Component<{ children: React.ReactNode; label: string }, { error: string | null }> {
  // The legacy project does not ship @types/react; declare inherited members
  // without replacing React's runtime implementation.
  declare props: { children: React.ReactNode; label: string };
  declare setState: (state: { error: string | null }) => void;
  state = { error: null as string | null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : 'The module could not be loaded.' };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <section role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3">
      <h3 className="font-semibold text-amber-200">{this.props.label} unavailable</h3>
      <p className="text-sm text-slate-300 break-words">{this.state.error}</p>
      <p className="text-xs text-slate-400">Other workspaces remain available. Retrying resets this module's local view; shared specimen and registry records are retained.</p>
      <div className="flex flex-wrap gap-3"><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm" onClick={() => this.setState({ error: null })}>Retry module</button><button className="rounded-lg border border-slate-700 px-4 py-2 text-sm" onClick={() => window.location.reload()}>Reload application</button></div>
      <p className="text-xs text-slate-500">A failed download may require reloading. Export session-only work from other modules first.</p>
    </section>;
  }
}
