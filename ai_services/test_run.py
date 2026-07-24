import os
import sys

# משיגים את הנתיב המלא של התיקייה הנוכחית שבה הקובץ הזה נמצא
current_dir = os.path.dirname(os.path.abspath(__file__))
# דוחפים אותה בכוח לראש רשימת הנתיבים של פייתון
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# עכשיו פייתון חייב לראות את agents!
from agents.base_agent import BaseAgent

class TestAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return "You are a helpful assistant. Respond with emojis only."

def run_test():
    print("Initializing Test Agent...")
    agent = TestAgent()
    
    user_msg = "Hello! Are you working correctly?"
    print(f"Sending message to OpenAI: '{user_msg}'")
    
    try:
        response = agent.call(user_msg)
        print("\n--- Success! ---")
        print(f"AI Response: {response}")
    except Exception as e:
        print("\n--- Error! ---")
        print(f"Something went wrong: {e}")

if __name__ == "__main__":
    run_test()