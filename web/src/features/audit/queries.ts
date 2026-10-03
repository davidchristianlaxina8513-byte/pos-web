import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';

export interface AuditEntry {
  audit_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_role: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_log')
    .select(
      'audit_id, event_type, entity_type, entity_id, actor_role, details, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AuditEntry[];
}
