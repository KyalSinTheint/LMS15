/** KBZ Life departments, used on the Register page and profile screens. */
export const DEPARTMENTS = [
  'Operations',
  'Admin',
  'Human Resources',
  'Learning & Development',
  'Finance',
  'Bancassurance',
  'Corporate Direct Sales',
  'IT',
  'Marketing',
  'Agency',
] as const;

/** The list, plus the person's current value if it is an older department name. */
export const departmentOptions = (current?: string | null): string[] =>
  current && !(DEPARTMENTS as readonly string[]).includes(current) ? [current, ...DEPARTMENTS] : [...DEPARTMENTS];

/** Departments with Internal and External staff (chosen at registration). */
export const CHANNEL_DEPARTMENTS = ['Agency', 'Bancassurance', 'Corporate Direct Sales'];
export const hasEmploymentType = (department?: string | null) => !!department && CHANNEL_DEPARTMENTS.includes(department);

const PREFIX: Record<string, string> = {
  Agency: 'A',
  Bancassurance: 'B',
  'Corporate Direct Sales': 'C',
  Operations: 'OPS',
  Admin: 'ADM',
  'Human Resources': 'HR',
  'Learning & Development': 'LD',
  Finance: 'FIN',
  IT: 'IT',
  Marketing: 'MKT',
};

/** User ID prefix, same rule as the database: AE, AI, BE, BI, CE, CI, HR, IT … */
export function userCodePrefix(department?: string | null, employmentType?: string | null): string {
  const base = (department && PREFIX[department]) || 'GEN';
  if (!hasEmploymentType(department)) return base;
  return base + (employmentType === 'internal' ? 'I' : 'E');
}
