const { onCall, HttpsError } = require("firebase-functions/v2/https");

// Jungian symbol list (moved from client config.js)
const SYMBOL_LIST = [
  "Shadow", "Anima", "Animus", "Self", "Persona", "Trickster",
  "Hero", "Wise Old Man", "Great Mother", "Child", "Rebirth",
  "Transformation", "Water", "Fire", "Tree", "Snake", "Mandala",
  "Circle", "Cross", "Quaternity", "Dream", "Death", "Sun", "Moon",
];
const SYMBOLS_STRING = SYMBOL_LIST.join(", ");

// Helper: call Anthropic Claude API
async function callClaude(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new HttpsError("internal", "Anthropic API key not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new HttpsError("internal", `Claude API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1].trim());
}

// Match a voice memo transcription to a book passage
exports.matchPassage = onCall({ maxInstances: 10 }, async (request) => {
  const { transcription, chapterJson } = request.data;
  if (!transcription || !chapterJson) {
    throw new HttpsError("invalid-argument", "Missing transcription or chapterJson");
  }

  const systemPrompt = `You are a reading assistant for "Man and His Symbols" by Carl Jung. You help match voice memo transcriptions to specific book passages and clean up rambling thoughts into coherent annotations.`;

  const userPrompt = `Here is the transcription of a voice memo from a reader:
"${transcription}"

Here is the full text of Chapter ${chapterJson.id}, broken into paragraphs and sentences with IDs:
${JSON.stringify(chapterJson.paragraphs, null, 2)}

Please:
1. Identify the specific passage(s) the reader is referencing. Return the sentence IDs (start and end) of the most relevant passage. If you cannot identify a specific passage, return null.
2. Clean up the reader's rambling thoughts into a coherent annotation (1-3 sentences) while preserving their actual insight. Keep their voice — don't make it academic.
3. Detect any Jungian archetypes or symbols present in either the passage or the reader's reaction. Choose from this list: [${SYMBOLS_STRING}]

Return JSON:
{
  "passageStart": "sentence ID or null",
  "passageEnd": "sentence ID or null",
  "cleanedAnnotation": "the cleaned-up thought",
  "detectedTags": ["Shadow", "Persona"],
  "confidence": "high" | "medium" | "low"
}`;

  return callClaude(systemPrompt, userPrompt);
});

// Analyze a dream using Jungian framework
exports.analyzeDream = onCall({ maxInstances: 10 }, async (request) => {
  const { dreamText, chapterJson } = request.data;
  if (!dreamText || !chapterJson) {
    throw new HttpsError("invalid-argument", "Missing dreamText or chapterJson");
  }

  const systemPrompt = `You are a Jungian dream analyst assisting readers of "Man and His Symbols." You detect archetypal symbols in dreams and connect them to specific book passages.`;

  const userPrompt = `A reader of "Man and His Symbols" logged this dream while reading Chapter ${chapterJson.id}:
"${dreamText}"

Here is the chapter text:
${JSON.stringify(chapterJson.paragraphs, null, 2)}

Please:
1. Detect any Jungian symbols present in the dream from this list: [${SYMBOLS_STRING}]
2. Find 1-2 specific connections between the dream content and passages in the chapter. Reference specific sentence IDs.

Return JSON:
{
  "detectedSymbols": ["Water", "Shadow"],
  "connections": [
    {
      "sentenceId": "1-012-03",
      "explanation": "Your dream's rising water mirrors Jung's discussion of water as unconscious content breaking through to awareness."
    }
  ]
}`;

  return callClaude(systemPrompt, userPrompt);
});

// Generate discussion questions from two readers' reactions
exports.generateDiscussionQuestions = onCall({ maxInstances: 10 }, async (request) => {
  const { keithReactions, danielleReactions, chapterJson } = request.data;
  if (!keithReactions || !danielleReactions || !chapterJson) {
    throw new HttpsError("invalid-argument", "Missing reactions or chapterJson");
  }

  const formatReactions = (reactions) =>
    reactions
      .map((r) => `- ${r.text}${r.passageStart ? ` (passage ${r.passageStart}–${r.passageEnd})` : ""}`)
      .join("\n");

  const systemPrompt = `You are a discussion facilitator for two people reading "Man and His Symbols" by Carl Jung together. You generate thought-provoking questions based on their independent reactions.`;

  const userPrompt = `Two people are reading "Man and His Symbols" together. Here are their independent reactions to Chapter ${chapterJson.id}:

Keith's reactions:
${formatReactions(keithReactions)}

Danielle's reactions:
${formatReactions(danielleReactions)}

Here is the chapter text:
${JSON.stringify(chapterJson.paragraphs, null, 2)}

Generate 3-4 discussion questions that:
1. Address specific tensions or divergences between their readings
2. Connect their observations to deeper Jungian concepts
3. Are genuinely thought-provoking, not generic comprehension questions
4. Reference specific passages when relevant

Return JSON:
{
  "questions": [
    "question text here",
    "another question"
  ]
}`;

  return callClaude(systemPrompt, userPrompt);
});

// Transcribe audio using OpenAI Whisper
exports.transcribeAudio = onCall({ maxInstances: 10 }, async (request) => {
  const { audioBase64, mimeType } = request.data;
  if (!audioBase64) {
    throw new HttpsError("invalid-argument", "Missing audioBase64");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new HttpsError("internal", "OpenAI API key not configured");

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const contentType = mimeType || "audio/webm";
  const ext = contentType.split("/")[1] || "webm";

  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: contentType }), `recording.${ext}`);
  form.append("model", "whisper-1");
  form.append("language", "en");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new HttpsError("internal", `Whisper API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return { text: data.text };
});
