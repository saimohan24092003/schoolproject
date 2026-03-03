import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@/components/ui";
import { 
  getUserProgress, 
  getUnits,
  getCourses
} from "@/server/db/queries";
import { SUBJECTS } from "@/constants";
import { SubjectCards } from "./SubjectCards";
import { OFFICIAL_0653_TOPICS_2025_2027, SYLLABUS_SUBTOPICS_0653 } from "@/lib/syllabus/combined-science-2025";

import * as fs from "fs";
import * as path from "path";

import { CurriculumTabs } from "./CurriculumTabs";

interface DashboardProps {
  searchParams: {
    subject?: string;
  };
}

const DashboardPage = async ({ searchParams }: DashboardProps) => {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Load Topic Analysis for Priority Badges
  let topicAnalysis: Record<string, { priority: string, frequency: number }> = {};
  try {
    const analysisPath = path.join(process.cwd(), "topic_analysis.json");
    if (fs.existsSync(analysisPath)) {
        topicAnalysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load topic analysis", e);
  }

  const allCourses = await getCourses();
  
  // Map course codes to database IDs for the SubjectCards component
  const courseMapping: Record<string, number> = {};
  allCourses.forEach(c => {
    const codeMatch = c.title.match(/\d+/);
    if (codeMatch) courseMapping[codeMatch[0]] = c.id;
  });

  const userProgress = await getUserProgress();
  
  // Determine selected subject code from userProgress or searchParams
  let selectedSubjectCode = "0653";
  if (userProgress?.activeCourseId) {
    const currentCourse = allCourses.find(c => c.id === userProgress.activeCourseId);
    const codeMatch = currentCourse?.title.match(/\d+/);
    if (codeMatch) selectedSubjectCode = codeMatch[0];
  }
  
  // Override with searchParams if present
  if (searchParams.subject) selectedSubjectCode = searchParams.subject;

  // Find the database course matching the selected subject code
  const activeCourse = allCourses.find(c => c.title.includes(selectedSubjectCode));
  const rawUnits = activeCourse ? await getUnits() : [];

  // Deduplicate: if two units share the same order, keep the descriptive one ("Unit X: Name" over "Unit X")
  let units = rawUnits.reduce((acc: any[], unit: any) => {
    const existing = acc.find((u: any) => u.order === unit.order);
    if (!existing) {
      acc.push(unit);
    } else if (unit.title.includes(":") && !existing.title.includes(":")) {
      acc[acc.indexOf(existing)] = unit;
    }
    return acc;
  }, []);

  // Fallback: if DB has no units, build synthetic curriculum from the official syllabus
  if (units.length === 0) {
    if (selectedSubjectCode === "0680") {
      // Environmental Management fallback
      const EM_UNITS = [
        { title: "Unit 1: Earth Resources",         topics: ["1.1 Rocks and minerals", "1.2 Energy resources"]         },
        { title: "Unit 2: Agriculture & Water",     topics: ["2.1 Agriculture", "2.2 Water management"]                },
        { title: "Unit 3: Oceans & Hazards",        topics: ["3.1 Oceans and fisheries", "3.2 Natural hazards"]        },
        { title: "Unit 4: Atmosphere & Population", topics: ["4.1 The atmosphere", "4.2 Human population"]             },
      ];
      units = EM_UNITS.map((u, i) => ({
        id: -(i + 1),
        title: u.title,
        order: i + 1,
        lessons: u.topics.map((title, j) => ({
          id: -(i * 10 + j + 1),
          title,
          description: "",
          order: j + 1,
          completed: false,
        })),
      }));
    } else {
      // Combined Science (0653) fallback
      const makeLessons = (topics: readonly string[], startId: number) =>
        topics.map((title, i) => ({
          id: startId + i,
          title,
          description: "",
          order: i + 1,
          completed: false,
          subTopics: SYLLABUS_SUBTOPICS_0653[title] ?? [],
        }));

      units = [
        { id: -1, title: "Biology",   order: 1, lessons: makeLessons(OFFICIAL_0653_TOPICS_2025_2027.biology,   -1000) },
        { id: -2, title: "Chemistry", order: 2, lessons: makeLessons(OFFICIAL_0653_TOPICS_2025_2027.chemistry, -2000) },
        { id: -3, title: "Physics",   order: 3, lessons: makeLessons(OFFICIAL_0653_TOPICS_2025_2027.physics,   -3000) },
      ];
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-6xl mx-auto">
      {/* 1. Header with User Context */}
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900">
            Welcome, {user.firstName || "Student"}! 🧬
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Track your progress and master O-Level MCQs.
          </p>
        </div>
      </div>

      {/* 2. Subject Selector */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                Select Subject
            </h2>
        </div>
        
        <SubjectCards 
          subjects={SUBJECTS["O-Level"]} 
          selectedSubjectCode={selectedSubjectCode}
          courseMapping={courseMapping}
        />
      </div>

      {/* 3. Subject Header (Current Focus - REAL DATA) */}
      <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-sm font-black text-blue-200 uppercase tracking-[0.3em] mb-1">Current Focus</h2>
                    <h1 className="text-3xl font-black">{activeCourse?.title || "Combined Science (0653)"}</h1>
                    <p className="text-blue-100 font-medium">O-Level Exam Preparation</p>
                </div>
            </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 4. Curriculum Hierarchy (Biology/Chem/Physics Tabs) */}
        <div className="lg:col-span-12 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Curriculum Roadmap</h3>
                        <p className="text-gray-500 font-medium">Select a subject area to view important A* topics.</p>
                    </div>
                </div>

                <CurriculumTabs
                    key={selectedSubjectCode}
                    units={units}
                    topicAnalysis={topicAnalysis}
                    subjectCode={selectedSubjectCode}
                />
            </div>

            {/* 5. Smart Practice Access */}
            <div className="bg-gray-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group mt-4">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-blue-600/30"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-black mb-1 tracking-tight text-blue-400">Smart Practice</h3>
                        <p className="text-gray-400 font-medium">Practice specific chapters and learn from every mistake with instant hints.</p>
                    </div>
                    <Button variant="secondary" size="lg" className="font-black rounded-2xl px-10 h-14 bg-blue-600 hover:bg-blue-700 border-none text-white shadow-lg shadow-blue-900/20" asChild>
                        <Link href={`/learn/smart-practice?subject=${selectedSubjectCode}`}>Enter Smart Practice →</Link>
                    </Button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
