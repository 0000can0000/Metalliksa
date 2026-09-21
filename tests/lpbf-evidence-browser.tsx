import React from 'react';
import { createRoot } from 'react-dom/client';
import { ExperimentalValidationLab } from '../src/components/ExperimentalValidationLab';
import '../src/index.css';

function Harness() {
  const [open, setOpen] = React.useState(true);
  return <main className="min-h-screen bg-slate-950 p-4 text-white">
    <nav aria-label="Regression harness navigation">
      <button className="border rounded p-2 focus-visible:outline-2" onClick={() => setOpen(!open)}>
        {open ? 'Leave comparison' : 'Open comparison'}
      </button>
    </nav>
    {open && <ExperimentalValidationLab />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
