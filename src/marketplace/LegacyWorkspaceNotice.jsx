import { COLOR, FONT_STACK, SPACE, TYPE, WEIGHT } from '../lib/tokens';

export function LegacyWorkspaceNotice() {
  return <aside aria-label="Legacy factory workspace" style={{background:COLOR.primaryBg,color:COLOR.text,fontFamily:FONT_STACK,fontSize:TYPE.body.size,lineHeight:TYPE.body.lineHeight,padding:SPACE.base,display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:SPACE.md}}>
    <div><strong style={{fontWeight:WEIGHT.bold}}>Legacy factory workspace</strong><div>Existing factory operations and stone records.</div></div>
    <a href="/" style={{color:COLOR.primaryMid,fontWeight:WEIGHT.medium,padding:SPACE.sm}}>Open Food &amp; Agri marketplace</a>
  </aside>;
}
