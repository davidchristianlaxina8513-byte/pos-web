import { requireRole } from '@/features/auth/queries';
import { getCategories } from '@/features/menu/queries';
import { ProductForm } from '@/features/menu/components/ProductForm';

/** Admin: add a product (inventory row is auto-created on save). */
export default async function NewProductPage() {
  await requireRole('admin');
  const categories = await getCategories();
  return (
    <main className="bg-background text-foreground">
      <h1>Add product</h1>
      <div className="mt-4">
        <ProductForm categories={categories} initial={null} />
      </div>
    </main>
  );
}
