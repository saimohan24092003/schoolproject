import json
import math

class StudentTracker:
    def __init__(self, data_file="student_data.json"):
        self.data_file = data_file
        self.load_data()

    def load_data(self):
        try:
            with open(self.data_file, "r") as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = {}

    def save_data(self):
        with open(self.data_file, "w") as f:
            json.dump(self.data, f, indent=2)

    def track_attempt(self, user_id, question_id, is_correct, topic):
        if user_id not in self.data:
            self.data[user_id] = {
                "total_attempts": 0,
                "correct_attempts": 0,
                "topics": {},
                "history": []
            }
        
        user = self.data[user_id]
        user["total_attempts"] += 1
        if is_correct:
            user["correct_attempts"] += 1
        
        if topic not in user["topics"]:
            user["topics"][topic] = {"correct": 0, "total": 0, "repetitions": 0}
        
        user["topics"][topic]["total"] += 1
        if is_correct:
            user["topics"][topic]["correct"] += 1
        else:
            user["topics"][topic]["repetitions"] += 1
            
        user["history"].append({
            "question_id": question_id,
            "is_correct": is_correct,
            "topic": topic
        })
        self.save_data()

    def get_feedback(self, question_id, topic, question_text):
        # This would normally call an AI, but here we provide a structure
        return {
            "hint": f"Think about the core principles of {topic} related to this question.",
            "concept_explanation": f"{topic} involves understanding how different elements interact..."
        }

    def calculate_metrics(self, user_id):
        if user_id not in self.data:
            return "Insufficient data for accurate prediction."
        
        user = self.data[user_id]
        if user["total_attempts"] < 5:
            return "Insufficient data for accurate prediction."
            
        accuracy = (user["correct_attempts"] / user["total_attempts"]) * 100
        
        # Consistency: Standard deviation of accuracy over last 10 attempts
        recent_history = user["history"][-10:]
        if len(recent_history) < 5:
            consistency = 0
        else:
            # Simple consistency metric: % of matching results in last 5
            last_5 = [h["is_correct"] for h in recent_history[-5:]]
            consistency = (last_5.count(True) / 5) * 100 if last_5 else 0

        # Concept Mastery
        mastery_scores = {}
        for topic, stats in user["topics"].items():
            mastery_scores[topic] = (stats["correct"] / stats["total"]) * 100
            
        avg_mastery = sum(mastery_scores.values()) / len(mastery_scores) if mastery_scores else 0
        
        return {
            "accuracy": round(accuracy, 2),
            "consistency": round(consistency, 2),
            "concept_mastery_avg": round(avg_mastery, 2),
            "grade_prediction": self.predict_grade(accuracy, avg_mastery, user["total_attempts"])
        }

    def predict_grade(self, accuracy, mastery, total_attempts):
        if total_attempts < 10:
            return "Insufficient data for accurate prediction."
            
        # Data-driven formula (example)
        score = (accuracy * 0.6) + (mastery * 0.4)
        
        if score >= 90: return "A*"
        if score >= 80: return "A"
        if score >= 70: return "B"
        if score >= 60: return "C"
        if score >= 50: return "D"
        if score >= 40: return "E"
        return "U"

if __name__ == "__main__":
    tracker = StudentTracker()
    # Sample usage
    tracker.track_attempt("user_123", 1, True, "B4. Enzymes")
    tracker.track_attempt("user_123", 2, False, "B4. Enzymes")
    tracker.track_attempt("user_123", 3, True, "C3. Atoms")
    
    metrics = tracker.calculate_metrics("user_123")
    print(json.dumps(metrics, indent=2))
