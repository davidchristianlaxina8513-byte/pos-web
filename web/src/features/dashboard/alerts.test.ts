import { describe, expect, it } from 'vitest';
import { attentionAlerts } from './alerts';

describe('attentionAlerts', () => {
  it('links each alert to its resolution page', () => {
    const alerts = attentionAlerts({
      soldOut: 1,
      almostSoldOut: 2,
      pendingPayments: 3,
      pendingTurnovers: 1,
      discrepancyTurnovers: 2,
    });
    expect(alerts.map((alert) => [alert.key, alert.href])).toEqual([
      ['sold_out', '/today-products'],
      ['almost_sold_out', '/today-products'],
      ['pending_payments', '/admin/reports?paymentStatus=pending_verification'],
      ['pending_turnovers', '/admin/cashier-operations#turnover'],
      ['discrepancy_turnovers', '/admin/cashier-operations#turnover'],
    ]);
  });
  it('keeps the existing messages with singular/plural forms', () => {
    const alerts = attentionAlerts({
      soldOut: 1,
      almostSoldOut: 2,
      pendingPayments: 1,
      pendingTurnovers: 2,
      discrepancyTurnovers: 1,
    });
    expect(alerts.map((alert) => alert.message)).toEqual([
      '1 product sold out today',
      '2 products almost sold out',
      '1 online payment pending verification',
      '2 cash turnovers pending verification',
      '1 cash turnover with a discrepancy',
    ]);
  });
  it('omits zero counts so only real problems alert', () => {
    expect(
      attentionAlerts({
        soldOut: 0,
        almostSoldOut: 0,
        pendingPayments: 0,
        pendingTurnovers: 0,
        discrepancyTurnovers: 0,
      }),
    ).toEqual([]);
  });
});
