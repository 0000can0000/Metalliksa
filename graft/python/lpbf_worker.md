# python/lpbf_worker.py

- capabilities · function · L26-L40 — def capabilities()
- Queue · class · L43-L232 — class Queue
- __init__ · method · L44-L56 — def __init__(self, root=ROOT, start=True)
- close · method · L58-L61 — def close(self)
- connect · method · L64-L71 — def connect(self)
- update · method · L73-L75 — def update(self, job, **values)
- finish_running · method · L77-L81 — def finish_running(self, job, **values): # Atomic terminal transition: a cancellation winning the race stays cancelled.
- get · method · L83-L101 — def get(self, job)
- artifact · method · L103-L116 — def artifact(self, payload)
- submit · method · L118-L155 — def submit(self, raw)
- cancel · method · L157-L162 — def cancel(self, job)
- work · method · L164-L178 — def work(self)
- execute · method · L180-L232 — def execute(self, job)
- main · function · L235-L291 — def main()
- monitor_parent · function · L240-L244 — def monitor_parent()
- report · function · L246-L247 — def report(progress, message)
