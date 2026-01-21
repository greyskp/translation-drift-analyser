import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { pool } from "./db.js";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const model_name = "gpt-4o-mini";

// Create the prompt that will be used by the LLM
const prompt = PromptTemplate.fromTemplate(`Using the text {source}, analyse the drift in the translated version {translation}. 
  No extra text, fill in this json template with the drift found, return at most 5 items, the most important ones, ordered by severity:
  {{
    "source_language": "",
    "translation_language": "",
    "drift_items": []
}}
where drift_items is an array of objects with the structure:
{{
  category: "Meaning" | "Tone" | "Terminology" | "Grammar" | "Style";
  severity: "High" | "Medium" | "Low";
  description: string;
  source_snippet: string;
  translation_snippet: string;
}}
  
`);

// Initialize the LLM with desired parameters
const llm = new ChatOpenAI({
    modelName: model_name,
    maxTokens: 800,
    temperature: 0,
});

// This chain is used to process the input through the prompt and LLM 
const chain = RunnableSequence.from([prompt, llm]);

// Serve React frontend
const clientBuildPath = join(__dirname, "../../dist/client");
app.use(express.static(clientBuildPath));

// Endpoint to analyse drift between source and translation
app.post("/analyse-drift", async (req, res) => {
  try {
    const {source, translation} = req.body as {source?: string, translation?: string};
    if (!source || !translation) {
      return res.status(400).json({ error: "Both source and translation are required." });
    }
    const output = await chain.invoke({ source, translation });
    const resultText = typeof output === "string" ? output : (output as any).content || "";
    let analysis;
    try {
      analysis = JSON.parse(resultText);
    } catch (err) {
      console.error("Failed to parse JSON:", err);
      return res.status(500).json({ error: "Failed to parse JSON", details: err });
    }
    
    const insertQuery = `
      INSERT INTO drift_analyses (source_text, translation_text, source_lang, translation_lang, analysis_json, model_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at;
    `;

    const insertValues = [
      source,
      translation,
      analysis.source_language,
      analysis.translation_language,
      analysis,
      model_name,
    ];

    const dbResult = await pool.query(insertQuery, insertValues);
    const savedRow = dbResult.rows[0];


    res.json({ 
      input: { source, translation }, 
      output: analysis,
      meta: { 
        id: savedRow.id, 
        created_at: savedRow.created_at,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong", details: err });
  }
});

// Endpoint to get the latest analyses
app.get("/analyses/latest", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, created_at, source_lang, translation_lang, source_text, translation_text, analysis_json
       FROM drift_analyses
       ORDER BY created_at DESC
       LIMIT 5`
    );

    res.json({ analyses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load recent analyses" });
  }
});

// Fallback to serve index.html for any other routes (for SPA)
app.use((_req, res) => {
  res.sendFile(join(clientBuildPath, "index.html"));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});