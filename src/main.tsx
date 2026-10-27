import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { matchFromRubric } from './lib/score';

console.log(
  matchFromRubric({
    technical_skills: 8,
    experience_relevance: 6,
    education_fit: 7,
    evidence_quality: 4,
  })
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
