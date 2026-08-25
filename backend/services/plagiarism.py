import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

_embedding_model = None
_executor = ThreadPoolExecutor(max_workers=2)


def get_embedding_model():
    """Return the shared SentenceTransformer, loading it on first call only."""
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading embedding model (all-MiniLM-L6-v2) — this may take a moment...")
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model loaded successfully.")
    return _embedding_model


def _sync_similarity(text1: str, text2: str) -> float:
    """Compute cosine similarity (CPU-bound, runs in thread)."""
    from sentence_transformers import util
    model = get_embedding_model()
    emb1 = model.encode(text1, convert_to_tensor=True)
    emb2 = model.encode(text2, convert_to_tensor=True)
    score = util.cos_sim(emb1, emb2)[0][0].item()
    return max(0.0, min(100.0, score * 100))


class SimilarityService:
    """Semantic similarity & plagiarism detection.

    The heavy embedding model is NOT loaded at __init__ time.
    It loads lazily on the first actual call, so server startup stays fast.
    """

    def calculate_similarity(self, text1: str, text2: str) -> float:
        if not text1 or not text2:
            return 0.0
        return _sync_similarity(text1, text2)

    async def acalculate_similarity(self, text1: str, text2: str) -> float:
        if not text1 or not text2:
            return 0.0
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, _sync_similarity, text1, text2)

    def check_plagiarism(self, answers: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        results = []
        n = len(answers)
        for i in range(n):
            for j in range(i + 1, n):
                sim_score = self.calculate_similarity(
                    answers[i]["answer"],
                    answers[j]["answer"],
                )
                if sim_score > 80.0:
                    results.append({
                        "studentA": answers[i]["student_name"],
                        "studentB": answers[j]["student_name"],
                        "similarity": round(sim_score, 2),
                        "question": answers[i].get("question", "") or answers[j].get("question", "") or "",
                    })
        return results

    async def acheck_plagiarism(self, answers: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Async plagiarism check — runs similarity in a thread pool."""
        results = []
        n = len(answers)
        pairs = []
        for i in range(n):
            for j in range(i + 1, n):
                if answers[i]["answer"].strip() and answers[j]["answer"].strip():
                    pairs.append((i, j))

        async def _check_pair(i: int, j: int):
            score = await self.acalculate_similarity(answers[i]["answer"], answers[j]["answer"])
            if score > 80.0:
                return {
                    "studentA": answers[i]["student_name"],
                    "studentB": answers[j]["student_name"],
                    "similarity": round(score, 2),
                    "question": answers[i].get("question", "") or answers[j].get("question", "") or "",
                }
            return None

        pair_results = await asyncio.gather(*[_check_pair(i, j) for i, j in pairs])
        results = [r for r in pair_results if r is not None]
        return results
