/**
 * Department change requests: employees ask, admins approve or reject
 * (supabase/migrations/20261109_department_change_requests.sql).
 */
import { getSupabaseClient } from './supabase';

export interface DepartmentChangeRequest {
  id: string;
  user_id: string;
  user_name: string | null;
  from_department: string | null;
  from_employment_type: 'internal' | 'external' | null;
  from_user_code: string | null;
  to_department: string;
  to_employment_type: 'internal' | 'external' | null;
  to_user_code: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
}

const SETUP =
  'Department change requests need a one-time database update: run supabase/migrations/20261109_department_change_requests.sql in the Supabase SQL Editor.';
const isMissingSetup = (msg: string) => /department_change_requests|request_department_change|admin_resolve_department_change|PGRST202|42P01|schema cache/i.test(msg);

function db() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client;
}
const friendly = (err: { message?: string } | null) => {
  const msg = err?.message || 'Something went wrong.';
  return new Error(isMissingSetup(msg) ? SETUP : msg);
};

export const employmentLabel = (t?: string | null) => (t === 'internal' ? 'Internal' : t === 'external' ? 'External' : '');
export const departmentLabel = (dept?: string | null, type?: string | null) =>
  `${dept || '—'}${type ? ` · ${employmentLabel(type)}` : ''}`;

export async function requestDepartmentChange(department: string, employmentType: string | null, reason: string): Promise<void> {
  const { error } = await db().rpc('request_department_change', {
    p_department: department,
    p_employment_type: employmentType,
    p_reason: reason || null,
  });
  if (error) throw friendly(error);
}

/** The signed-in employee's most recent request (any status), or null. */
export async function loadMyLatestDepartmentRequest(userId: string): Promise<DepartmentChangeRequest | null> {
  const { data, error } = await db()
    .from('department_change_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) {
    if (isMissingSetup(error.message)) return null;
    throw friendly(error);
  }
  return ((data || [])[0] as DepartmentChangeRequest) || null;
}

export async function listDepartmentRequests(): Promise<DepartmentChangeRequest[]> {
  const { data, error } = await db()
    .from('department_change_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw friendly(error);
  return (data || []) as DepartmentChangeRequest[];
}

/** Approve (returns the new User ID) or reject. */
export async function resolveDepartmentRequest(id: string, approve: boolean, note?: string): Promise<string | null> {
  const { data, error } = await db().rpc('admin_resolve_department_change', {
    p_request_id: id,
    p_approve: approve,
    p_note: note || null,
  });
  if (error) throw friendly(error);
  return (data as string | null) || null;
}

/** Number of open requests (for the admin badge); 0 when not set up yet. */
export async function countPendingDepartmentRequests(): Promise<number> {
  const { count, error } = await db()
    .from('department_change_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return 0;
  return count || 0;
}
