import { COLOR, SHADOW } from "./tokens";

export const C = {
  ...COLOR,
  primaryD: COLOR.primaryMid,
  teal: COLOR.accent,
  blue2: COLOR.blue,
  blue2Bg: COLOR.blueBg,
  blue2Border: COLOR.blueBorder,
  shadow: SHADOW.card,
};

export const STONES = [
  {id:"makrana",label:"Makrana White"},{id:"black",label:"Black Granite"},
  {id:"green",label:"Rainforest Green"},{id:"yellow",label:"Jaisalmer Yellow"},
  {id:"pink",label:"Udaipur Pink"},{id:"kota",label:"Kota Brown"},
  {id:"carrara",label:"Carrara White"},{id:"red",label:"Indian Red Granite"},
];

export const DEFECTS = [
  {id:"crack",label:"Crack",color:C.red},
  {id:"stain",label:"Stain",color:C.amber},{id:"pit",label:"Pitting",color:C.red},
  {id:"chip",label:"Edge Chip",color:C.amber},{id:"vein",label:"Vein Issue",color:C.blue2},
  {id:"polish",label:"Polish Issue",color:C.amber},{id:"thin",label:"Thin Spot",color:C.purple},
];

export const GRADES = [
  {id:"Premium",label:"PREMIUM",color:C.green,bg:C.greenBg,border:C.greenBorder,emoji:"🏆",price:850},
  {id:"Standard",label:"STANDARD",color:C.amber,bg:C.amberBg,border:C.amberBorder,emoji:"✅",price:480},
  {id:"Commercial",label:"COMMERCIAL",color:C.blue2,bg:C.blue2Bg,border:C.blue2Border,emoji:"🏢",price:320},
  {id:"Rejected",label:"REJECT",color:C.red,bg:C.redBg,border:C.redBorder,emoji:"❌",price:0},
];

export const PLANS = {
  Starter:{label:"Starter",scansIncluded:100,pricePerScan:5,monthlyFee:299},
  Pro:{label:"Pro",scansIncluded:500,pricePerScan:3,monthlyFee:999},
  Enterprise:{label:"Enterprise",scansIncluded:2000,pricePerScan:1.5,monthlyFee:2999},
};

export const genId = p => p+"-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
export const fmtT = ts => new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
export const fmtD = ts => new Date(ts).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
export const curMon = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
export const fmtMoney = (n, { compact = false } = {}) => {
  const v = Number(n) || 0;
  if (compact && v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
export const calcBill = (plan,scans) => {
  const p=PLANS[plan]||PLANS.Starter;
  const ov=Math.max(0,scans-p.scansIncluded);
  return {monthlyFee:p.monthlyFee,includedScans:p.scansIncluded,overageScans:ov,overageCharge:Math.round(ov*p.pricePerScan),pricePerScan:p.pricePerScan,total:p.monthlyFee+Math.round(ov*p.pricePerScan)};
};
export const gradeConf = g => GRADES.find(x=>x.id===g)||GRADES[1];
export const slabQrUrl = slabId => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent("https://epistable.pages.dev/slab/"+slabId)}`;
