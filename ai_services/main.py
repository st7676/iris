from fastapi import FastAPI
from pydantic import BaseModel

from agents.ai_commander import AICommander
from agents.ai_evaluator import AIEvaluator
from agents.ai_mentor import AIMentor

app = FastAPI(title="IRIS AI Services")

commander = AICommander()
mentor = AIMentor()
evaluator = AIEvaluator()


class CommanderUpdateRequest(BaseModel):
    incident_context: dict
    last_action: str


class MentorHintRequest(BaseModel):
    user_question: str
    incident_context: dict
    action_history: list


class EvaluatorRequest(BaseModel):
    ideal_chain: list
    actual_chain: list
    final_severity: str


@app.post("/api/ai/commander-update")
async def commander_update(req: CommanderUpdateRequest):
    update = commander.generate_update(req.incident_context, req.last_action)
    return {"update": update}


@app.post("/api/ai/mentor-hint")
async def mentor_hint(req: MentorHintRequest):
    hint = mentor.provide_hint(req.user_question, req.incident_context, req.action_history)
    return {"hint": hint}


@app.post("/api/ai/evaluator-evaluate")
async def evaluator_evaluate(req: EvaluatorRequest):
    result = evaluator.evaluate(req.ideal_chain, req.actual_chain, req.final_severity)
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
