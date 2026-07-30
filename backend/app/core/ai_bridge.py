"""
Bridge to the ai_services agents (owned by the AI/Integration lead).

Per IRIS_Team_Workflow's deliverable list, ai_services hands off
"AI Agent Functions (importable Python modules)" to Backend/Frontend --
the intent is that Backend calls the same agent classes in-process
(no extra HTTP hop), not a separate microservice.

ai_services is a sibling project folder, not an installed package, so we
add it to sys.path here -- once, in one clearly-named place -- rather
than scattering path hacks across route files. If this project grows
past MVP size, replace this with a proper `pip install -e ../ai_services`
package instead.

Path resolution: prefer the AI_SERVICES_PATH env var (set explicitly in
Docker, where ai_services/ is copied to a fixed image path). Falls back to
walking up from this file looking for a sibling ai_services/agents/ dir,
which is what a local checkout (or pytest run from backend/) looks like.
"""

import os
import sys
from pathlib import Path


def _find_ai_services_root() -> Path:
    env_path = os.getenv("AI_SERVICES_PATH")
    if env_path:
        return Path(env_path)

    here = Path(__file__).resolve()
    for ancestor in here.parents:
        candidate = ancestor / "ai_services"
        if (candidate / "agents").is_dir():
            return candidate

    raise RuntimeError(
        "Could not locate ai_services/ (expected as a sibling of backend/, "
        "or set the AI_SERVICES_PATH env var explicitly)."
    )


_AI_SERVICES_ROOT = _find_ai_services_root()
if str(_AI_SERVICES_ROOT) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICES_ROOT))

from agents.ai_commander import AICommander  # noqa: E402
from agents.ai_evaluator import AIEvaluator  # noqa: E402
from agents.ai_mentor import AIMentor  # noqa: E402

commander = AICommander()
mentor = AIMentor()
evaluator = AIEvaluator()
