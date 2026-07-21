from fastapi import FastAPI

from agents.ai_commander import AICommander
from agents.ai_evaluator import AIEvaluator
from agents.ai_mentor import AIMentor

app = FastAPI(title="IRIS AI Services")

commander = AICommander()
mentor = AIMentor()
evaluator = AIEvaluator()


@app.post("/api/ai/commander-update")
async def commander_update(incident_context: dict, last_action: str):
    update = commander.generate_update(incident_context, last_action)
    return {"update": update}


@app.post("/api/ai/mentor-hint")
async def mentor_hint(user_question: str, incident_context: dict, action_history: list):
    hint = mentor.provide_hint(user_question, incident_context, action_history)
    return {"hint": hint}


@app.post("/api/ai/evaluator-evaluate")
async def evaluator_evaluate(ideal_chain: list, actual_chain: list, final_severity: str):
    result = evaluator.evaluate(ideal_chain, actual_chain, final_severity)
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
