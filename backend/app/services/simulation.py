import numpy as np
from ..config import settings


def run_monte_carlo(
    current_scores: dict[str, float],
    rounds_remaining: int,
    n: int = None,
    mean: float = None,
    std: float = None,
) -> dict[str, dict]:
    """
    Returns win/last probability and expected final score for each player.
    current_scores: {username: total_points}
    """
    if n is None:
        n = settings.monte_carlo_simulations
    if mean is None:
        mean = settings.monte_carlo_mean
    if std is None:
        std = settings.monte_carlo_std

    players = list(current_scores.keys())
    scores = np.array([current_scores[p] for p in players], dtype=float)

    simulated = scores[:, None] + np.random.normal(
        mean, std, size=(len(players), n)
    ).cumsum(axis=0) if rounds_remaining > 0 else scores[:, None] * np.ones((len(players), n))

    if rounds_remaining > 0:
        future = np.random.normal(mean, std, size=(len(players), rounds_remaining, n))
        final_scores = scores[:, None] + future.sum(axis=1)
    else:
        final_scores = scores[:, None] * np.ones((len(players), n))

    winners = np.argmax(final_scores, axis=0)
    losers = np.argmin(final_scores, axis=0)

    results = {}
    for i, player in enumerate(players):
        results[player] = {
            "win_probability": float(np.mean(winners == i)),
            "last_probability": float(np.mean(losers == i)),
            "expected_final": float(np.mean(final_scores[i])),
        }
    return results
