import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export const SkillTagInput = ({
  skills = [],
  onChange,
  placeholder = 'Type skill and press Enter (e.g. React, Node.js)',
  label = 'Skills'
}) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    }
  };

  const addSkill = () => {
    const trimmed = input.trim().replace(/^,+|,+$/g, '');
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
      setInput('');
    }
  };

  const removeSkill = (indexToRemove) => {
    onChange(skills.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <div className="min-h-[46px] p-2 bg-white border border-slate-200 rounded-xl focus-within:border-indigo focus-within:ring-2 focus-within:ring-indigo/10 flex flex-wrap items-center gap-1.5 transition">
        {skills.map((skill, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-lavender-light text-indigo rounded-pill border border-lavender/60"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(idx)}
              className="hover:text-danger p-0.5 rounded-full hover:bg-white/60 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex-1 flex items-center min-w-[140px]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addSkill}
            placeholder={skills.length === 0 ? placeholder : 'Add more...'}
            className="w-full text-sm outline-none px-2 py-1 bg-transparent placeholder:text-slate-400"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400">Press Enter or comma to add each skill tag.</p>
    </div>
  );
};

export default SkillTagInput;
