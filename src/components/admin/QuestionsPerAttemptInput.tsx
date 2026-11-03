/**
 * "Questions per learner": how many questions each learner gets from the
 * quiz's question bank (picked at random, in random order).
 */
import React from 'react';
import { Shuffle } from 'lucide-react';

export const DEFAULT_QUESTIONS_PER_ATTEMPT = 10;

export const QuestionsPerAttemptInput: React.FC<{ value: number; onChange: (n: number) => void; bankSize: number }> = ({
  value,
  onChange,
  bankSize,
}) => (
  <div className="flex items-center gap-2 flex-wrap">
    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
      <Shuffle className="w-3.5 h-3.5 text-[#176B98]" /> Questions per learner:
    </label>
    <input
      type="number"
      min={1}
      max={200}
      value={value}
      onChange={(e) => onChange(Math.max(1, Math.min(200, Number(e.target.value) || DEFAULT_QUESTIONS_PER_ATTEMPT)))}
      className="w-20 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-[#176B98] focus:outline-none focus:ring-2 focus:ring-[#176B98]"
    />
    <span className="text-[11px] text-slate-400">
      {bankSize > value
        ? `Each learner gets ${value} random questions from ${bankSize} (different for each person and each retake).`
        : `All ${bankSize} questions, in a random order for each learner.`}
    </span>
  </div>
);
