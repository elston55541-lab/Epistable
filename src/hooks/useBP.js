import { useEffect, useState } from "react";

export function useBP() {
  const [w,setW]=useState(typeof window==="undefined"?1024:window.innerWidth);
  useEffect(()=>{if(typeof window==="undefined")return;const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return {isMobile:w<640,isDesktop:w>=1024};
}
