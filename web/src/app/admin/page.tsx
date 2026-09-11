import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import { getDashboard } from '@/features/reports/queries';
import { SalesChart } from '@/features/reports/components/SalesChart';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';

const NAV = [
  { href: '/pos', label: 'POS' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/restock', label: 'Restock' },
  { href: '/admin/users', label: 'Users' },
];

/** Admin hub: metrics, weekly chart, low stock, top products. */
export default async function AdminPage() {
  const profile = await requireRole('admin');
  const dashboard = await getDashboard();
  return (
    <main className="bg-background text-foreground">
      <header className="flex items-center justify-between">
        <div>
          <h1>Admin</h1>
          <p className="text-muted">Signed in as {profile.email}.</p>
        </div>
        <form action={signOut}>
          <Button variant="secondary" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>
      <nav className="mt-3 flex flex-wrap gap-2">
        {NAV.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="rounded border border-border bg-surface px-3 py-1 font-medium text-foreground"
          >
            {entry.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4 grid gap-4">
        <Card title="Today at a glance">
          <p>Total revenue: ₱{dashboard.revenue.toFixed(2)}</p>
          <p>Total orders: {dashboard.orders}</p>
        </Card>
        <Card title="Last 7 days">
          <SalesChart data={dashboard.weekly} />
        </Card>
        <Card title="Low stock">
          {dashboard.lowStock.length === 0 ? (
            <p className="text-muted">All stocked.</p>
          ) : (
            <ul>
              {dashboard.lowStock.map((row) => (
                <li key={row.product_name}>
                  {row.product_name} — {row.quantity} left
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Top selling">
          {dashboard.topProducts.length === 0 ? (
            <p className="text-muted">No sales yet.</p>
          ) : (
            <ol>
              {dashboard.topProducts.map((row) => (
                <li key={row.product_id}>
                  {row.product_name} — {row.quantity_sold} sold (₱
                  {row.revenue.toFixed(2)})
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </main>
  );
}
