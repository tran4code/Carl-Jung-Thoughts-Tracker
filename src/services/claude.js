import { ANTHROPIC_API_URL, SYMBOL_LIST } from '../config';

const SYMBOLS_STRING = SYMBOL_LIST.join(', ');

async function callClaude(systemPrompt, userPrompt) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key not configured');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1].trim());
}

export async function matchPassage(transcription, chapterJson) {
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
}

export async function analyzeDream(dreamText, chapterJson) {
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
}

export async function generateDiscussionQuestions(keithReactions, danielleReactions, chapterJson) {
  const systemPrompt = `You are a discussion facilitator for two people reading "Man and His Symbols" by Carl Jung together. You generate thought-provoking questions based on their independent reactions.`;

  const formatReactions = (reactions) =>
    reactions.map((r) => `- ${r.text}${r.passageStart ? ` (passage ${r.passageStart}–${r.passageEnd})` : ''}`).join('\n');

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
}
