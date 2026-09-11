'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
import { stockIn } from '../actions';

export interface StockInFormProps {
  stockId: number;
}

/** Quantity + optional supplier, posts via the `adjust_stock` RPC. */
export function StockInForm({ stockId }: StockInFormProps) {
  const router = useRouter();
  const [quantityText, setQuantityText] = useState('');
  const [supplier, setSupplier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quantity = Number.parseInt(quantityText, 10);
  const quantityIsValid = Number.isInteger(quantity) && quantity > 0;

  const handleSubmit = async () => {
    if (!quantityIsValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    const result = await stockIn(stockId, quantity, supplier || null);
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }
    router.push('/admin/inventory');
  };

  return (
    <div className="flex max-w-sm flex-col gap-3">
      <Field
        label="Quantity"
        name="quantity"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        placeholder="0"
        value={quantityText}
        onChange={(event) => setQuantityText(event.target.value)}
      />
      <Field
        label="Supplier (optional)"
        name="supplier"
        type="text"
        autoCapitalize="words"
        value={supplier}
        onChange={(event) => setSupplier(event.target.value)}
      />
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <Button
        onClick={handleSubmit}
        disabled={!quantityIsValid || isSubmitting}
      >
        {isSubmitting ? 'Saving…' : 'Save stock-in'}
      </Button>
    </div>
  );
}
