// Every successful response has the same shape: { success, data, meta? }
export const ok = (res, data = null, meta) =>
  res.json({ success: true, data, ...(meta ? { meta } : {}) });

export const created = (res, data = null) => res.status(201).json({ success: true, data });

export const pageMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
});
