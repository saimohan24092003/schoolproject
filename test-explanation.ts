import { getQuestionExplanation } from "./src/lib/gemini";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function test() {
  console.log("🧪 Testing AI Explanation...");
  const question = "What is an alloy?";
  const options = ["a compound", "a mixture", "an element", "a gas"];
  const correctAnswer = "a mixture";
  const userAnswer = "a compound";
  const topic = "Metals";

  try {
    const response = await getQuestionExplanation(question, options, correctAnswer, userAnswer, topic);
    console.log("\n--- AI RESPONSE ---");
    console.log(response);
    console.log("-------------------\n");
  } catch (error) {
    console.error("CRITICAL ERROR:", error);
  }
}

test();
