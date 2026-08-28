import { localEmbed, cosineSimilarity } from './src/lib/search/embeddings.ts';

const profile = "Data Analytics, Python, SQL, market research, business research";
const job = "Data Analyst. You match 3 of 3 listed skills: Python, SQL. Tech Corp.";

const pEmbed = localEmbed(profile);
const jEmbed = localEmbed(job);
import fs from 'fs';
fs.writeFileSync('cosine_result.txt', "Cosine Exact Match: " + cosineSimilarity(pEmbed, jEmbed));
