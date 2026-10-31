import type { Metrics } from './speed';
import { format } from './speed';

export function LineChart({ values, color = '#42cfff', label, height = 130 }: { values: number[]; color?: string; label: string; height?: number }) {
  const plot = values.length === 1 ? [values[0], values[0]] : values;
  const max = Math.max(1, ...plot);
  const points = plot.map((value, i) => `${(i / Math.max(1, plot.length - 1)) * 100},${88 - (value / max) * 72}`).join(' ');
  const area = `0,100 ${points} 100,100`;
  return <div className="chart-wrap" role="img" aria-label={label}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} aria-hidden="true">
      <defs><linearGradient id={`fill-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d="M0 25H100 M0 50H100 M0 75H100" stroke="#ffffff12" strokeWidth=".4" vectorEffect="non-scaling-stroke"/>
      <polygon points={area} fill={`url(#fill-${color.replace('#','')})`}/>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>;
}

export async function shareResult(metrics: Metrics) {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Не удалось создать изображение');
  const background = ctx.createLinearGradient(0, 0, 1200, 630); background.addColorStop(0, '#080b16'); background.addColorStop(1, '#111a35');
  ctx.fillStyle = background; ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = '#42cfff'; ctx.lineWidth = 3; ctx.strokeRect(36, 36, 1128, 558);
  ctx.fillStyle = '#42cfff'; ctx.font = '700 28px Arial'; ctx.fillText('SPEEDORA  /  SPEED TEST', 76, 100);
  ctx.fillStyle = '#fff'; ctx.font = '700 76px Arial'; ctx.fillText('Моё соединение', 76, 206);
  ctx.fillStyle = '#a9bad2'; ctx.font = '26px Arial'; ctx.fillText('Реальный тест до сети Cloudflare', 78, 252);
  const values = [{x:76,label:'DOWNLOAD',value:`${format(metrics.download)} Mbps`,color:'#42cfff'},{x:430,label:'UPLOAD',value:`${format(metrics.upload)} Mbps`,color:'#a58aff'},{x:784,label:'PING',value:`${format(metrics.ping,0)} ms`,color:'#72ddc3'}];
  for (const item of values) { ctx.fillStyle='#a9bad2';ctx.font='700 19px Arial';ctx.fillText(item.label,item.x,366);ctx.fillStyle=item.color;ctx.font='700 44px Arial';ctx.fillText(item.value,item.x,428); }
  ctx.fillStyle='#fff';ctx.font='700 27px Arial';ctx.fillText(`SPEEDORA SCORE  ${metrics.score ?? '—'} / 100`,76,535);
  ctx.fillStyle='#8895b3';ctx.font='18px Arial';ctx.fillText(metrics.testedAt ? new Date(metrics.testedAt).toLocaleString('ru-RU') : '',820,537);
  const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Не удалось сохранить изображение')),'image/png'));
  const file = new File([blob], 'speedora-result.png', {type:'image/png'});
  if (navigator.canShare?.({files:[file]})) { await navigator.share({files:[file],title:'Мой результат Speedora'}); return; }
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download=file.name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
