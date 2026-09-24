# IN625 CUDA repeated timing after inversion synchronization reduction — 2026-09-24

## Method

After commit 150e604, each resolution had one CPU and one explicit
cuda:0 warm-up excluded from timing, followed by five alternating CPU/CUDA
repeats. CUDA was synchronized immediately before and after each timed call.
The same source profile, domain, initial temperature, boundary conditions, and
duration were used for each CPU/CUDA pair. The measured interval covers the
direct run_cpu or run_cuda call, including solver work and result/diagnostic
construction; it excludes UI/API transport. This is a small local timing
campaign, not a general device benchmark.

## Results

| Grid | CPU median (range) | CUDA median (range) | CUDA / CPU median | Max temperature difference |
| --- | ---: | ---: | ---: | ---: |
| 128 cells, 33 steps | 0.197975 s (0.194243–0.219378) | 4.876871 s (4.855451–5.157074) | 24.634× slower | 4.547e-13 K |
| 1,024 cells, 132 steps | 1.358964 s (1.311236–1.636411) | 19.098597 s (18.307919–20.404802) | 14.054× slower | 9.095e-13 K |

The focused field suite passed 12/12 after the synchronization reduction,
including independent enthalpy and energy checks. CUDA remains substantially
slower at both tested sizes. The earlier one-shot timing rows are not a paired
before/after campaign, so this measurement cannot establish how much of the
difference came from the code change, warm-up, or run conditions. No speedup or
crossover is claimed.

## Scope

This is a numerical screening law only. It does not qualify IN625, validate
LPBF process behavior, establish a general transient path, or close P6/P7.
