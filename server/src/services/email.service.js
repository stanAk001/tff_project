import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

const naira = (amount) => `₦${Number(amount).toLocaleString('en-NG')}`;

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const layout = (heading, body) => `
  <div style="background:#f4f1ec;padding:40px 16px;font-family:Helvetica,Arial,sans-serif;color:#0c0c0c">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:40px 32px">
      <p style="font-family:Georgia,serif;font-size:28px;letter-spacing:-1px;margin:0 0 32px">TFF</p>
      <h1 style="font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0 0 16px">${heading}</h1>
      ${body}
    </div>
  </div>`;

// Emails never block or break the request that triggered them.
const send = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log(`[email] (SMTP not configured) To: ${to} — ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html });
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error.message);
  }
};

const itemsTable = (order) =>
  order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e6e2db">${escapeHtml(item.name)}<br>
          <span style="color:#77736d;font-size:13px">${escapeHtml(item.colour)} / ${escapeHtml(item.size)} × ${item.quantity}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #e6e2db;text-align:right">${naira(item.unitPrice * item.quantity)}</td>
      </tr>`,
    )
    .join('');

export const sendOrderConfirmation = (order) =>
  send({
    to: order.email,
    subject: `Order confirmed — ${order.orderNumber}`,
    html: layout(
      'Thank you. Your order is confirmed.',
      `<p style="line-height:1.6">Hi ${escapeHtml(order.fullName.split(' ')[0])}, we've received your payment and are preparing your pieces.</p>
       <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">${itemsTable(order)}
         <tr><td style="padding:8px 0">Delivery</td><td style="padding:8px 0;text-align:right">${order.deliveryFee ? naira(order.deliveryFee) : 'Free'}</td></tr>
         ${order.discountTotal ? `<tr><td style="padding:8px 0">Discount</td><td style="padding:8px 0;text-align:right">−${naira(order.discountTotal)}</td></tr>` : ''}
         <tr><td style="padding:8px 0"><strong>Total</strong></td><td style="padding:8px 0;text-align:right"><strong>${naira(order.total)}</strong></td></tr>
       </table>
       <p><a href="${env.clientUrl}/orders/${order.orderNumber}" style="color:#0c0c0c">Track your order</a></p>`,
    ),
  });

export const sendOrderShipped = (order) =>
  send({
    to: order.email,
    subject: `Your order is on its way — ${order.orderNumber}`,
    html: layout(
      'Your order has shipped.',
      `<p style="line-height:1.6">Your TFF order ${order.orderNumber} is on its way to ${escapeHtml(order.city)}.</p>
       ${order.trackingNumber ? `<p>Tracking number: <strong>${escapeHtml(order.trackingNumber)}</strong></p>` : ''}
       <p><a href="${env.clientUrl}/orders/${order.orderNumber}" style="color:#0c0c0c">Track your order</a></p>`,
    ),
  });

export const sendBackInStock = ({ email, product, variant }) =>
  send({
    to: email,
    subject: `Back in stock — ${product.name}`,
    html: layout(
      'It’s back.',
      `<p style="line-height:1.6">${escapeHtml(product.name)} in ${escapeHtml(variant.colour)} / ${escapeHtml(variant.size)} is available again. Pieces are limited.</p>
       <p><a href="${env.clientUrl}/products/${product.slug}" style="color:#0c0c0c">Shop now</a></p>`,
    ),
  });
