import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class ScoringService:
    @staticmethod
    def calculate_weighted_score(
        scores: List[int],
        weights: List[float] = None
    ) -> int:
        """
        Computes a weighted average score across consecutive questions.
        """
        if not scores:
            return 0
        if not weights or len(weights) != len(scores):
            return int(sum(scores) / len(scores))
        
        weighted_sum = sum(s * w for s, w in zip(scores, weights))
        total_weight = sum(weights)
        
        if total_weight == 0:
            return int(sum(scores) / len(scores))
            
        return int(weighted_sum / total_weight)
