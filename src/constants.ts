// Exam Levels
export const LEVELS = [
  { value: "O-Level", label: "O-Level" },
  { value: "A-Level", label: "A-Level" },
];

// Available Subjects
export const SUBJECTS = {
  "O-Level": [
    { code: "0653", name: "Combined Science", label: "Combined Science (0653)" },
    { code: "0680", name: "Environmental Management", label: "Environmental Management (0680)" },
    { code: "0457", name: "Global Perspectives", label: "Global Perspectives (0457)" },
    { code: "0510", name: "English", label: "English (0510)" },
    { code: "0549", name: "Hindi", label: "Hindi (0549) ⭐" },
    { code: "0607", name: "Core Maths", label: "Core Maths (0607)" },
  ],
  "A-Level": [
    { code: "9609", name: "Business Studies", label: "Business Studies (9609)" },
  ],
};

// A-LEVEL BUSINESS (9609) EXAM PLATFORM CONSTANTS
export const EXAM_TIME_LIMIT = 105; // 105 minutes for Paper 1, 2, 3
export const DEFAULT_TARGET_GRADE = "A*";

// Grade boundaries for A-Level Business
export const GRADE_BOUNDARIES = {
  "A*": 90,
  "A": 80,
  "B": 70,
  "C": 60,
  "D": 50,
  "E": 40,
  "U": 0,
};

// Exam paper types
export const PAPER_TYPES = [
  { number: 1, name: "Paper 1: Short Answer & Essays", marks: 40, time: 60 },
  { number: 2, name: "Paper 2: Case Study", marks: 100, time: 105 },
  { number: 3, name: "Paper 3: Multiple Choice", marks: 70, time: 60 },
];

// Exam seasons
export const SEASONS = [
  { value: "march", label: "March" },
  { value: "june", label: "June" },
  { value: "november", label: "November" },
];

// Available years for past papers
export const AVAILABLE_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019];

// Sidebar navigation for exam platform
export const sidebarItems = [
  {
    href: "/dashboard",
    label: "DASHBOARD",
    iconSrc: "/mascot.svg",
  },
  {
    href: "/learn/smart-practice",
    label: "SMART PRACTICE",
    iconSrc: "/hero.svg",
  },
  {
    href: "/progress",
    label: "MOCK HUB",
    iconSrc: "/leaderboard.svg",
  },
];

// Daily goals for exam practice
export const dailyGoals = [
  { title: "Complete 1 Practice Paper", value: 1, type: "paper" },
  { title: "Review 5 Questions", value: 5, type: "review" },
  { title: "Practice 30 Minutes", value: 30, type: "time" },
];

// Legacy constants needed by UI components
export const DEFAULT_HEARTS_MAX = 5;
export const POINTS_TO_REFILL = 50;
export const POINTS_PER_CHALLENGE = 10;
export const DEFAULT_POINTS_START = 0;
export const quests = [
  {
    title: "Earn 100 XP",
    value: 100,
  },
  {
    title: "Earn 500 XP",
    value: 500,
  },
  {
    title: "Earn 1000 XP",
    value: 1000,
  },
  {
    title: "Earn 5000 XP",
    value: 5000,
  },
];
