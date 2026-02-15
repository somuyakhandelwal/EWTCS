"use client";
import { useState, useEffect } from "react";

type SK = "admitted"|"assessment"|"tests"|"awaiting"|"decision"|"discharged"|"alert"|"available";
type T  = { bg:string;surface:string;card:string;text:string;sub:string;muted:string;divider:string;accent:string;accentBg:string;panelBg:string };
type Bed= { id:string;num:number;zone:string;stage:SK;patient:{id:string;name:string;age:number;at:number;cc:string}|null;nurse:string|null };

const P={peach:"#FFBB94",rose:"#FB9590",crimson:"#DC586D",berry:"#A33757",wine:"#852E4E",plum:"#4C1D3D"};
const TH:T={bg:"#F9E0E0",surface:"#ffffff",card:"#ffffff",text:P.plum,sub:P.wine,muted:P.berry,divider:"#f3d5d0",accent:P.crimson,accentBg:"#fce8ec",panelBg:"#ffffff"};
const S:Record<SK,{label:string;c:string;bg:string;b:string;dot:string}>={
  admitted:   {label:"Patient Admitted",  c:P.wine,    bg:"#fff0eb", b:"#FFBB94", dot:P.peach   },
  assessment: {label:"Under Assessment",  c:P.berry,   bg:"#fde8ec", b:"#FB9590", dot:P.rose    },
  tests:      {label:"Tests Ordered",     c:"#1d4ed8",  bg:"#dbeafe", b:"#93c5fd", dot:"#3b82f6" },
  awaiting:   {label:"Awaiting Results",  c:"#6d28d9",  bg:"#ede9fe", b:"#c4b5fd", dot:"#8b5cf6" },
  decision:   {label:"Decision Made",     c:"#15803d",  bg:"#dcfce7", b:"#86efac", dot:"#22c55e" },
  discharged: {label:"Discharged",        c:"#475569",  bg:"#f1f5f9", b:"#cbd5e1", dot:"#94a3b8" },
  alert:      {label:"TIME ALERT >3h",    c:P.wine,    bg:"#fce8ec", b:P.crimson,  dot:P.crimson },
  available:  {label:"Available",         c:P.berry,   bg:"#fdf4f0", b:"#f8c4cc", dot:P.rose    },
};
const NL=["RN Miller","RN Okafor","RN Tanaka","RN Dubois","RN Reyes","RN Santos","RN Patel"];
const NAMES=["Sarah Chen","James Williams","Priya Patel","Mohammed Hassan","Elena Novak","Carlos Rivera","Aisha Johnson","David Kim","Liu Wei","Maria Santos","Kenji Ito","Fatima Al-Said","Tom Baker","Nina Ross","Omar Farouk","Lucy Grant"];
const COMP=["Chest pain","Dyspnoea","Abd. pain","Head trauma","Sepsis","Stroke sx","Anaphylaxis","Laceration","MI","Syncope","Fracture","Burns","Seizure","Overdose","Back pain"];
const LAYOUT:[SK,string][]=[
  ["available","A"],["admitted","A"],["assessment","A"],["tests","A"],["awaiting","A"],["decision","A"],["discharged","A"],["alert","A"],
  ["alert","Resus"],["alert","Resus"],["admitted","Resus"],["assessment","Resus"],
  ["available","B"],["admitted","B"],["assessment","B"],["tests","B"],["awaiting","B"],["decision","B"],["discharged","B"],["alert","B"],["available","B"],["tests","B"],
  ["available","C"],["admitted","C"],["assessment","C"],["tests","C"],["awaiting","C"],["decision","C"],["discharged","C"],["available","C"],["alert","C"],["assessment","C"],
  ["available","D"],["admitted","D"],["tests","D"],["awaiting","D"],["decision","D"],["discharged","D"],["available","D"],["assessment","D"],
];
const r=<X,>(a:X[]):X=>a[Math.floor(Math.random()*a.length)];
const mkP=()=>({id:`PT-${10000+Math.floor(Math.random()*90000)}`,name:r(NAMES),age:18+Math.floor(Math.random()*72),at:Date.now()-Math.floor(Math.random()*18000000),cc:r(COMP)});
const hms=(ms:number)=>{const t=Math.floor(ms/1000),h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60,p=(n:number)=>String(n).padStart(2,"0");return h?`${p(h)}:${p(m)}:${p(s)}`:`${p(m)}:${p(s)}`;};

// ── DATA LAYER — swap body: const res=await fetch("/api/beds"); return res.json();
const fetchBeds=async():Promise<Bed[]>=>LAYOUT.map(([stage,zone],i)=>{const hp=stage!=="available"&&stage!=="discharged";const p=hp?mkP():null;const over=!!(p&&Date.now()-p.at>10800000);const st:SK=over&&stage!=="alert"&&hp?"alert":stage;return{id:`b${i}`,num:i+1,zone,stage:st,patient:p,nurse:hp?r([...NL,null]):null};});

const BedSVG=({c,has}:{c:string;has:boolean})=>(
  <svg viewBox="0 0 80 50" width="68" height="43" style={{display:"block",margin:"0 auto",flexShrink:0}}>
    <rect x="4" y="10" width="72" height="34" rx="4" fill={c+"28"} stroke={c} strokeWidth="1.5" opacity="0.7"/><rect x="4" y="8" width="13" height="36" rx="3" fill={c} opacity="0.85"/><rect x="63" y="10" width="13" height="32" rx="3" fill={c} opacity="0.5"/><rect x="18" y="12" width="44" height="30" rx="2" fill={c+"18"} stroke={c} strokeWidth="0.8" opacity="0.4"/><rect x="19" y="13" width="13" height="10" rx="3" fill={c} opacity="0.22"/>
    {([[6,44],[11,44],[63,44],[68,44]]as[number,number][]).map(([x,y],i)=><rect key={i} x={x} y={y} width="4" height="5" rx="1" fill={c} opacity="0.5"/>)}
    <line x1="18" y1="19" x2="18" y2="41" stroke={c} strokeWidth="1" strokeDasharray="2,2" opacity="0.3"/><line x1="62" y1="19" x2="62" y2="41" stroke={c} strokeWidth="1" strokeDasharray="2,2" opacity="0.3"/><line x1="9" y1="9" x2="9" y2="2" stroke={c} strokeWidth="1.5" opacity="0.7"/><circle cx="9" cy="2" r="2.5" fill={c} opacity="0.7"/>
    {has&&<g><ellipse cx="27" cy="18" rx="6" ry="6" fill={c} opacity="0.6"/><rect x="22" y="22" width="32" height="14" rx="5" fill={c} opacity="0.3"/></g>}
  </svg>
);

const Card=({bed,sel,now,onClick}:{bed:Bed;sel:boolean;now:number;onClick:()=>void})=>{
  const cfg=S[bed.stage],el=bed.patient?now-bed.patient.at:0,ia=bed.stage==="alert";
  return(<button onClick={onClick} style={{display:"flex",flexDirection:"column",cursor:"pointer",background:sel?cfg.bg:"#fff",border:`2px solid ${sel?cfg.dot:ia?cfg.b:"#f3d5d0"}`,borderRadius:14,padding:"10px 8px 9px",transition:"all 0.18s",transform:sel?"scale(1.03)":"scale(1)",boxShadow:ia?`0 0 0 3px ${cfg.b},0 4px 16px rgba(76,29,61,0.18)`:sel?`0 6px 20px rgba(76,29,61,0.18)`:`0 2px 8px rgba(76,29,61,0.12)`,animation:ia?"pb 2s ease-in-out infinite":"none",width:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:P.wine,letterSpacing:"0.1em",fontWeight:700}}>{bed.zone}-{String(bed.num).padStart(2,"0")}</span>
      <span style={{width:9,height:9,borderRadius:"50%",background:cfg.dot,boxShadow:ia?`0 0 8px ${cfg.dot}`:"none",animation:ia?"dt 1s ease-in-out infinite":"none",flexShrink:0}}/>
    </div>
    <BedSVG c={cfg.dot} has={!!bed.patient}/>
    <div style={{textAlign:"center",marginTop:7,marginBottom:4}}>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:ia?P.crimson:bed.patient?cfg.c:P.berry,display:"block",lineHeight:1}}>{bed.patient?hms(el):"— —"}</span>
      {ia&&<span style={{fontSize:8,color:P.crimson,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginTop:2}}>⚠ DELAY</span>}
    </div>
    <span style={{display:"block",textAlign:"center",fontSize:8,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase",color:cfg.c,background:cfg.bg,border:`1px solid ${cfg.b}`,padding:"3px 5px",borderRadius:5,marginBottom:4,lineHeight:"1.3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cfg.label}</span>
    <p style={{fontSize:10,color:bed.patient?P.plum:P.berry,fontWeight:bed.patient?600:400,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",margin:0,fontStyle:bed.patient?"normal":"italic"}}>{bed.patient?bed.patient.name.split(" ")[0]:bed.stage==="discharged"?"Discharged":"Ready"}</p>
  </button>);
};

const Panel=({bed,now,onStage,onNurse,onClose}:{bed:Bed;now:number;onStage:(id:string,s:SK)=>void;onNurse:(id:string,n:string|null)=>void;onClose:()=>void})=>{
  const cfg=S[bed.stage],el=bed.patient?now-bed.patient.at:0;
  const [mode,setMode]=useState<"stage"|"nurse"|null>(null);
  const DR=({l,v,a,m}:{l:string;v:string;a?:string;m?:boolean})=>(<div style={{display:"flex",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:"1px solid #f3d5d0"}}><span style={{color:P.berry,fontSize:12}}>{l}</span><span style={{color:a??P.plum,fontSize:12,fontWeight:600,fontFamily:m?"'Space Mono',monospace":"inherit"}}>{v}</span></div>);
  return(
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(300px,90vw)",background:"#fff",borderLeft:"1px solid #f3d5d0",display:"flex",flexDirection:"column",zIndex:50,boxShadow:`-16px 0 48px rgba(76,29,61,0.15)`,animation:"si 0.22s ease-out"}}>
      <div style={{padding:"18px 20px",borderBottom:"1px solid #f3d5d0",background:cfg.bg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div><p style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:P.berry,letterSpacing:"0.18em",margin:0}}>{bed.zone} · BED {String(bed.num).padStart(2,"00")}</p><h3 style={{color:cfg.c,fontSize:17,fontWeight:700,margin:"4px 0 0"}}>{cfg.label}</h3></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:P.berry,fontSize:20,cursor:"pointer",lineHeight:1,padding:2}}>✕</button>
        </div>
        <BedSVG c={cfg.dot} has={!!bed.patient}/>
        {bed.patient&&<div style={{marginTop:10,textAlign:"center"}}><p style={{fontFamily:"'Space Mono',monospace",fontSize:24,fontWeight:700,color:cfg.c,margin:0}}>{hms(el)}</p><p style={{color:P.berry,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginTop:3}}>{bed.stage==="alert"?"⚠ Over 3 hours":"Time in ED"}</p></div>}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {bed.patient?(<><p style={{fontSize:10,color:P.berry,letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Patient</p><DR l="Name" v={bed.patient.name}/><DR l="ID" v={bed.patient.id} m/><DR l="Age" v={`${bed.patient.age} yrs`}/><DR l="Complaint" v={bed.patient.cc}/></>):(<div style={{background:"#fdf4f0",borderRadius:10,padding:"18px",textAlign:"center",border:"1px solid #f3d5d0"}}><p style={{color:P.berry,fontSize:13}}>No patient assigned</p></div>)}
        <p style={{fontSize:10,color:P.berry,letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700,margin:"16px 0 8px"}}>Bed Info</p>
        <DR l="Zone" v={bed.zone}/><DR l="Stage" v={cfg.label} a={cfg.c}/><DR l="Nurse" v={bed.nurse??"Unassigned"}/>
        {mode==="stage"&&<div style={{marginTop:14}}><p style={{fontSize:10,color:P.berry,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Select Stage</p>
          {(Object.entries(S)as[SK,typeof S[SK]][]).map(([k,v])=><button key={k} onClick={()=>{onStage(bed.id,k);setMode(null);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 11px",borderRadius:9,border:`1.5px solid ${bed.stage===k?v.dot:"#f3d5d0"}`,background:bed.stage===k?v.bg:"#fff",cursor:"pointer",marginBottom:6,transition:"all 0.12s"}}><span style={{width:10,height:10,borderRadius:"50%",background:v.dot,flexShrink:0}}/><span style={{fontSize:12,fontWeight:600,color:bed.stage===k?v.c:P.wine,flex:1,textAlign:"left"}}>{v.label}</span>{bed.stage===k&&<span style={{fontSize:11,color:v.c,fontWeight:700}}>✓</span>}</button>)}
          <button onClick={()=>setMode(null)} style={{width:"100%",padding:"8px",borderRadius:9,border:"1px solid #f3d5d0",background:"transparent",color:P.berry,fontSize:12,cursor:"pointer",marginTop:4}}>Cancel</button>
        </div>}
        {mode==="nurse"&&<div style={{marginTop:14}}><p style={{fontSize:10,color:P.berry,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Assign Nurse</p>
          {([...NL,null]as(string|null)[]).map(n=><button key={n??"u"} onClick={()=>{onNurse(bed.id,n);setMode(null);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 11px",borderRadius:9,border:`1.5px solid ${bed.nurse===n?P.crimson:"#f3d5d0"}`,background:bed.nurse===n?"#fce8ec":"#fff",cursor:"pointer",marginBottom:6,transition:"all 0.12s"}}><span style={{width:30,height:30,borderRadius:"50%",background:"#fce8ec",border:`1.5px solid ${P.crimson}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:P.crimson,flexShrink:0}}>{n?n.split(" ")[1][0]:"-"}</span><span style={{fontSize:12,fontWeight:600,color:bed.nurse===n?P.crimson:P.wine}}>{n??"Unassigned"}</span>{bed.nurse===n&&<span style={{marginLeft:"auto",fontSize:11,color:P.crimson,fontWeight:700}}>✓</span>}</button>)}
          <button onClick={()=>setMode(null)} style={{width:"100%",padding:"8px",borderRadius:9,border:"1px solid #f3d5d0",background:"transparent",color:P.berry,fontSize:12,cursor:"pointer",marginTop:4}}>Cancel</button>
        </div>}
      </div>
      {!mode&&<div style={{padding:"14px 20px",borderTop:"1px solid #f3d5d0",display:"flex",flexDirection:"column",gap:10}}>
        <button onClick={()=>setMode("stage")} style={{padding:"11px",borderRadius:10,background:`linear-gradient(135deg,${P.crimson},${P.wine})`,border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>⟳ Update Status</button>
        <button onClick={()=>setMode("nurse")} style={{padding:"11px",borderRadius:10,background:"#fdf4f0",border:"1.5px solid #f3d5d0",color:P.wine,fontSize:13,fontWeight:600,cursor:"pointer"}}>＋ Assign Nurse</button>
      </div>}
    </div>
  );
};

export default function BedDashboard(){
  const [beds,setBeds]=useState<Bed[]>([]);
  const [loading,setLoading]=useState(true);
  const [sel,setSel]=useState<string|null>(null);
  const [filter,setFilter]=useState<SK|"all">("all");
  const [now,setNow]=useState<number>(Date.now());
  useEffect(()=>{fetchBeds().then(d=>{setBeds(d);setLoading(false);});const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
  const selBed=beds.find(b=>b.id===sel)??null;
  const stats={total:beds.length,free:beds.filter(b=>b.stage==="available").length,alert:beds.filter(b=>b.stage==="alert").length,occ:beds.filter(b=>b.stage!=="available"&&b.stage!=="discharged").length};
  const shown=filter==="all"?beds:beds.filter(b=>b.stage===filter);
  return(<>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;overflow:hidden;background:#F9E0E0}@keyframes pb{0%,100%{box-shadow:0 0 0 0 rgba(220,88,109,0.4)}50%{box-shadow:0 0 0 10px rgba(220,88,109,0)}}@keyframes dt{0%,100%{opacity:1}50%{opacity:0.25}}@keyframes si{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes fu{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.35);border-radius:4px}.bed-grid{display:grid;gap:10px;align-content:start;grid-template-columns:repeat(6,1fr)}.filter-bar{padding:8px 28px;display:flex;gap:7px;overflow-x:auto;align-items:center}.hdr{padding:14px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}.stat-row{display:flex;gap:36px}@media(max-width:1200px){.bed-grid{grid-template-columns:repeat(5,1fr)}}@media(max-width:960px){.bed-grid{grid-template-columns:repeat(4,1fr)}.hdr{padding:12px 16px}.filter-bar{padding:7px 16px}.stat-row{gap:20px}}@media(max-width:700px){.bed-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:480px){.bed-grid{grid-template-columns:repeat(2,1fr)}.stat-row{gap:12px}}`}</style>
    <div style={{height:"100vh",background:"#F9E0E0",display:"flex",flexDirection:"column",animation:"fu 0.3s ease",overflow:"hidden"}}>
      <header style={{flexShrink:0,background:`linear-gradient(135deg,${P.wine} 0%,${P.plum} 100%)`,boxShadow:"0 2px 16px rgba(76,29,61,0.3)"}}>
        <div className="hdr">
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div style={{width:42,height:42,borderRadius:12,background:"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,187,148,0.4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={P.peach} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
              <div><p style={{color:"#fff",fontSize:18,fontWeight:700,lineHeight:1,letterSpacing:"-0.01em"}}>Emergency Ward</p><p style={{color:P.rose,fontSize:11,marginTop:4,letterSpacing:"0.06em",opacity:0.85}}>BED MANAGEMENT SYSTEM</p></div>
            </div>
            <div style={{width:1,height:34,background:"rgba(255,255,255,0.15)",margin:"0 4px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{width:9,height:9,borderRadius:"50%",background:P.peach,boxShadow:`0 0 0 3px rgba(255,187,148,0.3)`,animation:"dt 2.5s ease-in-out infinite"}}/><span style={{color:P.peach,fontSize:12,fontWeight:600,letterSpacing:"0.08em"}}>LIVE</span></div>
          </div>
          <div className="stat-row">
            {([["Total Beds",stats.total,"#fff"],["Available",stats.free,P.peach],["Occupied",stats.occ,P.rose],["Alerts",stats.alert,P.crimson]]as[string,number,string][]).map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}><p style={{fontFamily:"'Space Mono',monospace",color:c,fontSize:28,fontWeight:700,lineHeight:1}}>{v}</p><p style={{color:"rgba(251,149,144,0.8)",fontSize:11,fontWeight:500,marginTop:4,letterSpacing:"0.05em"}}>{l}</p></div>
            ))}
          </div>
          <div style={{textAlign:"right"}}><p style={{fontFamily:"'Space Mono',monospace",color:"#fff",fontSize:20,fontWeight:700}}>{new Date(now).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</p><p style={{color:P.rose,fontSize:11,marginTop:3,opacity:0.8}}>All timers live</p></div>
        </div>
      </header>
      <div className="filter-bar" style={{flexShrink:0,background:"#ffffff",borderBottom:"1px solid #f3d5d0",boxShadow:"0 1px 0 #f3d5d0"}}>
        <span style={{color:P.wine,fontSize:11,fontWeight:700,flexShrink:0,marginRight:6}}>Stage:</span>
        {(["all",...Object.keys(S)]as(SK|"all")[]).map(s=>{const a=filter===s,cfg2=s==="all"?null:S[s as SK];const c=cfg2?cfg2.dot:P.peach;return(<button key={s} onClick={()=>setFilter(s)} style={{flexShrink:0,padding:"5px 13px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",border:a?`1.5px solid ${c}`:`1px solid #f3d5d0`,background:a?(cfg2?cfg2.bg:"#fce8ec"):"transparent",color:a?(cfg2?cfg2.c:P.crimson):P.berry,transition:"all 0.15s",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>{cfg2&&<span style={{width:7,height:7,borderRadius:"50%",background:cfg2.dot,flexShrink:0}}/>}{s==="all"?"All Beds":cfg2!.label}</button>);})}
      </div>
      <main style={{flex:1,overflowY:"auto",padding:"14px 16px",paddingRight:sel?"calc(300px + 16px)":16,transition:"padding-right 0.22s ease"}}>
        {loading?(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:P.wine,fontSize:15}}>Loading beds…</div>):(
          <div className="bed-grid">
            {shown.map(bed=><Card key={bed.id} bed={bed} sel={sel===bed.id} now={now} onClick={()=>setSel(p=>p===bed.id?null:bed.id)}/>)}
            {shown.length===0&&<p style={{gridColumn:"1/-1",color:P.wine,textAlign:"center",padding:48,fontSize:15}}>No beds match this filter.</p>}
          </div>)}
      </main>
      <footer style={{flexShrink:0,background:"#ffffff",borderTop:"1px solid #f3d5d0",padding:"8px 16px",display:"flex",flexWrap:"wrap",gap:"6px 18px",alignItems:"center"}}>
        {(Object.entries(S)as[SK,typeof S[SK]][]).map(([k,v])=><div key={k} style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:v.dot,flexShrink:0}}/><span style={{color:P.wine,fontSize:11,fontWeight:500}}>{v.label}</span></div>)}
      </footer>
    </div>
    {selBed&&<Panel key={selBed.id} bed={selBed} now={now} onStage={(id,s)=>setBeds(p=>p.map(b=>b.id===id?{...b,stage:s}:b))} onNurse={(id,n)=>setBeds(p=>p.map(b=>b.id===id?{...b,nurse:n}:b))} onClose={()=>setSel(null)}/>}
  </>);
}