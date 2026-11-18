import { prisma } from '../config/prisma.js';
import { getSettings } from './settings.service.js';

const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const DAY = 24 * 60 * 60 * 1000;

const dayKey = (date) => date.toISOString().slice(0, 10);

export const getOverview = async (days) => {
  const settings = await getSettings();
  const since = new Date(Date.now() - (days - 1) * DAY);
  since.setUTCHours(0, 0, 0, 0);
  const previousSince = new Date(since.getTime() - days * DAY);

  const paidInRange = { status: { in: PAID_STATUSES }, paidAt: { gte: since } };

  const [current, previous, daily, topItems, toFulfil, customers, lowStock, outOfStock, recentOrders] =
    await Promise.all([
      prisma.order.aggregate({ where: paidInRange, _sum: { total: true }, _count: true }),
      prisma.order.aggregate({
        where: { status: { in: PAID_STATUSES }, paidAt: { gte: previousSince, lt: since } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT date_trunc('day', "paidAt")::date AS day, SUM(total)::int AS revenue, COUNT(*)::int AS orders
        FROM "Order"
        WHERE status::text = ANY(${PAID_STATUSES}) AND "paidAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
      prisma.orderItem.groupBy({
        by: ['name'],
        where: { order: paidInRange },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
      prisma.customer.count(),
      prisma.productVariant.count({
        where: {
          stock: { gt: 0, lte: settings.store.lowStockThreshold },
          product: { status: 'PUBLISHED' },
        },
      }),
      prisma.productVariant.count({ where: { stock: 0, product: { status: 'PUBLISHED' } } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, orderNumber: true, fullName: true, total: true, status: true, createdAt: true },
      }),
    ]);

  // Fill in days with no sales so the chart has an even time axis
  const byDay = new Map(daily.map((row) => [dayKey(new Date(row.day)), row]));
  const series = Array.from({ length: days }, (_, index) => {
    const key = dayKey(new Date(since.getTime() + index * DAY));
    const row = byDay.get(key);
    return { date: key, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 };
  });

  const revenue = current._sum.total ?? 0;
  const previousRevenue = previous._sum.total ?? 0;

  return {
    days,
    revenue,
    previousRevenue,
    orders: current._count,
    previousOrders: previous._count,
    averageOrder: current._count ? Math.round(revenue / current._count) : 0,
    toFulfil,
    customers,
    lowStock,
    outOfStock,
    series,
    topProducts: topItems.map((row) => ({ name: row.name, units: row._sum.quantity ?? 0 })),
    recentOrders,
  };
};
