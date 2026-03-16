import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function main() {
  console.log("🟠 Seeding Global Perspectives (0457)...");

  const [course] = await db.insert(schema.courses).values({
    title: "Global Perspectives (0457)",
    imageSrc: "/hero.svg",
  }).returning();

  console.log(`✅ Created Course: ${course.title} (ID: ${course.id})`);

  const curriculum = [
    {
      unit: "Unit 1: Research & Critical Thinking",
      lessons: [
        { title: "1.1 Identifying perspectives", desc: "Recognising local, national and global perspectives on issues. Evaluating bias and assumptions in sources." },
        { title: "1.2 Research skills", desc: "Finding, selecting and evaluating sources. Primary vs secondary research, reliability and validity." },
        { title: "1.3 Analysing evidence", desc: "Interpreting data, statistics and graphs. Distinguishing fact from opinion." },
        { title: "1.4 Constructing arguments", desc: "Building well-structured arguments. Supporting claims with evidence and acknowledging counter-arguments." },
      ],
    },
    {
      unit: "Unit 2: Global Issues — People & Society",
      lessons: [
        { title: "2.1 Poverty and inequality", desc: "Causes and effects of global poverty. Measures of development (HDI, GDP). Strategies to reduce inequality." },
        { title: "2.2 Migration and urbanisation", desc: "Push and pull factors. Impacts of migration on origin and destination countries. Rapid urbanisation challenges." },
        { title: "2.3 Education for all", desc: "Barriers to education globally. The role of education in development. SDG 4 goals." },
        { title: "2.4 Democracy and participation", desc: "Forms of government. Human rights and civil liberties. Civic engagement and activism." },
      ],
    },
    {
      unit: "Unit 3: Global Issues — Environment & Resources",
      lessons: [
        { title: "3.1 Fuel and energy", desc: "Fossil fuels vs renewables. Energy security. Climate change mitigation and adaptation." },
        { title: "3.2 Water, food and agriculture", desc: "Global water scarcity. Food security challenges. Sustainable farming practices." },
        { title: "3.3 Biodiversity and conservation", desc: "Threats to biodiversity. Conservation strategies. Role of international agreements." },
        { title: "3.4 Climate change", desc: "Scientific evidence for climate change. Impacts on different regions. International responses (Paris Agreement)." },
      ],
    },
    {
      unit: "Unit 4: Global Issues — Economy & Technology",
      lessons: [
        { title: "4.1 Globalisation", desc: "Economic, cultural and political globalisation. TNCs and trade. Benefits and drawbacks of globalisation." },
        { title: "4.2 Employment, work and business", desc: "Changing nature of work. Child labour. Fair trade and ethical business." },
        { title: "4.3 Technology and the future", desc: "Impact of digital technology. Artificial intelligence. Digital divide between nations." },
        { title: "4.4 Law and criminality", desc: "International law. Organised crime and cybercrime. Human trafficking." },
      ],
    },
    {
      unit: "Unit 5: Team Project & Individual Report",
      lessons: [
        { title: "5.1 Choosing a topic", desc: "Selecting a locally relevant issue with global dimensions. Defining research questions." },
        { title: "5.2 Team project skills", desc: "Collaborative planning, role allocation and communication. Producing a team outcome." },
        { title: "5.3 Writing the individual report", desc: "Structure of the report (research, reasoning, reflection). Referencing and bibliography." },
        { title: "5.4 Reflection and evaluation", desc: "Evaluating the research process. Reflecting on learning and personal perspectives." },
      ],
    },
  ];

  for (let i = 0; i < curriculum.length; i++) {
    const item = curriculum[i];
    const [unit] = await db.insert(schema.units).values({
      title: item.unit,
      description: `Cambridge IGCSE Global Perspectives — ${item.unit}`,
      courseId: course.id,
      order: i + 1,
    }).returning();

    for (let j = 0; j < item.lessons.length; j++) {
      const l = item.lessons[j];
      await db.insert(schema.lessons).values({
        unitId: unit.id,
        title: l.title,
        description: l.desc,
        order: j + 1,
      });
    }
    console.log(`✅ Seeded ${item.unit}`);
  }

  console.log("🟢 Global Perspectives (0457) seeded successfully!");
}

main().catch(console.error);
