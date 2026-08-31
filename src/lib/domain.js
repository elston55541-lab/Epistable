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

export const FOOD_PRODUCTS = [
  {id:"spices",label:"Spices & Seasonings"},
  {id:"sauces",label:"Sauces, Condiments & Chutneys"},
  {id:"processed_fruit",label:"Processed Fruit, Pulps & Concentrates"},
  {id:"rte_rtc",label:"Ready-to-Eat / Ready-to-Cook"},
  {id:"frozen",label:"Frozen Processed Foods"},
  {id:"snacks_bakery",label:"Bakery, Confectionery & Snacks"},
  {id:"oils",label:"Oils, Fats & Processed Ingredients"},
  {id:"dehydrated",label:"Dehydrated Foods"},
  {id:"beverages",label:"Beverages & Concentrates"},
  {id:"ingredients",label:"Food Ingredients & Premixes"},
];

// Temporary backwards-compatible alias while the UI is migrated from stone terminology.
export const STONES = FOOD_PRODUCTS;

export const QUALITY_FLAGS = [
  {id:"microbiology",label:"Microbiology",color:C.red},
  {id:"pesticide",label:"Pesticide / Residue",color:C.amber},
  {id:"allergen",label:"Allergen",color:C.red},
  {id:"foreign_matter",label:"Foreign Matter",color:C.amber},
  {id:"moisture",label:"Moisture / Water Activity",color:C.blue2},
  {id:"spec_variance",label:"Specification Variance",color:C.amber},
  {id:"packaging",label:"Packaging / Labelling",color:C.purple},
];

// Temporary backwards-compatible alias while inspection screens are migrated.
export const DEFECTS = QUALITY_FLAGS;

export const GRADES = [
  {id:"Buyer Ready",label:"BUYER READY",color:C.green,bg:C.greenBg,border:C.greenBorder,emoji:"✓",price:0},
  {id:"Review",label:"REVIEW",color:C.amber,bg:C.amberBg,border:C.amberBorder,emoji:"!",price:0},
  {id:"Conditional",label:"CONDITIONAL",color:C.blue2,bg:C.blue2Bg,border:C.blue2Border,emoji:"~",price:0},
  {id:"Hold",label:"HOLD",color:C.red,bg:C.redBg,border:C.redBorder,emoji:"×",price:0},
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
export const lotQrUrl = lotId => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent("https://epistable.pages.dev/lot/"+lotId)}`;

// Temporary alias so existing certificate/report components keep working during conversion.
export const slabQrUrl = lotQrUrl;
