import { requireRole } from '@/features/auth/queries';
import { getAuditLog } from '@/features/audit/queries';
import { StaffShell } from '@/components/layout/staff-shell';
import { AuditLogManager } from '@/components/modules/audit';

export default async function AuditLogPage() {
  const [profile, entries] = await Promise.all([
    requireRole('admin'),
    getAuditLog(),
  ]);

  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="System Audit Log"
      subtitle="Immutable audit trail tracking quota modifications, sales events, shifts, and managerial actions."
      breadcrumbs={[{ name: 'Audit Log', current: true }]}
      fullWidth={true}
    >
      <AuditLogManager entries={entries} />
    </StaffShell>
  );
}
