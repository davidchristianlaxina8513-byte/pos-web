import { requireRole } from '@/features/auth/queries';
import { getAuditLog } from '@/features/audit/queries';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';

export default async function AuditLogPage() {
  const profile = await requireRole('admin');
  const entries = await getAuditLog();
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Audit Log"
      subtitle="Quota, sale, shift, and turnover activity"
    >
      <Card className="rounded-card border-border shadow-soft">
        {entries.length === 0 ? (
          <p className="text-sm text-muted">No audited activity yet.</p>
        ) : (
          <ol className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.audit_id} className="py-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{entry.event_type.replaceAll('_', ' ')}</strong>
                  <time className="text-muted">
                    {new Date(entry.created_at).toLocaleString('en-PH', {
                      timeZone: 'Asia/Manila',
                    })}
                  </time>
                </div>
                <p className="capitalize text-muted">
                  {entry.actor_role ?? 'system'} · {entry.entity_type}
                  {entry.entity_id ? ` · ${entry.entity_id}` : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </StaffShell>
  );
}
