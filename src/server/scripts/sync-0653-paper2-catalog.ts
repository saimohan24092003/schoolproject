import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { syncCombinedSciencePaper2CoverageToDb } from "@/server/paper-library/combined-science-paper2";

const main = async () => {
  const result = await syncCombinedSciencePaper2CoverageToDb();

  console.log("0653 Paper 2 catalog sync complete");
  console.log(`Required rows: ${result.totalRequiredRows}`);
  console.log(`Paired rows in DB: ${result.pairedRowsInDb}`);
  console.log(`Missing rows after sync: ${result.missingRowsAfterSync}`);
  console.log(`Inserted QP rows: ${result.insertedQuestionPapers}`);
  console.log(`Inserted MS rows: ${result.insertedMarkSchemes}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
