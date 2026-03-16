import * as dotenv from "dotenv";
import * as schema from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

async function main() {
  console.log("🟠 Seeding Mathematics (0580)...");

  const [course] = await db.insert(schema.courses).values({
    title: "Mathematics (0580)",
    imageSrc: "/hero.svg",
  }).returning();

  console.log(`✅ Created Course: ${course.title} (ID: ${course.id})`);

  const curriculum = [
    {
      unit: "Unit 1: Number",
      lessons: [
        { title: "1.1 Types of numbers", desc: "Natural numbers, integers, rational and irrational numbers, primes, squares, cubes and roots." },
        { title: "1.2 Fractions, decimals and percentages", desc: "Converting between forms. Recurring decimals. Percentage change and reverse percentage." },
        { title: "1.3 Powers and roots", desc: "Index notation, laws of indices, standard form. Surds and simplification." },
        { title: "1.4 Ratio and proportion", desc: "Simplifying ratios. Direct and inverse proportion. Dividing quantities in a given ratio." },
        { title: "1.5 Estimation and bounds", desc: "Rounding (significant figures, decimal places). Upper and lower bounds. Error intervals." },
        { title: "1.6 Speed, distance and time", desc: "Calculations involving speed, distance and time. Average speed." },
      ],
    },
    {
      unit: "Unit 2: Algebra",
      lessons: [
        { title: "2.1 Algebraic manipulation", desc: "Simplifying expressions, expanding brackets, factorising (common factors, quadratics, difference of squares)." },
        { title: "2.2 Solving equations", desc: "Linear equations. Quadratic equations (factorising, formula, completing the square). Simultaneous equations." },
        { title: "2.3 Inequalities", desc: "Solving and representing linear and quadratic inequalities. Set notation and number lines." },
        { title: "2.4 Sequences", desc: "Term-to-term and position-to-term rules. Arithmetic, geometric and quadratic sequences. nth term." },
        { title: "2.5 Functions", desc: "Function notation. Composite and inverse functions. Domain and range." },
        { title: "2.6 Graphs of functions", desc: "Linear, quadratic, cubic, reciprocal, exponential graphs. Gradient and y-intercept. Turning points." },
      ],
    },
    {
      unit: "Unit 3: Coordinate Geometry",
      lessons: [
        { title: "3.1 Straight-line graphs", desc: "Gradient, y-intercept, equation of a line (y = mx + c). Parallel and perpendicular lines." },
        { title: "3.2 Distance and midpoint", desc: "Length of a line segment. Midpoint of a line segment." },
        { title: "3.3 Graphs in real-life contexts", desc: "Travel graphs. Conversion graphs. Interpreting gradient and area under a graph." },
      ],
    },
    {
      unit: "Unit 4: Geometry",
      lessons: [
        { title: "4.1 Angles and lines", desc: "Angle rules (on a straight line, around a point, vertically opposite, parallel lines). Polygon interior/exterior angles." },
        { title: "4.2 Triangles and quadrilaterals", desc: "Properties of triangles and quadrilaterals. Congruency and similarity. Scale factor for area and volume." },
        { title: "4.3 Circles", desc: "Circle vocabulary. Arc length, sector area. Circle theorems." },
        { title: "4.4 Constructions and loci", desc: "Using ruler and compass. Perpendicular bisectors, angle bisectors. Loci problems." },
      ],
    },
    {
      unit: "Unit 5: Mensuration",
      lessons: [
        { title: "5.1 Perimeter and area", desc: "Area of triangles, quadrilaterals, circles, composite shapes. Units of area." },
        { title: "5.2 Volume and surface area", desc: "Volume and surface area of prisms, cylinders, pyramids, cones and spheres." },
        { title: "5.3 Similar shapes", desc: "Scale factors for length, area and volume in similar figures." },
      ],
    },
    {
      unit: "Unit 6: Trigonometry",
      lessons: [
        { title: "6.1 Right-angled triangles", desc: "SOH-CAH-TOA. Finding sides and angles. Pythagoras' theorem in 2D and 3D." },
        { title: "6.2 Sine and cosine rules", desc: "Sine rule. Cosine rule. Area of a triangle = ½ab sin C." },
        { title: "6.3 Trigonometric graphs", desc: "Graphs of sin, cos and tan. Transformations and exact values (30°, 45°, 60°)." },
        { title: "6.4 3D trigonometry", desc: "Applying Pythagoras and trigonometry in three dimensions." },
      ],
    },
    {
      unit: "Unit 7: Transformations and Vectors",
      lessons: [
        { title: "7.1 Transformations", desc: "Translation, reflection, rotation and enlargement. Combined transformations. Invariant points." },
        { title: "7.2 Vectors", desc: "Vector notation and magnitude. Adding, subtracting and multiplying vectors. Column vectors." },
        { title: "7.3 Vector geometry", desc: "Using vectors to prove geometric properties. Parallel vectors and position vectors." },
      ],
    },
    {
      unit: "Unit 8: Probability and Statistics",
      lessons: [
        { title: "8.1 Probability", desc: "Theoretical and experimental probability. Mutually exclusive and independent events. Tree diagrams, Venn diagrams." },
        { title: "8.2 Statistical diagrams", desc: "Bar charts, pie charts, histograms, frequency polygons, scatter diagrams. Cumulative frequency curves." },
        { title: "8.3 Measures of central tendency", desc: "Mean, median and mode for grouped and ungrouped data. Interpreting averages." },
        { title: "8.4 Spread and correlation", desc: "Range, interquartile range, standard deviation. Interpreting scatter diagrams and lines of best fit." },
      ],
    },
  ];

  for (let i = 0; i < curriculum.length; i++) {
    const item = curriculum[i];
    const [unit] = await db.insert(schema.units).values({
      title: item.unit,
      description: `Cambridge IGCSE Mathematics — ${item.unit}`,
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

  console.log("🟢 Mathematics (0580) seeded successfully!");
}

main().catch(console.error);
