/**
 * Canonical skill dictionary with aliases and semantic variants.
 * Used for exact/alias matching and embedding token expansion.
 */

export const SKILL_ALIASES = {
  'node.js': ['node', 'nodejs', 'express', 'express.js', 'server-side javascript', 'backend javascript', 'koa', 'nestjs'],
  'react': ['react.js', 'reactjs', 'modern frontend frameworks', 'frontend reactive ui', 'next.js', 'nextjs', 'react native'],
  'typescript': ['ts', 'typed javascript', 'typescripting'],
  'javascript': ['js', 'es6', 'es2020', 'vanilla javascript', 'ecmascript'],
  'mongodb': ['mongo', 'nosql', 'mongoose', 'document database'],
  'postgresql': ['postgres', 'psql', 'relational database', 'rdbms', 'sql database'],
  'python': ['py', 'python3', 'django', 'fastapi', 'flask'],
  'docker': ['containerization', 'containers', 'docker compose', 'dockerfile'],
  'kubernetes': ['k8s', 'container orchestration', 'helm', 'kubectl'],
  'aws': ['amazon web services', 'cloud computing', 'ec2', 's3', 'lambda', 'cloud infrastructure'],
  'git': ['version control', 'github', 'gitlab', 'git versioning', 'branching'],
  'rest apis': ['rest', 'restful', 'restful apis', 'api design', 'rest api', 'http api'],
  'graphql': ['gql', 'apollo graphql', 'graphql schema'],
  'redis': ['in-memory cache', 'key-value store', 'caching layer'],
  'jest': ['unit testing', 'test runner', 'jest testing', 'javascript testing'],
  'cypress': ['e2e testing', 'end-to-end testing', 'browser automation', 'ui testing'],
  'playwright': ['browser testing', 'test automation', 'end to end testing'],
  'ci/cd': ['continuous integration', 'continuous deployment', 'github actions', 'jenkins', 'gitlab ci'],
  'tailwind css': ['tailwindcss', 'utility-first css', 'tailwind'],
  'html5': ['html', 'semantic html', 'web markup'],
  'css3': ['css', 'styling', 'responsive design', 'flexbox', 'css grid']
};

/**
 * Normalizes a skill string to lower case and trimmed
 */
export const normalizeSkill = (skill) => {
  return String(skill || '').trim().toLowerCase().replace(/[-_.]+/g, (m) => m === '.' ? '.' : ' ');
};

/**
 * Find canonical skill for a given term, or returns the term itself
 */
export const getCanonicalSkill = (term) => {
  const normalized = normalizeSkill(term);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (canonical === normalized || aliases.map(normalizeSkill).includes(normalized)) {
      return canonical;
    }
  }
  return normalized;
};

/**
 * Check if term matches target skill either directly, via canonical match, or via aliases
 */
export const isSkillMatch = (term, targetSkill) => {
  if (!term || !targetSkill) return false;
  const canonicalTerm = getCanonicalSkill(term);
  const canonicalTarget = getCanonicalSkill(targetSkill);
  return canonicalTerm === canonicalTarget;
};

export const isAliasMatch = isSkillMatch;


export default SKILL_ALIASES;
