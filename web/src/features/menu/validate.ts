export interface ProductFormValues {
  name: string;
  category_id: string;
  priceText: string;
  parText: string;
}

export interface ValidProduct {
  name: string;
  category_id: string;
  price: number;
  parLevel: number | null;
}

/**
 * Product rules, mirroring Expo `AddEditMenuItem` + `validatePayload`:
 * name and category required, price a finite number ≥ 0, par level empty
 * (null) or an integer ≥ 0.
 */
export function validateProduct(
  values: ProductFormValues,
): { ok: true; value: ValidProduct } | { ok: false; error: string } {
  const name = values.name.trim();
  if (!name) return { ok: false, error: 'Product name is required.' };
  if (!values.category_id.trim()) {
    return { ok: false, error: 'Product category is required.' };
  }
  const price = Number(values.priceText);
  if (!Number.isFinite(price) || price < 0) {
    return {
      ok: false,
      error: 'Price must be a number greater than or equal to zero.',
    };
  }
  const parText = values.parText.trim();
  if (parText === '') {
    return { ok: true, value: { name, category_id: values.category_id, price, parLevel: null } };
  }
  const par = Number(parText);
  if (!Number.isInteger(par) || par < 0) {
    return {
      ok: false,
      error: 'Par level must be a whole number greater than or equal to zero.',
    };
  }
  return {
    ok: true,
    value: { name, category_id: values.category_id, price, parLevel: par },
  };
}

/** Category names are trimmed non-empty strings. */
export function validateCategoryName(
  name: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Category name is required.' };
  return { ok: true, value: trimmed };
}
