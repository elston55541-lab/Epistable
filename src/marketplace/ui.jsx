import { useId } from "react";
import { Icon } from "../components/Icon";
import { Pill } from "../components/Pill";
import { COLOR, FONT_STACK, TYPE, SPACE, RADIUS, SHADOW, WEIGHT } from "../lib/tokens";

export const theme = {
  "--mp-font": FONT_STACK,
  ...Object.fromEntries(Object.entries(COLOR).map(([key,value])=>["--mp-"+key,value])),
  ...Object.fromEntries(Object.entries(SPACE).map(([key,value])=>["--mp-space-"+key,value+"px"])),
  ...Object.fromEntries(Object.entries(TYPE).map(([key,value])=>["--mp-type-"+key,value.size+"px"])),
  ...Object.fromEntries(Object.entries(RADIUS).map(([key,value])=>["--mp-radius-"+key,value+"px"])),
  "--mp-shadow": SHADOW.card, "--mp-medium": WEIGHT.medium, "--mp-bold": WEIGHT.bold,
};
export function Button({ children, variant="primary", icon, type="button", ...props }) {
  return <button type={type} className={"mp-button mp-button-"+variant} {...props}>{icon&&<Icon name={icon}/>}<span>{children}</span></button>;
}
export function Field({ label, hint, options, multiline, ...props }) {
  const id=useId();
  const common={id,...props,"aria-describedby":hint?id+"-hint":undefined};
  return <div className="mp-field"><label htmlFor={id}>{label}{props.required?" *":""}</label>
    {options?<select {...common}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>:
      multiline?<textarea rows={4} {...common}/>:<input {...common}/>}
    {hint&&<small id={id+"-hint"}>{hint}</small>}</div>;
}
export function Notice({children,error=false}) { return <div className={"mp-notice"+(error?" mp-error":"")} role={error?"alert":"status"}>{children}</div>; }
export function Empty({title,children,action,icon="package"}) {
  return <section className="mp-card mp-empty"><Icon name={icon} size={32}/><h2>{title}</h2><p>{children}</p>{action}</section>;
}
export function Heading({title,description,action}) {
  return <div className="mp-heading"><div><h1 tabIndex={-1} id="marketplace-title">{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>;
}
export function Status({value}) {
  return <Pill tone={value==="verified"||value==="accepted"?"success":value==="rejected"?"danger":value==="pending"?"warning":"neutral"}>{String(value||"unverified").replaceAll("_"," ")}</Pill>;
}
