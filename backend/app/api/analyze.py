"""FastAPI route for message analysis adhering to strict in-memory privacy rules."""

from fastapi import APIRouter, HTTPException, status

from app.detectors.rule_detector import RuleDetector
from app.schemas.analysis import AnalyzeRequest, RuleResult

router = APIRouter(prefix="/api", tags=["analysis"])
detector = RuleDetector()


@router.post(
    "/analyze",
    response_model=RuleResult,
    summary="Analyze a message for scam indicators",
    description="Analyzes input text using rule patterns and heuristics. Processed in-memory; never stored or logged.",
)
async def analyze_message(request: AnalyzeRequest) -> RuleResult:
    """Analyze a suspicious message in memory without storing or logging message content."""
    text = request.text
    if not text or not text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Message text cannot be empty or whitespace only.",
        )

    # In-memory evaluation only — never log raw message text
    return detector.analyze(text)
