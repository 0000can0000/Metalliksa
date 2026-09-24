"""Queue timeout defaults must cover supported job types without a timeout field."""
import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from lpbf_worker import Queue


class _CompletedChild:
    returncode = 0

    def __init__(self):
        self.poll_count = 0

    def poll(self):
        self.poll_count += 1
        return None if self.poll_count == 1 else 0


class WorkerTimeout(unittest.TestCase):
    def test_build_job_without_timeout_uses_bounded_worker_default(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as root:
            queue = Queue(root=root, start=False)
            job = "a" * 32
            folder = Path(root) / job
            folder.mkdir()
            (folder / "input.json").write_text(json.dumps({"jobType": "build-job"}))
            (folder / "result.json").write_text(json.dumps({"success": True}))
            with queue.connect() as connection:
                connection.execute(
                    "INSERT INTO jobs VALUES (?,?,?,?,?,?,?)",
                    (job, "test-key", "running", 0.0, "", None, time.time()),
                )

            try:
                with patch("lpbf_worker.subprocess.Popen", return_value=_CompletedChild()), \
                     patch("lpbf_worker.enforce_thermal_balances"):
                    queue.execute(job)

                self.assertEqual(queue.get(job)["status"], "completed")
            finally:
                queue.close()


if __name__ == "__main__":
    unittest.main()
