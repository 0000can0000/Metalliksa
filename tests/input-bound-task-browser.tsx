import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useInputBoundTask } from '../src/hooks/useInputBoundTask';

// Run in the browser harness: exercises the real hook, including layout cleanup.
export function verifyInputBoundTask() {
  let task: ReturnType<typeof useInputBoundTask<number>>;
  const container = document.createElement('div');
  const root = createRoot(container);
  let passed = 0;
  function Probe({ input }: { input: string }) {
    task = useInputBoundTask<number>(input);
    return null;
  }
  const check = (ok: boolean, name: string) => {
    if (!ok) throw new Error(name);
    passed++;
  };
  const render = (input: string) => flushSync(() => root.render(<Probe input={input} />));
  const begin = () => {
    let request: ReturnType<typeof task.begin>;
    flushSync(() => { request = task.begin('fit'); });
    return request!;
  };
  try {
    render('A');
    const first = begin();
    flushSync(() => first.publish(17));
    check(task!.data === 17, 'Current reply must publish');
    render('A');
    check(task!.data === 17, 'Unrelated render must preserve current result');
    render('B');
    check(task!.data === null && first.signal.aborted, 'Changed input must clear result and abort request');
    flushSync(() => { first.publish(99); first.fail(new Error('late')); first.finish(); });
    check(task!.data === null && task!.error === null, 'Late success/error must not change new input');
    render('A');
    check(task!.data === null && !first.isCurrent(), 'A-B-A must not resurrect old result');
    const old = begin();
    const latest = begin();
    flushSync(() => { old.publish(99); old.fail(new Error('late')); old.finish(); });
    check(old.signal.aborted && task!.pending === 'fit' && task!.error === null, 'Old finally must not finish a retry');
    flushSync(() => { latest.publish(0); latest.finish(); });
    check(task!.data === 0 && task!.pending === null, 'Current zero result must survive completion');
    const failed = begin();
    check(task!.data === null, 'Retry must clear completed result');
    flushSync(() => failed.fail(new Error('Unavailable')));
    check(task!.data === null && task!.error === 'Unavailable', 'Current failure must remain an error');
    const detached = begin();
    flushSync(() => root.unmount());
    check(detached.signal.aborted && !detached.isCurrent(), 'Unmount must invalidate outstanding callbacks');
    return `${passed} lifecycle assertions PASS`;
  } catch (error) {
    flushSync(() => root.unmount());
    throw error;
  }
}
