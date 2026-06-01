import { useEffect, useRef, useState } from "react";
import { C } from "../lib/domain";
import { FONT_STACK, RADIUS, SHADOW, SPACE, TYPE } from "../lib/tokens";
import { Icon } from "./Icon";

export function OverflowMenu({ items = [], label = "More actions" }) {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    function onDoc(e) {
      if(ref.current && !ref.current.contains(e.target))setOpen(false);
    }
    document.addEventListener("mousedown",onDoc);
    return ()=>document.removeEventListener("mousedown",onDoc);
  },[]);

  return (
    <div ref={ref} style={{position:"relative",display:"inline-block"}}>
      <button
        type="button"
        onClick={()=>setOpen(o=>!o)}
        aria-label={label}
        style={{
          background:"transparent",border:`1px solid ${C.border}`,
          borderRadius:RADIUS.md,padding:"6px 8px",cursor:"pointer",
          display:"inline-flex",alignItems:"center",fontFamily:FONT_STACK,
        }}
      >
        <Icon name="more" size={14}/>
      </button>
      {open&&(
        <div style={{
          position:"absolute",right:0,top:"100%",marginTop:4,
          background:C.white,border:`1px solid ${C.border}`,
          borderRadius:RADIUS.md,boxShadow:SHADOW.raised,
          minWidth:180,zIndex:50,padding:SPACE.xs,
        }}>
          {items.map((it,i)=>(
            <button
              key={i}
              onClick={()=>{setOpen(false);it.onClick?.();}}
              disabled={it.disabled}
              style={{
                display:"block",width:"100%",textAlign:"left",
                padding:`${SPACE.sm}px ${SPACE.md}px`,background:"transparent",
                border:"none",borderRadius:RADIUS.sm,cursor:"pointer",
                fontFamily:FONT_STACK,fontSize:TYPE.label.size,
                color:it.tone==="danger"?C.red:C.text,
                opacity:it.disabled?0.5:1,
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
