export const C = {
  bg:"#f0f2f5", white:"#ffffff", surface:"#f8f9fb",
  primary:"#0057a8", primaryD:"#003f7a",
  primaryBg:"#e8f0fa", primaryBorder:"#b8d0f0",
  teal:"#0097a7",
  text:"#1a2533", textMid:"#4a5568", textDim:"#8896a4",
  border:"#e2e8f0",
  green:"#2e7d32", greenBg:"#e8f5e9", greenBorder:"#a5d6a7",
  red:"#c62828", redBg:"#ffebee", redBorder:"#ef9a9a",
  amber:"#b45309", amberBg:"#fffbeb", amberBorder:"#fcd34d",
  blue2:"#1565c0", blue2Bg:"#e3f2fd", blue2Border:"#90caf9",
  purple:"#6b21a8", purpleBg:"#f5f0ff", purpleBorder:"#d8b4fe",
  shadow:"0 1px 4px rgba(0,0,0,0.08)",
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
export const calcBill = (plan,scans) => {
  const p=PLANS[plan]||PLANS.Starter;
  const ov=Math.max(0,scans-p.scansIncluded);
  return {monthlyFee:p.monthlyFee,includedScans:p.scansIncluded,overageScans:ov,overageCharge:Math.round(ov*p.pricePerScan),pricePerScan:p.pricePerScan,total:p.monthlyFee+Math.round(ov*p.pricePerScan)};
};
export const gradeConf = g => GRADES.find(x=>x.id===g)||GRADES[1];
export const slabQrUrl = slabId => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent("https://epistable.pages.dev/slab/"+slabId)}`;
