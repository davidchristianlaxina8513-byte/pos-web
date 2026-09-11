import { notFound } from 'next/navigation';
import { requireRole } from '@/features/auth/queries';
import { getCategories, getEditableProduct } from '@/features/menu/queries';
import { ProductForm } from '@/features/menu/components/ProductForm';

/** Admin: edit a product (par level editable here, as on mobile). */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const productId = Number(id);
  const [categories, product] = await Promise.all([
    getCategories(),
    Number.isInteger(productId) ? getEditableProduct(productId) : null,
  ]);
  if (!product) notFound();
  return (
    <main className="bg-background text-foreground">
      <h1>Edit product — {product.name}</h1>
      <div className="mt-4">
        <ProductForm categories={categories} initial={product} />
      </div>
    </main>
  );
}
