import { seedResearchDirectory } from "../server/db";

const result = await seedResearchDirectory();
console.log(JSON.stringify(result));
process.exit(0);
