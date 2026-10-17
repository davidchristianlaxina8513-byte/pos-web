import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';

export interface AuditEntry {
  audit_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  actor_email: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

function resolveActorEmail(
  rawUser: string | null | undefined,
  details: Record<string, unknown>,
  role: string | null | undefined,
): string | null {
  const candidate =
    (typeof details.actor_email === 'string' && details.actor_email) ||
    (typeof details.email === 'string' && details.email) ||
    (typeof details.cashier_email === 'string' && details.cashier_email) ||
    (typeof details.changed_by_email === 'string' &&
      details.changed_by_email) ||
    rawUser ||
    (typeof details.cashier_name === 'string' && details.cashier_name) ||
    null;

  if (candidate) {
    if (candidate.includes('@')) return candidate;
    if (candidate.toLowerCase() === 'admin') return 'admin@elvira.cafe';
    if (candidate.toLowerCase() === 'cashier') return 'cashier@elvira.cafe';
    return `${candidate.toLowerCase()}@elvira.cafe`;
  }

  if (role) {
    const r = role.toLowerCase();
    if (r === 'admin') return 'admin@elvira.cafe';
    if (r === 'cashier') return 'cashier@elvira.cafe';
  }

  return null;
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  await requireRole('admin');
  const supabase = await createClient();

  const [auditRes, usersRes] = await Promise.all([
    supabase
      .from('audit_log')
      .select(
        'audit_id, event_type, entity_type, entity_id, actor_id, actor_role, details, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('user').select('user_id, username'),
  ]);

  if (auditRes.error) throw auditRes.error;

  const userMap = new Map<string, string>();
  if (usersRes.data) {
    for (const u of usersRes.data) {
      if (u.user_id && u.username) {
        userMap.set(u.user_id, u.username);
      }
    }
  }

  return (auditRes.data ?? []).map((row) => {
    const details = (row.details ?? {}) as Record<string, unknown>;
    const rawUser = row.actor_id ? userMap.get(row.actor_id) : null;
    const actorEmail = resolveActorEmail(rawUser, details, row.actor_role);

    return {
      audit_id: row.audit_id,
      event_type: row.event_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      actor_id: row.actor_id,
      actor_role: row.actor_role,
      actor_email: actorEmail,
      details,
      created_at: row.created_at,
    };
  });
}
