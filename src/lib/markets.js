export const EXPORT_MARKETS = [
  {value:"EU",label:"European Union",short:"EU"},
  {value:"US",label:"United States",short:"US"},
  {value:"GB",label:"United Kingdom",short:"UK"},
  {value:"AE",label:"UAE / Gulf",short:"UAE"},
  {value:"CN",label:"China",short:"China"},
  {value:"JP",label:"Japan",short:"Japan"},
  {value:"BD",label:"Bangladesh",short:"BD"},
  {value:"MV",label:"Maldives",short:"MV"},
];

export const marketConf = code => EXPORT_MARKETS.find(m=>m.value===code) || {value:code,label:code,short:code};
