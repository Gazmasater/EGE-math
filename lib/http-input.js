'use strict';

const {isIP} = require('node:net');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function safeRedirectPath(value, fallback = '/') {
  const next = String(value || '').trim();
  if (!next.startsWith('/') || next.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(next)) return fallback;
  const url = new URL(next, 'https://local.invalid');
  // Normalization can itself produce // after removing a dot segment.
  if (url.origin !== 'https://local.invalid' || url.pathname.startsWith('//')) return fallback;
  return url.pathname + url.search + url.hash;
}

function readForm(req, maxBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0, failed = false;
    const fail = error => {
      if (failed) return;
      failed = true;
      chunks.length = 0;
      reject(error);
    };
    req.on('data', chunk => {
      if (failed) return;
      size += chunk.length;
      if (size > maxBytes) return fail(new HttpError(413, `Размер формы не должен превышать ${maxBytes / 1024} КБ.`));
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!failed) resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('aborted', () => fail(new HttpError(400, 'Передача формы прервана.')));
    req.on('error', fail);
  });
}

function clientAddress(req) {
  const peer = req.socket.remoteAddress || 'unknown';
  // The application listens on loopback behind one local reverse proxy. Nginx
  // must overwrite X-Forwarded-For or append the actual client address to it.
  if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer)) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim();
    if (isIP(forwarded)) return forwarded;
  }
  return peer;
}

function createRateLimiter({now = Date.now, maxEntries = 10000} = {}) {
  const windows = new Map();
  let nextSweep = 0;
  return (req, action, limit, windowMs) => {
    const time = now();
    if (time >= nextSweep || windows.size >= maxEntries) {
      for (const [key, entry] of windows) if (entry.expiresAt <= time) windows.delete(key);
      nextSweep = time + 60000;
    }
    const key = `${action}:${clientAddress(req)}`;
    const entry = windows.get(key);
    const recent = (entry?.times || []).filter(value => value > time - windowMs);
    if (recent.length >= limit || (!entry && windows.size >= maxEntries)) return true;
    recent.push(time);
    windows.set(key, {times: recent, expiresAt: time + windowMs});
    return false;
  };
}

module.exports = {HttpError, safeRedirectPath, readForm, createRateLimiter};
