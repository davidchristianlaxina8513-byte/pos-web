export const UNCATEGORIZED = 'Uncategorized';

export interface ProductFormValues {
  name: string;
  category_id: string;
  priceText: string;
  defaultQuotaText: string;
}

export interface ValidProduct {
  name: string;
  category_id: string;
  price: number;
  dailyQuotaLimit: number | null;
}

export function validateProduct(
  values: ProductFormValues,
): { ok: true; value: ValidProduct } | { ok: false; error: string } {
  const name = values.name.trim();
  if (!name) return { ok: false, error: 'Product name is required.' };
  if (!values.category_id.trim())
    return { ok: false, error: 'Product category is required.' };
  const price = Number(values.priceText);
  if (!Number.isFinite(price) || price < 0)
    return {
      ok: false,
      error: 'Price must be a number greater than or equal to zero.',
    };
  const dailyQuotaLimit =
    values.defaultQuotaText.trim() === ''
      ? null
      : Number(values.defaultQuotaText);
  if (
    dailyQuotaLimit !== null &&
    (!Number.isInteger(dailyQuotaLimit) || dailyQuotaLimit < 0)
  )
    return {
      ok: false,
      error:
        'Daily quota must be blank or a whole number greater than or equal to zero.',
    };
  return {
    ok: true,
    value: {
      name,
      category_id: values.category_id,
      price,
      dailyQuotaLimit,
    },
  };
}

export function validateCategoryName(
  name: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Category name is required.' };
  return { ok: true, value: trimmed };
}
