import express from 'express';
import net from 'node:net';
import dns from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fetchJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Speedora/1.0' } });
  if (!response.ok) throw new Error(`Сервис ответил кодом ${response.status}`);
  return response.json();
};
const validIp = (value) => typeof value === 'string' && net.isIP(value) !== 0;
const vpnCache = new Map();
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/ip-info', async (req, res) => {
  const ip = req.query.ip;
  if (!validIp(ip)) return res.status(400).json({ error: 'Некорректный IP-адрес' });
  try {
    const data = await fetchJson(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`);
    res.json({ ip: data.ip || ip, isp: typeof data.asn === 'string' ? data.asn : typeof data.company === 'string' ? data.company : data.asn?.org || data.company?.name || 'Не определён', city: data.location?.city || data.city || '', region: data.location?.state || data.region || '', country: data.location?.country || data.country || '', source: 'ipapi.is' });
  } catch (error) { res.status(502).json({ error: error.message }); }
});
app.get('/api/vpn', async (req, res) => {
  const ip = req.query.ip;
  if (!validIp(ip)) return res.status(400).json({ error: 'Некорректный IP-адрес' });
  const cached = vpnCache.get(ip);
  if (cached && cached.expires > Date.now()) return res.json(cached.value);
  try {
    const key = process.env.PROXYCHECK_API_KEY;
    const params = new URLSearchParams({ vpn: '1', asn: '1' });
    if (key) params.set('key', key);
    const data = await fetchJson(`https://proxycheck.io/v2/${encodeURIComponent(ip)}?${params}`);
    const entry = data[ip];
    if (data.status !== 'ok' || !entry) throw new Error(data.message || 'Данные недоступны');
    const value = { verdict: entry.proxy === 'yes' ? 'possible' : 'not_detected', type: entry.type || null, provider: entry.provider || null, source: 'proxycheck.io' };
    if (vpnCache.size > 500) vpnCache.delete(vpnCache.keys().next().value);
    vpnCache.set(ip, { value, expires: Date.now() + 6 * 60 * 60 * 1000 });
    res.json(value);
  } catch (error) { res.status(502).json({ error: error.message || 'Сервис VPN-проверки недоступен или исчерпан лимит запросов' }); }
});
app.get('/api/dns', async (req, res) => {
  const domain = String(req.query.domain || '').trim().toLowerCase();
  const type = String(req.query.type || 'A').toUpperCase();
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) || !['A','AAAA','MX','TXT','CNAME','NS'].includes(type)) return res.status(400).json({ error: 'Укажите корректный домен и тип записи' });
  try {
    const answers = await dns.resolve(domain, type);
    res.json({ records: answers.map((item) => ({ data: typeof item === 'string' ? item : Array.isArray(item) ? item.join(' ') : item.exchange ? `${item.priority} ${item.exchange}` : JSON.stringify(item) })), status: 0, source: 'DNS-резолвер сервера' });
  } catch (error) { res.status(502).json({ error: error.message }); }
});
app.use(express.static(path.join(root, 'dist')));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
app.listen(process.env.PORT || 3001, () => console.log(`Speedora API: http://localhost:${process.env.PORT || 3001}`));
