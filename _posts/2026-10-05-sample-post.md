---
title: "Sample post: equations, code and tables"
description: A placeholder that shows what a post here can contain. Delete it once you have written your own.
tags: [meta]
# Hidden: change to true to show this post on the site.
published: false
---

This is a sample post. It shows how equations, code, tables and footnotes are
written. Delete `_posts/2026-10-05-sample-post.md` when you publish your first
real post.

## Equations

Maths is LaTeX between double dollar signs. Inside a sentence it stays inline:
the XY model puts an angle $$\theta_i \in [0, 2\pi)$$ on every lattice site.
On a paragraph of its own it becomes a display equation:

$$
H = -J \sum_{\langle i, j \rangle} \cos(\theta_i - \theta_j)
$$

Use an `equation` environment with a `\label` to get a number you can refer to:

$$
\begin{equation}
p(\boldsymbol{\theta}) = \frac{1}{Z} \exp\!\left(-\frac{H(\boldsymbol{\theta})}{k_B T}\right)
\label{eq:boltzmann}
\end{equation}
$$

The Boltzmann distribution $$\eqref{eq:boltzmann}$$ is what a Monte Carlo
sampler draws from.

## Code

Fence code with three backticks and name the language to get highlighting:

```python
import numpy as np


def metropolis_sweep(theta, T, rng, width=1.0):
    """One Metropolis sweep of the 2D XY model, with J = 1."""
    L = theta.shape[0]
    for _ in range(L * L):
        i, j = rng.integers(L, size=2)
        old = theta[i, j]
        new = old + rng.uniform(-width, width)
        neighbours = (
            theta[(i + 1) % L, j], theta[(i - 1) % L, j],
            theta[i, (j + 1) % L], theta[i, (j - 1) % L],
        )
        dE = sum(np.cos(old - n) - np.cos(new - n) for n in neighbours)
        if dE <= 0 or rng.random() < np.exp(-dE / T):
            theta[i, j] = new % (2 * np.pi)
    return theta
```

Inline code uses single backticks: `rng = np.random.default_rng(0)`.

## Tables

The lines at the top of a post file are its settings:

| Setting       | Needed | What it does                                        |
|---------------|--------|-----------------------------------------------------|
| `title`       | Yes    | The heading of the post and its name in lists       |
| `description` | No     | One sentence shown under the title in lists         |
| `tags`        | No     | A list such as `[diffusion, turbulence]`            |
| `math`        | No     | Set to `false` to skip loading the equation renderer |

## Footnotes, quotes and images

A footnote marker goes in the text[^note] and its content anywhere below.

> A block quote starts each line with a greater-than sign.

Put figures in `assets/img/` and include them with
`![Describe the figure](/assets/img/your-figure.png)`.

[^note]: Footnotes are collected at the end of the post.
