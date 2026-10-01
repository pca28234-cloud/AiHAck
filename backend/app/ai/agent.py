"""
HarvestLink AI — AI Coordination Agent

Uses Google Gemini LLM for:
1. Natural language harvest input parsing
2. Allocation explanation and enhancement
3. What-if scenario analysis

SAFETY: All AI output is validated by Pydantic schemas and
business rules before being used. The LLM never directly
controls allocation — the deterministic engine does that.
"""
import os
import json
import traceback
from typing import Optional, Dict, Any

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

from app.ai.prompts import HARVEST_PARSE_PROMPT, COORDINATION_PROMPT, WHATIF_PROMPT


def _get_model():
    """Initialize and return the Gemini model."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your_gemini_api_key_here" or not GEMINI_AVAILABLE:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


def _safe_parse_json(text: str) -> Optional[Dict]:
    """Safely parse JSON from LLM output, handling markdown code blocks."""
    if not text:
        return None
    # Strip markdown code blocks if present
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


async def parse_harvest_nl(text: str) -> Optional[Dict[str, Any]]:
    """
    Parse natural language harvest input into structured data.

    Example input: "I have around 400 kg Grade A tomatoes ready tomorrow morning,
                    but after sorting I expect around 330 kg."
    Example output: {"estimated_quantity": 400, "expected_sorted_quantity": 330,
                     "quality_grade": "A", "availability": "tomorrow morning"}
    """
    model = _get_model()
    if model:
        try:
            prompt = HARVEST_PARSE_PROMPT.format(input_text=text)
            response = model.generate_content(prompt)
            result = _safe_parse_json(response.text)

            if result:
                eq = result.get("estimated_quantity")
                qg = result.get("quality_grade", "")
                if eq and isinstance(eq, (int, float)) and eq > 0 and qg.upper() in ("A", "B", "C"):
                    result["quality_grade"] = qg.upper()
                    esq = result.get("expected_sorted_quantity")
                    if esq is not None and (not isinstance(esq, (int, float)) or esq < 0):
                        result["expected_sorted_quantity"] = None
                    return result
        except Exception as e:
            print(f"⚠ AI model parsing failed, falling back to rule-based NLP: {e}")

    # Robust local NLP fallback
    import re
    from datetime import date, timedelta
    lower = text.lower()
    qty_m = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kgs|quintals?|tons?)', lower) or re.search(r'(\d+)', lower)
    grade_m = re.search(r'grade\s*([abc])', lower) or re.search(r'\b([abc])\s*grade\b', lower)
    date_val = (date.today() + timedelta(days=1)).isoformat() if "tomorrow" in lower else date.today().isoformat()

    if qty_m:
        qty = float(qty_m.group(1))
        grade = grade_m.group(1).upper() if grade_m else "A"
        return {
            "estimated_quantity": qty,
            "expected_sorted_quantity": round(qty * 0.9, 1),
            "quality_grade": grade,
            "availability": date_val
        }

    return None


async def generate_ai_explanation(
    supply_data: str,
    demand_data: str,
    transport_data: str,
    baseline_allocation: str,
) -> Optional[Dict[str, Any]]:
    """
    Generate AI-powered explanation and enhancement of the deterministic allocation.

    The AI does NOT create the allocation — it explains and enhances the
    deterministic engine's output.
    """
    model = _get_model()
    if not model:
        return None

    try:
        prompt = COORDINATION_PROMPT.format(
            supply_data=supply_data,
            demand_data=demand_data,
            transport_data=transport_data,
            baseline_allocation=baseline_allocation,
        )
        response = model.generate_content(prompt)
        result = _safe_parse_json(response.text)

        if not result:
            return None

        # Validate expected fields
        if "explanation" not in result:
            return None

        return result

    except Exception as e:
        print(f"⚠ AI explanation generation failed: {e}")
        traceback.print_exc()
        return None


async def analyze_whatif(
    question: str,
    supply_data: str,
    demand_data: str,
    transport_data: str,
    current_allocation: str,
) -> Optional[Dict[str, Any]]:
    """
    Analyze a what-if scenario against the current allocation.

    Example: "What happens if Farm B provides only 150 kg?"
    """
    model = _get_model()
    if not model:
        return None

    try:
        prompt = WHATIF_PROMPT.format(
            supply_data=supply_data,
            demand_data=demand_data,
            transport_data=transport_data,
            current_allocation=current_allocation,
            question=question,
        )
        response = model.generate_content(prompt)
        result = _safe_parse_json(response.text)

        if not result:
            return None

        if "analysis" not in result or "impact_summary" not in result:
            return None

        return result

    except Exception as e:
        print(f"⚠ AI what-if analysis failed: {e}")
        traceback.print_exc()
        return None
