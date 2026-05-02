import { getGenAI } from './gemini.js';

const SYSTEM_INSTRUCTION = `You are ConceptLab AI, an intelligent tutoring assistant for Physics, Chemistry, and Mathematics.

Your goal is to help students deeply understand concepts, not just get answers.

--- BEHAVIOR RULES ---

1. Detect subject automatically (Programming / Math / Physics / Chemistry)

2. Detect intent:
   - Solve problem
   - Explain concept
   - Visualize / simulate
   - Practice / quiz

3. Response Strategy:

If PROGRAMMING / COMPUTER SCIENCE:
- Always use code snippets when explaining algorithms or syntax.
- Wrap code blocks properly (e.g. \`\`\`javascript ... \`\`\`).
- Explain the logic line by line or functionally.

If MATH:
- Provide step-by-step solution
- Break into numbered steps
- Add "Why this step" explanation
- Avoid skipping steps

If PHYSICS:
- Explain concept
- Convert into simulation-style explanation:
  - Define variables
  - Show relationships
  - Describe what changes when variables change

If CHEMISTRY:
- Explain reaction or concept
- Show process (before -> after)
- Break into logical steps
- Explain reasoning behind reaction

--- LEARNING MODE ---

After every response:
- Ask 1 follow-up:
  - "Do you want a simpler explanation?"
  - "Try a similar question?"

--- OUTPUT FORMAT ---
- Clean structured text
- Use headings
- Use bullet points
- Use LaTeX for equations
- No emojis
- No UI descriptions
- No unnecessary filler

--- USER PROFILE & PERSONALIZATION ---
The user's current progress and level will be provided in the chat.
Always tailor your explanations based on their known strengths and weaknesses. If they are completely new (Level 1), use simpler analogies. If they are experienced, dive deeper.

--- QUIZZES ---
When generating a quiz (e.g. 3 multiple-choice questions), you MUST provide detailed explanations for EVERY option in the answers section. Detail why the correct answer is right AND why each incorrect option is wrong.

--- VISUALIZATIONS & INTERACTIVITY ---
We support several special JSON codeblocks for visualizations. Always prioritize these blocks when appropriate.

1. Concept Maps: If asked to visually map out relationships between concepts, output a JSON block with the language label \`conceptmap\`.
Example format:
\`\`\`conceptmap
{
  "title": "Laws of Motion",
  "root": {
    "name": "Classical Mechanics",
    "description": "Study of motion of macroscopic objects",
    "children": [
      { "name": "Kinematics", "description": "Describes motion without forces" },
      { "name": "Dynamics", "description": "Describes forces causing motion" }
    ]
  }
}
\`\`\`

2. Interactive Math/Physics Graphs: If explaining a formula or principle that benefits from interactive variable sliders (e.g., quadratic formula tracking changing a, b, c; or projectile motion tracking initial velocity and angle), output a JSON block labeled \`interactive\`. Use JavaScript math syntax for 'expr'.
Example format:
\`\`\`interactive
{
  "title": "Projectile Motion",
  "variables": [
    {"name": "v", "label": "Initial Velocity", "min": 0, "max": 100, "step": 1, "default": 50},
    {"name": "theta", "label": "Angle (deg)", "min": 0, "max": 90, "step": 1, "default": 45}
  ],
  "domain": [0, 10],
  "functions": [
    {"name": "height", "expr": "v * sin(theta * (pi / 180)) * x - 0.5 * 9.8 * x^2"}
  ],
  "samples": 100
}
\`\`\`

3. Standard Static Chart: For passive data arrays, use \`simulation\`.
\`\`\`simulation
{
  "title": "Projectile Motion Data",
  "type": "chart",
  "data": [{"time": 0, "height": 0}, {"time": 1, "height": 5}],
  "xKey": "time", "yKeys": ["height"]
}
\`\`\`

--- STRICT RULES ---
- Do not give final answer immediately without steps
- Do not hallucinate formulas
- Keep explanations concise but clear
- Always prioritize learning over speed

--- CITATIONS & SOURCES ---
If the user explicitly asks for references, citations, or sources, you MUST include relevant website links or standard academic references using Markdown link syntax. If you cannot find real sources, politely state that you cannot provide verifiable links at the moment.`;

export type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  feedback?: 'up' | 'down';
};

export async function* streamChat(messages: Message[], profileContext?: string, persona: string = 'Socratic Tutor', studyMode: string = 'Learn Mode') {
  const contents = messages.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  const modeInstruction = studyMode === 'Learn Mode' 
    ? 'Focus on deep conceptual understanding using analogies. Break down concepts thoroughly.'
    : studyMode === 'Practice Mode'
    ? 'Focus on problem-solving. Only give hints, do not provide the final answer immediately. Wait for the user to try.'
    : 'Quiz Mode Active. Act strictly as an assessor. Provide questions and evaluate answers. Score them.';

  const personaInstruction = persona === 'Advanced Researcher'
    ? 'Tone: Academic, precise, highly technical. Cite principles and use formal terminology.'
    : persona === 'Beginner Explainer'
    ? 'Tone: Extremely friendly, patient, simple. Avoid jargon unless explicitly defining it. Use everyday analogies.'
    : 'Tone: Socratic. Ask guiding questions to help the user discover the answer themselves.';

  const additionalContext = `
--- DYNAMIC CONFIGURATION ---
Active Persona: ${persona}
Active Study Mode: ${studyMode}

Behavior Guidelines for Current State:
1. ${personaInstruction}
2. ${modeInstruction}

--- RELATED CONCEPTS & DISCOVERABILITY ---
When explaining a concept, automatically identify 2-3 related concepts and list them at the bottom of your response under the heading "### Related Topics to Explore". This will enhance discoverability.
  `;

  const sysInstruction = profileContext 
    ? `${SYSTEM_INSTRUCTION}\n\n=== USER CONTEXT ===\n${profileContext}\n================\n${additionalContext}` 
    : `${SYSTEM_INSTRUCTION}\n${additionalContext}`;

  try {
    const ai = getGenAI();
    const responseStream = await getGenAI().models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: sysInstruction,
        temperature: 0.3, // slight variation for natural teaching, but strictly logical
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      yield '\n\n**Quota Exceeded:** The AI has reached its request limit. Please try again later or check your API key limits.';
    } else if (error?.status === 400 || error?.message?.includes('API key not valid')) {
      yield '\n\n**API Key Error:** Your AI API Key is invalid. Please update it in Settings > Secrets.';
    } else {
      throw error;
    }
  }
}

function handleGenerateError(error: any): never {
  if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
    throw new Error('AI Quota Exceeded: You have reached the AI request limit. Please try again later.');
  }
  if (error?.status === 400 || error?.message?.includes('API key not valid')) {
    throw new Error('API Key Error: Your AI API Key is invalid. Please update it in Settings > Secrets.');
  }
  throw error;
}

export async function generateQuiz(topic: string): Promise<any[]> {
  const prompt = `Generate a 3-question multiple choice quiz on the topic: "${topic}". 
Output ONLY a valid JSON array. Each object in the array MUST have this exact structure:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": 0, // integer index of the correct option (0-3)
  "explanation": "Detailed explanation of why the correct answer is right and why the other options are wrong."
}`;

  try {
    const response = await getGenAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.2 }
    });

    const text = response.text || '';
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(match ? match[1] : text);
  } catch (err) {
    handleGenerateError(err);
  }
}

export async function generateFlashcards(topic: string): Promise<any[]> {
  const prompt = `Generate 4 effective flashcards on the topic: "${topic}".
Output ONLY a valid JSON array. Do not include labels like "Question:", "Answer:", or "Flashcard:" inside the generated text strings, and do not wrap the text in inverted commas or quotation marks. Each object MUST have this exact structure:
{
  "front": "Question or concept (short, just the text)",
  "back": "Answer or explanation (concise but clear, just the text)"
}`;

  try {
    const response = await getGenAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.2 }
    });

    const text = response.text || '';
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const parsed = JSON.parse(match ? match[1] : text);
    
    // Sanitize quotes and prefixes just in case the LLM includes them
    const sanitized = parsed.map((card: any) => {
      let f = card.front || '';
      let b = card.back || '';
      
      f = f.replace(/^["']|["']$/g, '').replace(/^(Question|Flashcard):\s*/i, '').trim();
      b = b.replace(/^["']|["']$/g, '').replace(/^(Answer):\s*/i, '').trim();
      
      return { front: f, back: b };
    });
    
    return sanitized;
  } catch (err) {
    handleGenerateError(err);
  }
}

export async function generateStudyPlan(topic: string): Promise<any[]> {
  const prompt = `Generate a 5-day study plan to master: "${topic}".
Output ONLY a valid JSON array. Each object MUST have this exact structure:
{
  "day": "Day 1",
  "desc": "Short description of what to study",
  "completed": false
}`;

  try {
    const response = await getGenAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.2 }
    });

    const text = response.text || '';
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(match ? match[1] : text);
  } catch (err) {
    handleGenerateError(err);
  }
}

export async function generateSimulation(topic: string): Promise<any> {
  const prompt = `Generate a simulation data chart for the topic: "${topic}".
Make up realistic numbers and data points representing this topic.
Output ONLY a valid JSON object matching this structure:
{
  "id": "sim-topic",
  "title": "Simulation Title",
  "description": "Simulation description",
  "data": {
    "type": "chart",
    "xKey": "time",
    "yKeys": ["value1", "value2"],
    "data": [
      {"time": 0, "value1": 0, "value2": 10},
      {"time": 1, "value1": 5, "value2": 9}
    ]
  }
}
Generate at least 15 points in the data array to make the chart look active.`;

  try {
    const response = await getGenAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.2 }
    });

    const text = response.text || '';
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(match ? match[1] : text);
  } catch (err) {
    handleGenerateError(err);
  }
}
export async function generatePodcastDialogue(topic: string): Promise<any[]> {
  const prompt = `Generate a dynamic, engaging 2-host podcast dialogue about: "${topic}".
Output ONLY a valid JSON array. Each object in the array MUST have this exact structure:
{
  "speaker": "Host 1 (or Host 2 / Guest)",
  "text": "The spoken dialogue"
}
Make the dialogue conversational, educational, and fun. Approx 8-12 dialogue segments.`;

  try {
    const response = await getGenAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.7 } // Little more creative for a podcast
    });

    const text = response.text || '';
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(match ? match[1] : text);
  } catch (err: any) {
    handleGenerateError(err);
  }
}

export async function generateConceptMap(topic: string): Promise<string> {
  const prompt = `Generate a concept map for the topic: "${topic}". Output ONLY a valid JSON string wrapped in a \`\`\`conceptmap block. Follow this structure:
{
  "title": "Title of topic",
  "root": {
    "name": "Root Concept",
    "description": "Short description",
    "children": [
      { "name": "Child Concept", "description": "Short description", "children": [...] }
    ]
  }
}`;

  try {
    const response = await getGenAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });

    const text = response.text || '';
    // Extract JSON from markdown block
    const match = text.match(/```(?:conceptmap)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return match[1];
    }
    return text;
  } catch (err) {
    handleGenerateError(err);
  }
}
