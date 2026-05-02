export type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  feedback?: 'up' | 'down';
};

export async function* streamChat(messages: Message[], profileContext?: string, persona: string = 'Socratic Tutor', studyMode: string = 'Learn Mode') {
  const response = await fetch('/api/lib/stream-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, profileContext, persona, studyMode })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to stream chat');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No body available');
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}

export async function generateQuiz(topic: string): Promise<any[]> {
  const res = await fetch('/api/lib/generate-quiz', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ topic })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateFlashcards(topic: string): Promise<any[]> {
  const res = await fetch('/api/lib/generate-flashcards', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ topic })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateStudyPlan(topic: string): Promise<any[]> {
  const res = await fetch('/api/lib/generate-study-plan', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ topic })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateSimulation(topic: string): Promise<any> {
  const res = await fetch('/api/lib/generate-simulation', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ topic })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generatePodcastDialogue(topic: string): Promise<any[]> {
  const res = await fetch('/api/lib/generate-podcast', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ topic })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateConceptMap(topic: string): Promise<string> {
  const res = await fetch('/api/lib/generate-concept-map', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ topic })
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).result;
}
