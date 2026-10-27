import { useEffect, useState } from 'react';
import {
  bestLever,
  bestLeverAcross,
  pointsLeft,
  pointsLeftAcross,
} from './lib/leverage';
import { matchFromRubric, WEIGHTS, type RubricKey } from './lib/score';

const LABELS: Record<RubricKey, string> = {
  technical_skills: 'Technical skills',
  experience_relevance: 'Experience',
  education_fit: 'Education',
  evidence_quality: 'Evidence',
};

// Text is stored beside the scores. The scoring functions never read it.
type Role = {
  title: string;
  cv: string;
  job: string;
  scores: Record<RubricKey, number>;
};

const DRAFT_START: Record<RubricKey, number> = {
  technical_skills: 10,
  experience_relevance: 6,
  education_fit: 7,
  evidence_quality: 0,
};

const SAVED_START: Role[] = [
  {
    title: 'Campus lab',
    cv: 'Logged attendance for the weekend teaching lab.',
    job: 'Support the weekend teaching lab and keep the roster accurate.',
    scores: { ...DRAFT_START },
  },
  {
    title: 'Analyst internship',
    cv: 'Listed Python and Excel. No measured result.',
    job: 'Query customer data with SQL and explain the findings.',
    scores: {
      technical_skills: 4,
      experience_relevance: 8,
      education_fit: 9,
      evidence_quality: 5,
    },
  },
];

const MEMORY_KEY = 'gap-memory';

type Memory = {
  draftTitle: string;
  draftCv: string;
  draftJob: string;
  draft: Record<RubricKey, number>;
  saved: Role[];
};

function emptyMemory(): Memory {
  return {
    draftTitle: 'Campus lab',
    draftCv: SAVED_START[0].cv,
    draftJob: SAVED_START[0].job,
    draft: { ...DRAFT_START },
    saved: SAVED_START,
  };
}

function loadMemory(): Memory {
  const raw = localStorage.getItem(MEMORY_KEY);
  if (!raw) return emptyMemory();
  try {
    const parsed = JSON.parse(raw) as Memory;
    if (!parsed.draft || !Array.isArray(parsed.saved)) return emptyMemory();
    return parsed;
  } catch {
    return emptyMemory();
  }
}

function opening(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '') return 'Nothing saved';
  return trimmed.length > 42 ? trimmed.slice(0, 42) + '...' : trimmed;
}

export default function App() {
  const [starting] = useState(loadMemory);
  const [draftTitle, setDraftTitle] = useState(starting.draftTitle);
  const [draftCv, setDraftCv] = useState(starting.draftCv);
  const [draftJob, setDraftJob] = useState(starting.draftJob);
  const [draft, setDraft] = useState(starting.draft);
  const [saved, setSaved] = useState(starting.saved);
  const [note, setNote] = useState('');

  useEffect(() => {
    const memory: Memory = { draftTitle, draftCv, draftJob, draft, saved };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  }, [draftTitle, draftCv, draftJob, draft, saved]);

  const scoreSets = saved.map((role) => role.scores);
  const alone = bestLever(draft);
  const across = scoreSets.length > 0 ? bestLeverAcross(scoreSets) : null;

  function changeScore(key: RubricKey, value: string) {
    const next = Number(value);
    setDraft({ ...draft, [key]: Number.isFinite(next) ? next : 0 });
  }

  function addRole() {
    const title = draftTitle.trim() === '' ? 'Untitled' : draftTitle.trim();
    setSaved([
      ...saved,
      { title, cv: draftCv, job: draftJob, scores: { ...draft } },
    ]);
  }

  function removeRole(index: number) {
    setSaved(saved.filter((_, i) => i !== index));
  }

  async function readText() {
    setNote('Reading...');
    const response = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv: draftCv, job: draftJob }),
    });
    if (!response.ok) {
      setNote('The server did not return scores.');
      return;
    }
    const payload = (await response.json()) as {
      scores: Record<RubricKey, number>;
      source: string;
      detail?: string;
    };
    setDraft(payload.scores);
    setNote(
      payload.source === 'model'
        ? 'Scores from the model.'
        : `Scores from the stand-in. ${payload.detail ?? ''}`
    );
  }

  return (
    <main className="page">
      <section className="summary">
        <p className="label">Draft role</p>
        <p className="score">{matchFromRubric(draft)}</p>
        <p className="lever">
          This role only: {LABELS[alone]} (
          {Math.round(pointsLeft(draft[alone], alone))} points)
        </p>
        {across !== null ? (
          <p className="lever">
            Across {saved.length} roles: {LABELS[across]} (
            {Math.round(pointsLeftAcross(scoreSets, across))} points)
          </p>
        ) : (
          <p className="lever">Save a role to compare.</p>
        )}

        <div className="saved">
          {saved.map((role, index) => (
            <div key={index} className="saved-role">
              <p className="lever">
                {role.title}: {matchFromRubric(role.scores)}
                <br />
                {opening(role.cv)}
              </p>
              <button type="button" onClick={() => removeRole(index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="editor">
        <div className="controls">
          <label>
            Job title
            <input
              type="text"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
          </label>
          <label>
            CV
            <textarea
              value={draftCv}
              onChange={(event) => setDraftCv(event.target.value)}
            />
          </label>
          <label>
            Job description
            <textarea
              value={draftJob}
              onChange={(event) => setDraftJob(event.target.value)}
            />
          </label>
          {(Object.keys(WEIGHTS) as RubricKey[]).map((key) => (
            <label key={key}>
              {LABELS[key]}
              <input
                type="number"
                min={0}
                max={10}
                value={draft[key]}
                onChange={(event) => changeScore(key, event.target.value)}
              />
            </label>
          ))}
        </div>

        <button type="button" className="add" onClick={readText}>
          Read the text
        </button>
        {note !== '' ? <p className="lever">{note}</p> : null}
        <button type="button" className="add" onClick={addRole}>
          Save this role
        </button>
      </section>
    </main>
  );
}
