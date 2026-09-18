# python/lpbf_worker.py

- capabilities · function · L27-L41 — def capabilities()
- Queue · class · L44-L233 — class Queue
- __init__ · method · L45-L57 — def __init__(self, root=ROOT, start=True)
- close · method · L59-L62 — def close(self)
- connect · method · L65-L72 — def connect(self)
- update · method · L74-L76 — def update(self, job, **values)
- finish_running · method · L78-L82 — def finish_running(self, job, **values): # Atomic terminal transition: a cancellation winning the race stays cancelled.
- get · method · L84-L102 — def get(self, job)
- artifact · method · L104-L117 — def artifact(self, payload)
- submit · method · L119-L156 — def submit(self, raw)
- cancel · method · L158-L163 — def cancel(self, job)
- work · method · L165-L179 — def work(self)
- execute · method · L181-L233 — def execute(self, job)
- main · function · L236-L305 — def main()
- monitor_parent · function · L241-L245 — def monitor_parent()
- report · function · L247-L248 — def report(progress, message)
