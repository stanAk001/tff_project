import { prisma } from '../../config/prisma.js';
import { NEXT_STATUSES, orderInclude, updateOrderStatus } from '../../services/order.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, pageMeta } from '../../utils/respond.js';

const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

// ── Orders ───────────────────────────────────────────────────────────────

export const listOrders = async (req, res) => {
  const { q, status, page, limit } = req.valid.query;
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { payment: { select: { status: true } }, _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], _count: true }),
  ]);
  ok(
    res,
    rows.map(({ _count, ...order }) => ({ ...order, itemCount: _count.items })),
    { ...pageMeta(page, limit, total), counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) },
  );
};

const withNext = (order) => ({ ...order, nextStatuses: NEXT_STATUSES[order.status] });

export const getOrder = async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.valid.params.id }, include: orderInclude });
  if (!order) throw ApiError.notFound('That order no longer exists.');
  ok(res, withNext(order));
};

export const setOrderStatus = async (req, res) =>
  ok(res, withNext(await updateOrderStatus(req.valid.params.id, req.valid.body)));

// ── Customers ────────────────────────────────────────────────────────────

export const listCustomers = async (req, res) => {
  const { q, page, limit } = req.valid.query;
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true },
    }),
    prisma.customer.count({ where }),
  ]);

  const spend = await prisma.order.groupBy({
    by: ['customerId'],
    where: { customerId: { in: rows.map((row) => row.id) }, status: { in: PAID_STATUSES } },
    _sum: { total: true },
    _count: true,
  });
  const spendById = new Map(spend.map((row) => [row.customerId, row]));

  ok(
    res,
    rows.map((row) => ({
      ...row,
      orderCount: spendById.get(row.id)?._count ?? 0,
      totalSpent: spendById.get(row.id)?._sum.total ?? 0,
    })),
    pageMeta(page, limit, total),
  );
};

export const getCustomer = async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.valid.params.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      addresses: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNumber: true, total: true, status: true, createdAt: true },
      },
    },
  });
  if (!customer) throw ApiError.notFound('That customer no longer exists.');
  ok(res, customer);
};
