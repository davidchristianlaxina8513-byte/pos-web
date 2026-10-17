import { requireRole } from '@/features/auth/queries';
import {
  getReceiptRecords,
  getSalesReport,
  getTopProducts,
} from '@/features/reports/queries';
import { resolveRange } from '@/features/reports/aggregate';
import type { ReportPreset } from '@/features/reports/aggregate';
import {
  ReportsFilterBar,
  ReportsKPIs,
  ReportsViewManager,
  PrintReportButton,
} from '@/components/modules/reports';
import type { ReportsTab } from '@/components/modules/reports';
import { StaffShell } from '@/components/layout/staff-shell';

function parsePreset(value: string | undefined): ReportPreset {
  return value === '7d' || value === '30d' || value === 'all' ? value : 'today';
}

/** Comprehensive sales performance, payment breakdowns, and transaction ledger. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    search?: string;
    cashier?: string;
    paymentMode?: string;
    paymentStatus?: string;
    tab?: string;
  }>;
}) {
  const profile = await requireRole('admin');
  const params = await searchParams;
  const preset = parsePreset(params.preset);
  const range = resolveRange(preset, params.from ?? null, params.to ?? null);

  const defaultTab: ReportsTab =
    params.tab === 'trends' ||
    params.tab === 'top_products' ||
    params.tab === 'ledger' ||
    params.tab === 'all'
      ? params.tab
      : params.search ||
          params.cashier ||
          params.paymentMode ||
          params.paymentStatus
        ? 'ledger'
        : 'all';

  const [report, top, ledger] = await Promise.all([
    getSalesReport(range),
    getTopProducts(range),
    getReceiptRecords(range, {
      search: params.search,
      cashier: params.cashier,
      paymentMode: params.paymentMode,
      paymentStatus: params.paymentStatus,
    }),
  ]);

  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Sales Reports & Analytics"
      subtitle="Track gross & net revenue, sales trends, top performing products, and transaction records."
      breadcrumbs={[{ name: 'Reports & Analytics', current: true }]}
      actions={<PrintReportButton />}
      fullWidth={true}
    >
      <div className="space-y-6">
        {/* Presets & Filter Controls */}
        <ReportsFilterBar preset={preset} params={params} />

        {/* Overview KPI Metric Cards */}
        <ReportsKPIs
          grossRevenue={report.grossRevenue}
          voidedRevenue={report.voidedRevenue}
          netRevenue={report.netRevenue}
          summary={report.summary}
        />

        {/* Tabbed Analytics & Ledger Views */}
        <ReportsViewManager
          daily={report.daily}
          summary={report.summary}
          topProducts={top}
          receipts={ledger.receipts}
          lines={ledger.lines}
          receiptsTruncated={ledger.receiptsTruncated}
          linesTruncated={ledger.linesTruncated}
          defaultTab={defaultTab}
        />
      </div>
    </StaffShell>
  );
}
