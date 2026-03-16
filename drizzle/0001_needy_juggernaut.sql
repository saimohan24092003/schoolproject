ALTER TYPE "type" ADD VALUE 'THEORY';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attempt_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge_id" integer NOT NULL,
	"status" text NOT NULL,
	"repetition_count" integer DEFAULT 1 NOT NULL,
	"time_taken" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"questions_answered" integer DEFAULT 0 NOT NULL,
	"questions_correct" integer DEFAULT 0 NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"sessions_completed" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_ai_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"awarded_marks" integer DEFAULT 0 NOT NULL,
	"max_marks" integer DEFAULT 1 NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"correct_answer" text DEFAULT '' NOT NULL,
	"concept_explanation" text DEFAULT '' NOT NULL,
	"mistake_explanation" text DEFAULT '' NOT NULL,
	"improvement_steps_json" text DEFAULT '[]' NOT NULL,
	"example" text DEFAULT '' NOT NULL,
	"exam_tip" text DEFAULT '' NOT NULL,
	"translated_explanation" text DEFAULT '' NOT NULL,
	"model_raw_json" text,
	"source" text DEFAULT 'fallback' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_attempt" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"session_question_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"paper_type" text NOT NULL,
	"level_no" integer NOT NULL,
	"answer_type" text NOT NULL,
	"typed_answer" text,
	"ocr_text" text,
	"awarded_marks" integer DEFAULT 0 NOT NULL,
	"max_marks" integer DEFAULT 1 NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"time_taken_seconds" integer DEFAULT 0 NOT NULL,
	"hint_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_gamification_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"badges_json" text DEFAULT '[]' NOT NULL,
	"leaderboard_points" integer DEFAULT 0 NOT NULL,
	"last_activity_date" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_level_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"paper_type" text NOT NULL,
	"level_no" integer NOT NULL,
	"unlocked" boolean DEFAULT false NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"best_accuracy" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_practice_session" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"paper_type" text NOT NULL,
	"level_no" integer NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"question_mix_json" text DEFAULT '{}' NOT NULL,
	"target_difficulty" integer DEFAULT 1 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"answered_questions" integer DEFAULT 0 NOT NULL,
	"correct_questions" integer DEFAULT 0 NOT NULL,
	"total_awarded_marks" integer DEFAULT 0 NOT NULL,
	"total_max_marks" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"accuracy" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_session_question" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"source_question_id" integer,
	"subject_code" text NOT NULL,
	"paper_type" text NOT NULL,
	"level_no" integer NOT NULL,
	"topic_name" text,
	"question_type" text NOT NULL,
	"question_text" text NOT NULL,
	"marks" integer DEFAULT 1 NOT NULL,
	"marking_scheme" text,
	"options_json" text,
	"correct_answer" text,
	"source_paper_ref" text,
	"image_refs_json" text,
	"answered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_student_onboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"paper_type" text NOT NULL,
	"studied_topics_json" text DEFAULT '[]' NOT NULL,
	"unstudied_topics_json" text DEFAULT '[]' NOT NULL,
	"difficult_topics_json" text DEFAULT '[]' NOT NULL,
	"exam_date" text,
	"target_grade" text DEFAULT 'A*' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_student_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"native_language" text DEFAULT 'en' NOT NULL,
	"monthly_plan_inr" integer DEFAULT 500 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "igcse_topic_metric" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"paper_type" text NOT NULL,
	"topic_name" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct_attempts" integer DEFAULT 0 NOT NULL,
	"accuracy" integer DEFAULT 0 NOT NULL,
	"avg_time_seconds" integer DEFAULT 0 NOT NULL,
	"weakness_score" integer DEFAULT 0 NOT NULL,
	"last_practiced_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practice_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"topic_name" text NOT NULL,
	"level" integer NOT NULL,
	"paper_type" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"questions_attempted" integer DEFAULT 0 NOT NULL,
	"questions_correct" integer DEFAULT 0 NOT NULL,
	"total_hints_used" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topic_level_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"topic_name" text NOT NULL,
	"level" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"wrong_answers" integer DEFAULT 0 NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_roadmap_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"paper_type" text DEFAULT 'both' NOT NULL,
	"roadmap_level" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_topic_setup" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"covered_topics" text DEFAULT '[]' NOT NULL,
	"onboarding_done" boolean DEFAULT false NOT NULL,
	"practice_mode" text DEFAULT 'all' NOT NULL,
	"paper_preference" text DEFAULT 'both',
	"self_assessment" text DEFAULT 'starter',
	"target_grade" text DEFAULT 'A*',
	"start_roadmap_level" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_progress" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "challenge_progress" ADD COLUMN "last_attempt_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "topic" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "explanation" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "image_src" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "paper_ref" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "marking_scheme_answer" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "total_marks" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "audio_src" text;--> statement-breakpoint
ALTER TABLE "exam_papers" ADD COLUMN "level" text DEFAULT 'A-Level' NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_papers" ADD COLUMN "subject" text DEFAULT 'Business Studies' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "active_course_id" integer;--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "hearts" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attempt_logs" ADD CONSTRAINT "attempt_logs_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "igcse_ai_feedback" ADD CONSTRAINT "igcse_ai_feedback_attempt_id_igcse_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."igcse_attempt"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "igcse_attempt" ADD CONSTRAINT "igcse_attempt_session_id_igcse_practice_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."igcse_practice_session"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "igcse_attempt" ADD CONSTRAINT "igcse_attempt_session_question_id_igcse_session_question_id_fk" FOREIGN KEY ("session_question_id") REFERENCES "public"."igcse_session_question"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "igcse_session_question" ADD CONSTRAINT "igcse_session_question_session_id_igcse_practice_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."igcse_practice_session"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_active_course_id_courses_id_fk" FOREIGN KEY ("active_course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
