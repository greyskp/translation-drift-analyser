import React, { useState, useEffect } from "react";

// Define the structure of a drift item
interface DriftItem {
  category: "Meaning" | "Tone" | "Terminology" | "Grammar" | "Style";
  severity: "High" | "Medium" | "Low";
  description: string;
  source_snippet: string;
  translation_snippet: string;
}

function App() {
  // State variables for source text, translation, drift results, analysis details, and recent saves
  const [source, setSource] = useState("");
  const [translation, setTranslation] = useState("");
  const [drift, setDrift] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [saves, setSaves] = useState<any[]>([]);

  // Function to load recent analyses from the server
  const loadSaves = async () => {
    try {
      const res = await fetch("/analyses/latest");
      const data = await res.json();
      setSaves(data.analyses || []);
    } catch (err) {
      console.error("Failed to load recent analyses", err);
    }
  };

  // Function to handle the analysis after button click
  const handleClick = async () => {
    try {
      const res = await fetch(`/analyse-drift`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: source, translation: translation }),
      });

      const data = await res.json();
      
      setAnalysis(data.output);

      setDrift(data.output.drift_items
        .map(
          (item: any) =>
        `${item.severity}: ${item.description}`
        )
        .join("\n")
      );

      await loadSaves();
    } catch (err) {
      console.error(err);
      setDrift("Error calling AI, the details are: " + err);
    }
  };

  // Function to determine background color based on severity
  const colorForSeverity = (severity: string) => {
    if (severity === "High") return "#fa4e4ebe";
    if (severity === "Medium") return "#f1931fc4";
    if (severity === "Low") return "#f7f300b4";
    return "transparent";
  };

  // Function to render the translation text with highlighted drift items
  const renderHighlightedTranslation = () => {
    if (!analysis || !analysis.drift_items || analysis.drift_items.length === 0) {
      return <p>{translation}</p>;
    }

    const text = translation;
    const driftItems: DriftItem[] = analysis.drift_items;
    type Match = { start: number; end: number; severity: string };

    const matches: Match[] = [];

    driftItems.forEach((item) => {
      const snippet = item.translation_snippet;
      if (!snippet) return;

      const start = text.indexOf(snippet);
      if (start === -1) return; // snippet not found, skip

      matches.push({
        start,
        end: start + snippet.length,
        severity: item.severity,
      });
    });

    if (matches.length === 0) {
      return <p>{text}</p>;
    }
    matches.sort((a, b) => a.start - b.start);

    type Segment = { text: string; severity?: string };
    const segments: Segment[] = [];
    let currentIndex = 0;

    for (const match of matches) {
      if (match.start < currentIndex) {
        continue;
      }

      // Plain text before the match
      if (match.start > currentIndex) {
        segments.push({
          text: text.slice(currentIndex, match.start),
        });
      }

      // Hihglight match
      segments.push({
        text: text.slice(match.start, match.end),
        severity: match.severity,
      });

      currentIndex = match.end;
    }

    // Push the rest of the text after the last match
    if (currentIndex < text.length) {
      segments.push({ text: text.slice(currentIndex) });
    }

    return (
      <p>
        {segments.map((seg, i) =>
          seg.severity ? (
            <span
              key={i}
              style={{ backgroundColor: colorForSeverity(seg.severity) }}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </p>
    );
  };

  // Load recent analyses on component mount
  useEffect(() => {
    loadSaves();
  }, []);

  // Main render
  return (
    <div className="app-root">
      <div className="app-card">
        <h1 className="app-title">Translation Drift Analysis</h1>

        <div className="text-panels">
          <div className="text-panel">
            <span className="text-label">Source text</span>
            <textarea
              className="textarea"
              placeholder="Paste the original text…"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div className="text-panel">
            <span className="text-label">Translation</span>
            <textarea
              className="textarea"
              placeholder="Paste the translated text…"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
            />
          </div>
        </div>

        <button className="primary-button" onClick={handleClick}>
          Analyse translation
        </button>

        {drift && (
          <div className="results-card">
            <h2 className="results-title">Detected drift</h2>
            <p> Analysed drift from {analysis?.source_language}  to  {analysis?.translation_language} </p>
            <div className="translation-preview">
              {renderHighlightedTranslation()}
            </div>

            <ul className="drift-list">
              {drift.split("\n").map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="recent-card">
        <h2 className="results-title">Recent analyses</h2>
        <ul className="recent-list">
          {saves.slice(0, 5).map((save) => (
            <li key={save.id}>
              <strong>{new Date(save.created_at).toLocaleString()}</strong>
              {" — "}
              {save.source_lang}
              {" → "}
              {save.translation_lang} 
              {" | "}
              <em>Source:</em> {save.source_text.slice(0, 50)}...
              {" | "}
              <em>Translation:</em> {save.translation_text.slice(0, 50)}...
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
