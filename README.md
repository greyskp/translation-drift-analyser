# Translation Drift Analyzer

The translation Drift Analyser is a small internal-tool-style app for analysing the mismatch of translations between a source text and its translation.

The app uses an LLM to:
- Detect source and translation languages
- Identify translation issues
- Classify them by category and severity

In addition to the LLM use, it also:
- Highlights the affected parts of the translation
- Stores each analysis in Postgres and displays the most recent runs

---

## Deployment

The application was Dockerized, built with Cloud Build, deployed to Cloud Run, connected to Cloud SQL via Unix socket

---

## How to run locally

- Install the dependencies at the root of the project:
  - $ npm install 
- Create a PostgreSQL database with the **drift_analyses** table defined in the schema section of this README
- Create a .env file in the project root containing:
  - OPENAI_API_KEY=... 
  - DATABASE_URL=postgres://<USER>:<PASSWORD>@localhost:5432/<DB_NAME> 
- Build the project:
  - $ npm run build
- Start the server:
  - $ npm start 
- Open **http://localhost:3000** in your browser

---

## Tech Stack

- **Frontend**: 
  - React
  - TypeScript
  - Vite
- **Backend**: 
  - Node.js
  - Express
  - TypeScript
- **LLM**: 
  - LangChain
  - OpenAI model: gpt-4o-mini
- **Database**: 
  - PostgreSQL (local Docker / Cloud SQL in production)

---

## Features

- **LLM-powered drift analysis**
  - One structured JSON response per analysis
  - Issues categorized by `Meaning`, `Tone`, `Terminology`, `Grammar`, `Style`
  - Severity levels: `High`, `Medium`, `Low`

- **UI for side-by-side comparison**
  - Two text areas: **source** and **translation**
  - Drift snippets highlighted in the translation
  - List of issues rendered as bullet points for readability
  - Latest analyses done, queried from the database

- **Persistence with Postgres**
  - Each analysis is stored with:
    - source / translation text
    - source / translation languages
    - full JSON analysis
    - model name used
    - timestamp

---

## Architecture & Data Flow

Flow:

1. User pastes a source text and its translation in the corresponding text areas
2. User clicks "Analyse translation", frontend sends `POST /analyse-drift` with `{ source, translation }`.
3. Backend:
   - Builds a `PromptTemplate` describing the JSON schema to return.
   - Uses `RunnableSequence` with `ChatOpenAI` to:
     - Detect languages
     - Analyse the translation drift and puts it in categories and judges the severity
     - Return a single JSON object:
       ```json
       {
         "source_language": "English",
         "translation_language": "French",
         "drift_items": [
           {
             "category": "Tone",
             "severity": "Medium",
             "description": "...",
             "source_snippet": "...",
             "translation_snippet": "..."
           }
         ]
       }
       ```
   - Parses the JSON and inserts it into `drift_analyses` table
   - Returns the JSON + metadata to the frontend

4. Frontend:
   - Highlights `translation_snippet` segments in the translation text by severity
   - Renders a bullet list of issues
   - Displays the most recent analysis by calling `GET /analyses/latest` which queries the last 5 analysis from the database

---

## Database Schema

Table used:

```sql
CREATE TABLE IF NOT EXISTS drift_analyses (
  id SERIAL PRIMARY KEY,
  source_text TEXT NOT NULL,
  translation_text TEXT NOT NULL,
  source_lang TEXT,
  translation_lang TEXT,
  analysis_json JSONB NOT NULL,
  model_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Key Design Decisions and Trade-offs

1. **Single, well structured LLM prompt**

As per the nature of the assignment (small but well executed application) and the time constraint, I have decided to use a single, well structured LLM prompt instead of chaining multiple ones together. This makes the execution simpler and faster but the results would have been more fine-tunes with different prompt for each category of translation drift.

2. **JSON for communication between backend and frontend**

For structure, by design, the LLM returns the data in a JSON format, this ensures consistence in the saved data and makes it easier to store and display on the frontend. But it requires careful prompting and the model could occasionaly get out of the exact scope.

3. **Temperature and model choice**

For this application, the decision was made to go with a temperature of 0. In this first version, the goal was to have the LLM detecting the most common issues in the translations while being consistent so there was no need for it to be too creative. 
As for the model, I made the decision to go with gpt-4o-mini for cost efficiency reasons and because it is a demo application for the assignment and not a proper production grade app. 
With multiple prompts chained together, the temperature and the model could have been adjusted for each of them depending on the computing requirements and creativity required by the task.

4. **Developed UI vs limited endpoints**

I decided to spend some time developing the UI to ensure that, even for a simple task, the user stills gets a proper and intuitive experience while using it. This time could have been dedicated to improve the features and the number of endpoints available to increase the functionalities offered by the application.

5. **Clear architecture vs standard MVC**

The architecture desicion was to follow the MVC design pattern while staying minimal and clear. While it follows the main idea of the design by separating the frontend and the backend and the database connection, the architecture can be improved to follow the model more strictly by properly separating the routes, services and models. As this is a simple application and the files are not excessively long, I have made the decision to keep the architecture clear and simple.

6. **Testing by using vs proper test implementation**

The testing of the application has been done by testing the app in the dev environment rather than implementing proper tests. This decision was mostly made due to the time constraint and the simplicity of the application where it was easy to immediatly see the results and fine tune the prompt and the different aspects of the application.
