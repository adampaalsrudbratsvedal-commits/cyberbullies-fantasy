import numpy as np
from ..config import settings

SLOTS_PER_ROUND = 12  # 11 starters + captain counts as 2, so effectively 12 slots


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

    # Deterministic seed based on current scores so same standings → same result
    seed = int(sum(scores)) % (2**31)
    rng = np.random.default_rng(seed)

    if rounds_remaining > 0:
        future = rng.normal(mean, std, size=(len(players), rounds_remaining, n))
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


def run_monte_carlo_live(
    current_scores: dict[str, float],
    remaining_slots: dict[str, float],
    future_rounds: int,
    n: int = None,
    mean: float = None,
    std: float = None,
) -> dict[str, dict]:
    """
    Mid-round simulation.
    current_scores: overall points so far (includes partial current round)
    remaining_slots: unplayed player-slots per user this round (captain=2)
    future_rounds: complete rounds still to come after current round
    """
    if n is None:
        n = settings.monte_carlo_simulations
    if mean is None:
        mean = settings.monte_carlo_mean
    if std is None:
        std = settings.monte_carlo_std

    mean_per_slot = mean / SLOTS_PER_ROUND
    std_per_slot  = std  / SLOTS_PER_ROUND

    players = list(current_scores.keys())
    scores  = np.array([current_scores[p]      for p in players], dtype=float)
    slots   = np.array([remaining_slots.get(p, 0) for p in players], dtype=float)

    # Remaining this round: Normal(mean_per_slot * slots, std_per_slot * sqrt(slots))
    rem_mean = mean_per_slot * slots
    rem_std  = std_per_slot  * np.sqrt(np.maximum(slots, 0))
    remaining_samples = np.random.normal(rem_mean[:, None], rem_std[:, None],
                                         size=(len(players), n))
    remaining_samples = np.maximum(remaining_samples, 0)

    # Future complete rounds
    if future_rounds > 0:
        future = np.random.normal(mean, std, size=(len(players), future_rounds, n))
        future_total = future.sum(axis=1)
    else:
        future_total = np.zeros((len(players), n))

    final_scores = scores[:, None] + remaining_samples + future_total

    winners = np.argmax(final_scores, axis=0)
    losers  = np.argmin(final_scores, axis=0)

    results = {}
    for i, player in enumerate(players):
        results[player] = {
            "win_probability":  float(np.mean(winners == i)),
            "last_probability": float(np.mean(losers  == i)),
            "expected_final":   float(np.mean(final_scores[i])),
        }
    return results
