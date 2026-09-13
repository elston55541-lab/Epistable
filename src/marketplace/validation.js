export const UNITS=['kg','tonne','carton','unit','litre'];
export const INCOTERMS=['EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF'];
export const list=value=>String(value||'').split(',').map(v=>v.trim()).filter(Boolean);
export function positive(value,label) {
  const raw=String(value).trim();
  if(!/^\d+(\.\d{1,6})?$/.test(raw)||Number(raw)<=0||Number(raw)>=1e12)throw new Error(label+' must be greater than zero, below one trillion, with at most six decimal places.');
  return raw;
}
export function quoteTotal(price,quantity) {
  const scaled=value=>{const [whole,fraction='']=positive(value,'Amount').split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));};
  const cents=(scaled(price)*scaled(quantity)+5000000000n)/10000000000n;
  return (cents/100n).toString()+'.'+(cents%100n).toString().padStart(2,'0');
}
export function futureDate(value,label) {
  const timestamp=Date.parse(value+'T23:59:59.999Z');
  if(!Number.isFinite(timestamp)||timestamp<=Date.now())throw new Error(label+' must be in the future.');
  return timestamp;
}
export function days(value) {
  if(value==='')return null;
  const n=Number(value);if(!Number.isInteger(n)||n<0||n>3650)throw new Error('Lead time must be a whole number from 0 to 3650 days.');return n;
}
