/* ════════════════════════════════════════════════
   app.js — Outlier Party Game
════════════════════════════════════════════════ */
const { useState, useReducer, useEffect, useRef, useCallback, memo } = React;

/* ── Player colours ── */
const COLORS = [
  '#F59E0B','#EF4444','#3B82F6','#10B981',
  '#A855F7','#F97316','#06B6D4','#EC4899',
  '#84CC16','#6366F1',
];

const MODES = [
  { id:'clueless',    emoji:'🤷', name:'Clueless',     color:'#3B82F6', tagline:'Nobody knows — not even the outlier' },
  { id:'undercover',  emoji:'🕵️', name:'Undercover',   color:'#F59E0B', tagline:'The outlier knows — can they blend in?' },
  { id:'doublecross', emoji:'🎭', name:'Double Cross', color:'#EF4444', tagline:'Two outliers, neither knows the other exists' },
  { id:'reverse',     emoji:'🔄', name:'Reverse',      color:'#10B981', tagline:'Find the pair — two players share the same word' },
];

const MODIFIERS = [
  { id:'numbers',    emoji:'🔢', label:'Numbers Only',        rule:'Your answer must only contain numbers.' },
  { id:'emojis',     emoji:'😏', label:'Emojis Only',         rule:'Your answer must only use emojis. No words.' },
  { id:'specific',   emoji:'🔬', label:'Oddly Specific',      rule:'Be as specific as humanly possible.' },
  { id:'vague',      emoji:'🌫️', label:'Stay Vague',          rule:'Be as vague as possible — no names, no details.' },
  { id:'oneword',    emoji:'1️⃣',  label:'One Word',            rule:'Your entire answer must be exactly one word.' },
  { id:'threewords', emoji:'3️⃣',  label:'Three Words',         rule:'Your answer must be exactly three words. No more, no less.' },
  { id:'allcaps',    emoji:'📢', label:'All Caps',             rule:'WRITE YOUR ENTIRE ANSWER IN ALL CAPS.' },
  { id:'question',   emoji:'❓', label:'Answer in a Question', rule:'Your answer must be phrased as a question. Jeopardy-style.' },
  { id:'thirdperson',emoji:'🫵', label:'Third Person',        rule:'Refer to yourself in the third person. No "I" or "me".' },
  { id:'novowels',   emoji:'🚫', label:'No Vowels',            rule:'Write your answer without any vowels. Cnsnnnts nly.' },
  { id:'movietitle', emoji:'🎬', label:'Movie Title',          rule:'Format your answer like a movie title. Capitalise Each Word.' },
  { id:'rhyme',      emoji:'🎵', label:'Make It Rhyme',        rule:'Your answer must rhyme — at least the last two words.' },
];

const QUESTION_PACKS = [
  { id:'main',         label:'Classic',      emoji:'🎲', file:'questions/Main.JSON',        desc:'Everyday questions about you', count:52 },
  { id:'players',      label:'About Us',     emoji:'👥', file:'questions/Players.JSON',      desc:'Questions featuring a player in the room', count:54, hasPlayer:true },
  { id:'hypothetical', label:'Hypothetical', emoji:'🤔', file:'questions/Hypothetical.JSON', desc:'What would you do if…', count:64 },
  { id:'deep',         label:'Deep Cuts',    emoji:'💭', file:'questions/Deep.JSON',         desc:'Meaningful & introspective', count:64 },
  { id:'spicy',        label:'Spicy',        emoji:'🌶️', file:'questions/Spicy.JSON',        desc:'Unpopular opinions & hot takes', count:62, notice:'Not NSFW — just unpopular opinions & takes people might disagree with.' },
  { id:'nostalgia',    label:'Nostalgia',    emoji:'📼', file:'questions/Nostalgia.JSON',    desc:'Childhood memories & throwbacks', count:79 },
  { id:'numbers',      label:'Numbers',      emoji:'🔢', file:'questions/Numbers.JSON',      desc:'All answers are numbers', count:57 },
  { id:'sentences',    label:'Sentences',    emoji:'✏️', file:'questions/Sentences.JSON',    desc:'Complete the sentence', count:89 },
  { id:'reverse',      label:'Reverse',      emoji:'🔄', file:'questions/Reverse.JSON',      desc:'One word prompt — write a question for it', count:20 },
];

const ANSWER_CHAR_LIMIT = 80;
const EMPTY_VARIANTS = Array(10).fill('');
const MIN_PLAYERS = 4;

/* ══════════════════════════════════════════════
   THEME — warm amber / terracotta
   Completely different from the cold purple/indigo
   theme that came before.
══════════════════════════════════════════════ */
const DARK = {
  bg:'#0F0B07', cardSolid:'#1C1409',
  surface:'rgba(255,225,150,0.04)', surfaceHi:'rgba(255,225,150,0.07)',
  border:'rgba(255,220,130,0.08)', borderHi:'rgba(255,220,130,0.16)',
  text:'#F5E6C8', textMid:'rgba(245,230,200,0.55)', textDim:'rgba(245,230,200,0.30)',
  r:16, rl:22, rx:28, isDark:true,
  titleGrad:'linear-gradient(135deg,#FBBF24 0%,#F97316 45%,#EF4444 100%)',
  btnGrad:'linear-gradient(135deg,#D97706 0%,#DC2626 100%)',
  btnGradShadow:'rgba(217,119,6,0.45)',
  shadow:'none',
};
const LIGHT = {
  bg:'#FAF5ED', cardSolid:'#FFFDF7',
  surface:'rgba(255,255,255,0.72)', surfaceHi:'rgba(255,255,255,0.92)',
  border:'rgba(120,70,10,0.11)', borderHi:'rgba(120,70,10,0.22)',
  text:'#2A1A08', textMid:'rgba(42,26,8,0.58)', textDim:'rgba(42,26,8,0.40)',
  r:16, rl:22, rx:28, isDark:false,
  titleGrad:'linear-gradient(135deg,#B45309 0%,#C2410C 45%,#B91C1C 100%)',
  btnGrad:'linear-gradient(135deg,#B45309 0%,#B91C1C 100%)',
  btnGradShadow:'rgba(180,83,9,0.4)',
  shadow:'none',
};

function makeS(T) {
  return {
    page:{ minHeight:'100vh', background:T.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 18px 40px', position:'relative', overflow:'hidden', transition:'background .3s' },
    card:{ width:'100%', maxWidth:468, background:'transparent', boxShadow:T.shadow },
    lbl:{ color:T.textDim, fontSize:10, letterSpacing:2.5, textTransform:'uppercase', display:'block', marginBottom:10, fontWeight:700 },
    inp:{ width:'100%', background:T.isDark?T.surface:'rgba(255,255,255,0.9)', border:`1px solid ${T.border}`, borderRadius:T.r, padding:'13px 16px', color:T.text, fontSize:15, outline:'none', fontFamily:'inherit', transition:'border-color .18s, box-shadow .18s' },
  };
}
function makeD(T) {
  return {
    btn:(col, ghost=false, sm=false, dis=false) => ({
      display:'block', width:'100%', padding:sm?'11px 16px':'15px 20px',
      borderRadius:sm?13:16, border:ghost?`1.5px solid ${col}55`:'none',
      background:ghost?'transparent':col==='grad'?T.btnGrad:`linear-gradient(135deg,${col} 0%,${col}cc 100%)`,
      color:ghost?col:'#fff', fontSize:sm?13:15, fontWeight:800, letterSpacing:0.3,
      textShadow:ghost?'none':'0 1px 6px rgba(0,0,0,.35)',
      boxShadow:dis||ghost?'none':col==='grad'?`0 4px 22px ${T.btnGradShadow}`:`0 4px 22px ${col}44`,
      opacity:dis?.28:1, cursor:dis?'not-allowed':'pointer',
      transition:'opacity .15s, transform .12s', fontFamily:'inherit',
    }),
    avatar:(color, size=36) => ({
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:color+'18', border:`1.5px solid ${color}55`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:Math.floor(size*.38), fontWeight:800, color,
    }),
    pill:(color, sel) => ({
      display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
      borderRadius:T.rl, border:`1px solid ${sel?color+'55':T.border}`,
      background:sel?color+'12':T.surface,
      boxShadow:sel?`0 0 0 1px ${color}28,0 6px 24px ${color}18`:'none',
      transition:'all .2s', textAlign:'left', width:'100%', fontFamily:'inherit', cursor:'pointer',
    }),
  };
}

function haptic(p) { try { if(navigator.vibrate) navigator.vibrate(p); } catch(_){} }

/* ── Canvas helpers ── */
function ctxWrap(ctx, text, x, y, mw, lh) {
  const words=text.split(' '); let line='', cy=y;
  for (const w of words) {
    const t=line?line+' '+w:w;
    if (ctx.measureText(t).width>mw && line) { ctx.fillText(line,x,cy); line=w; cy+=lh; }
    else line=t;
  }
  if (line) { ctx.fillText(line,x,cy); cy+=lh; }
  return cy;
}
function ctxRR(ctx,x,y,w,h,r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

/* ── Initial state — 4 players ── */
const INITIAL_STATE = {
  phase:'setup', mode:'clueless', totalRounds:3, timerEnabled:false, timerSeconds:30,
  players:[
    {id:generateId(),name:'',colorIdx:0},{id:generateId(),name:'',colorIdx:1},
    {id:generateId(),name:'',colorIdx:2},{id:generateId(),name:'',colorIdx:3},
  ],
  nameError:'', round:1, scores:{}, usedIdx:[], questionsCycled:false,
  qOrder:[], curAns:0, qPair:null, impIdxs:[], answers:{}, writing:'',
  playerVariants:null, playerSubject:null, voteOrder:[], curVoter:0, votes:{},
  roundPts:{}, confetti:false, revealStage:0, groupWon:false,
  playerModifiers:{},
  confidenceEnabled:false, voteConfidences:{},
};

/* ── Reducer ── */
function reducer(state, action) {
  switch(action.type) {
    case 'SET_MODE':          return {...state, mode:action.mode};
    case 'SET_ROUNDS':        return {...state, totalRounds:action.rounds};
    case 'TOGGLE_TIMER':      return {...state, timerEnabled:!state.timerEnabled};
    case 'SET_TIMER_SECONDS': return {...state, timerSeconds:action.seconds};
    case 'ADD_PLAYER': {
      if (state.players.length >= 10) return state;
      return {...state, players:[...state.players, {id:generateId(),name:'',colorIdx:state.players.length%COLORS.length}]};
    }
    case 'REMOVE_PLAYER': {
      if (state.players.length <= MIN_PLAYERS) return state;
      return {...state, players:state.players.filter(p=>p.id!==action.id).map((p,i)=>({...p,colorIdx:i%COLORS.length})), nameError:''};
    }
    case 'UPDATE_PLAYER_NAME':
      return {...state, nameError:'', players:state.players.map(p=>p.id===action.id?{...p,name:action.name}:p)};
    case 'SET_NAME_ERROR': return {...state, nameError:action.error};
    case 'BEGIN_GAME': {
      const {validPlayers,roundData}=action;
      const scores={};
      validPlayers.forEach(p=>{scores[p.name]=0;});
      return {
        ...state, players:validPlayers, scores, usedIdx:roundData.newUsed, round:1,
        questionsCycled:roundData.isCycling, qPair:roundData.qPair, qOrder:roundData.qOrder,
        impIdxs:roundData.impIdxs, playerVariants:roundData.playerVariants, playerSubject:roundData.playerSubject,
        voteOrder:roundData.voteOrder, curAns:0, answers:{}, writing:'', curVoter:0, votes:{}, roundPts:{},
        confetti:false, groupWon:false, revealStage:0, nameError:'',
        playerModifiers:action.playerModifiers??{}, voteConfidences:{}, phase:'q_handoff',
      };
    }
    case 'SET_PHASE':   return {...state, phase:action.phase};
    case 'TOGGLE_CONFIDENCE': return {...state, confidenceEnabled:!state.confidenceEnabled};
    case 'SET_VOTE_CONFIDENCE': {
      const vc=state.voteOrder[state.curVoter];
      return {...state, voteConfidences:{...state.voteConfidences,[vc]:action.confidence}};
    }
    case 'SET_WRITING': return {...state, writing:action.value};
    case 'SUBMIT_ANSWER': {
      const pName=state.players[state.qOrder[state.curAns]]?.name||'…';
      const ans=state.writing.trim()||'…';
      const newAns={...state.answers,[pName]:ans};
      const next=state.curAns+1;
      if (next>=state.players.length) return {...state,answers:newAns,writing:'',phase:'vote_handoff'};
      return {...state,answers:newAns,writing:'',curAns:next,phase:'q_handoff'};
    }
    case 'CAST_VOTE': {
      const vn=state.voteOrder[state.curVoter];
      const isMulti=state.mode==='doublecross'||state.mode==='reverse';
      let nv;
      if (isMulti) {
        const cur=state.votes[vn]||[];
        let next;
        if (cur.includes(action.suspect)) next=cur.filter(x=>x!==action.suspect);
        else if (cur.length<2) next=[...cur,action.suspect];
        else next=[cur[1],action.suspect];
        nv={...state.votes,[vn]:next};
      } else {
        nv={...state.votes,[vn]:action.suspect};
      }
      return {...state,votes:nv};
    }
    case 'CONFIRM_VOTE': {
      const nxt=state.curVoter+1;
      if (nxt<state.players.length) return {...state,curVoter:nxt,phase:'vote_handoff'};
      const pNames=state.players.map(p=>p.name);
      const impNames=state.impIdxs.map(i=>state.players[i]?.name).filter(Boolean);
      const earned=computeRoundScores(state.votes,impNames,state.mode,pNames);
      /* Confidence bonuses/penalties: conf 2 → ±1, conf 3 → ±2 */
      if (state.confidenceEnabled) {
        const isMM=state.mode==='doublecross'||state.mode==='reverse';
        pNames.forEach(voter=>{
          const conf=state.voteConfidences[voter]||1;
          if (conf<=1) return;
          const correct=isMM
            ?(state.votes[voter]||[]).some(v=>impNames.includes(v))
            :impNames.includes(state.votes[voter]);
          earned[voter]=(earned[voter]||0)+(correct?(conf-1):-(conf-1));
        });
      }
      const nScores={};
      pNames.forEach(n=>{nScores[n]=(state.scores[n]||0)+(earned[n]||0);});
      const won=checkGroupWon(state.votes,impNames,state.mode);
      return {...state,roundPts:earned,scores:nScores,groupWon:won,phase:'reveal',revealStage:0};
    }
    case 'SET_REVEAL_STAGE': return {...state,revealStage:action.stage};
    case 'SET_CONFETTI':     return {...state,confetti:action.value};
    case 'NEXT_ROUND': {
      const {roundData,newRound,playerModifiers}=action;
      return {
        ...state, round:newRound, usedIdx:roundData.newUsed, questionsCycled:roundData.isCycling,
        qPair:roundData.qPair, qOrder:roundData.qOrder, impIdxs:roundData.impIdxs,
        playerVariants:roundData.playerVariants, playerSubject:roundData.playerSubject,
        voteOrder:roundData.voteOrder, curAns:0, answers:{}, writing:'', curVoter:0, votes:{}, roundPts:{},
        confetti:false, groupWon:false, revealStage:0,
        playerModifiers:playerModifiers??{}, voteConfidences:{}, phase:'q_handoff',
      };
    }
    case 'GO_FINAL': return {...state,phase:'final'};
    case 'RESET_TO_SETUP':
      return {
        ...INITIAL_STATE,
        players:state.players.map((p,i)=>({...p,colorIdx:i%COLORS.length})),
        mode:state.mode, totalRounds:state.totalRounds,
        timerEnabled:state.timerEnabled, timerSeconds:state.timerSeconds,
        confidenceEnabled:state.confidenceEnabled,
      };
    default: return state;
  }
}

/* ══════════════════════════════════════════════
   COMPONENTS
══════════════════════════════════════════════ */
const Confetti = memo(function Confetti({active}) {
  const ref=useRef(); const raf=useRef();
  useEffect(()=>{
    if (!active) return;
    const c=ref.current; const ctx=c.getContext('2d');
    c.width=window.innerWidth; c.height=window.innerHeight;
    let ps=Array.from({length:220},()=>({
      x:Math.random()*c.width, y:-14, r:Math.random()*9+3,
      col:COLORS[Math.floor(Math.random()*COLORS.length)],
      sp:Math.random()*5+2, spin:Math.random()*.18-.09,
      ang:Math.random()*Math.PI*2, wb:Math.random()*14,
      wa:Math.random()*Math.PI*2, ws:Math.random()*.07+.02,
    }));
    function draw(){
      ctx.clearRect(0,0,c.width,c.height);
      ps.forEach(p=>{
        p.y+=p.sp; p.ang+=p.spin; p.wa+=p.ws;
        ctx.save(); ctx.translate(p.x+Math.sin(p.wa)*p.wb,p.y); ctx.rotate(p.ang);
        ctx.fillStyle=p.col; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.8); ctx.restore();
      });
      ps=ps.filter(p=>p.y<c.height+20);
      if (ps.length>0) raf.current=requestAnimationFrame(draw);
    }
    raf.current=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(raf.current);
  },[active]);
  if (!active) return null;
  return <canvas ref={ref} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9999}}/>;
});

const BlobBG = memo(function BlobBG({accent='#F59E0B', T}) {
  const a1=T.isDark?`radial-gradient(circle,${accent}18 0%,transparent 68%)`:`radial-gradient(circle,${accent}22 0%,transparent 68%)`;
  const a2=T.isDark?'radial-gradient(circle,rgba(239,68,68,.1) 0%,transparent 68%)':'radial-gradient(circle,rgba(196,58,28,.07) 0%,transparent 68%)';
  const a3=T.isDark?'radial-gradient(circle,rgba(16,185,129,.07) 0%,transparent 68%)':'radial-gradient(circle,rgba(16,185,129,.05) 0%,transparent 68%)';
  return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
      <div style={{position:'absolute',top:'-25%',left:'-10%',width:'65vw',height:'65vw',borderRadius:'50%',background:a1,animation:'drift1 14s ease-in-out infinite',transition:'background 1.4s'}}/>
      <div style={{position:'absolute',bottom:'-20%',right:'-8%',width:'55vw',height:'55vw',borderRadius:'50%',background:a2,animation:'drift2 18s ease-in-out infinite'}}/>
      <div style={{position:'absolute',top:'45%',right:'5%',width:'40vw',height:'40vw',borderRadius:'50%',background:a3,animation:'drift3 12s ease-in-out infinite'}}/>
      {T.isDark&&<div style={{position:'absolute',inset:0,opacity:.015,backgroundImage:'radial-gradient(circle, rgba(245,200,100,.7) 1px, transparent 1px)',backgroundSize:'36px 36px'}}/>}
      {!T.isDark&&<div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 0%,rgba(245,159,10,.06) 0%,transparent 55%)'}}/>}
    </div>
  );
});

const PBar = memo(function PBar({total,current,accent,T}) {
  return (
    <div style={{display:'flex',gap:5,justifyContent:'center',marginBottom:20}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{height:4,flex:1,maxWidth:28,borderRadius:99,background:i<current?T.isDark?'rgba(255,255,255,.45)':'rgba(0,0,0,.25)':i===current?accent:T.isDark?'rgba(255,255,255,.1)':'rgba(0,0,0,.1)',boxShadow:i===current?`0 0 8px ${accent}`:'none',transition:'all .35s'}}/>
      ))}
    </div>
  );
});

const ScoreRow = memo(function ScoreRow({name,score,roundPts,rank,color,delay=0,T}) {
  const medals=['🥇','🥈','🥉'];
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',background:rank===1?`${color}12`:T.surface,border:`1px solid ${rank===1?color+'50':T.border}`,borderRadius:T.r,boxShadow:rank===1?`0 0 0 1px ${color}20,0 6px 24px ${color}22`:'none',animation:'stagger .4s ease both',animationDelay:`${delay}ms`}}>
      <span style={{fontSize:20,width:28,textAlign:'center',flexShrink:0}}>{rank<=3?medals[rank-1]:rank}</span>
      <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,background:color+'18',border:`1.5px solid ${color}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color}}>{name[0]?.toUpperCase()}</div>
      <span style={{flex:1,fontWeight:700,fontSize:15,color:rank===1?T.text:T.textMid}}>{name}</span>
      {roundPts>0&&<span style={{fontSize:11,fontWeight:800,color:'#10B981',background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.28)',borderRadius:8,padding:'3px 9px',animation:'popIn .3s ease both',animationDelay:`${delay+180}ms`}}>+{roundPts}</span>}
      <span style={{fontSize:22,fontWeight:900,color:rank===1?color:T.textMid}}>{score}</span>
      <span style={{fontSize:10,color:T.textDim,marginLeft:2}}>pts</span>
    </div>
  );
});

const LockScreen = memo(function LockScreen({name,color,sub,btnLabel,onReady,T,D}) {
  return (
    <div style={{maxWidth:440,width:'100%',textAlign:'center',animation:'fadeUp .32s ease both'}}>
      <div style={{width:88,height:88,borderRadius:'50%',margin:'0 auto 20px',background:`${color}20`,border:`2px solid ${color}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:42,boxShadow:`0 0 40px ${color}50,0 0 80px ${color}18`,animation:'lockBounce 1.8s ease-in-out infinite'}}>🔒</div>
      <p style={{color:T.textDim,fontSize:10,letterSpacing:3,textTransform:'uppercase',fontWeight:700,marginBottom:8}}>{sub||'Pass the phone to'}</p>
      <h2 style={{fontSize:46,fontWeight:900,letterSpacing:'-1.5px',marginBottom:6,color,textShadow:`0 0 40px ${color}80`}}>{name}</h2>
      <p style={{color:T.textDim,fontSize:13,marginBottom:30}}>Make sure nobody else is looking 👀</p>
      <button onClick={onReady} style={D.btn(color)}>{btnLabel}</button>
    </div>
  );
});

const TimerBar = memo(function TimerBar({timeLeft,total,accent,T}) {
  const pct=(timeLeft/total)*100;
  const isW=timeLeft<=5; const isD=timeLeft<=3;
  const bc=isD?'#EF4444':isW?'#F97316':accent;
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,alignItems:'center'}}>
        <span style={{fontSize:10,color:T.textDim,letterSpacing:2,textTransform:'uppercase',fontWeight:700}}>Time</span>
        <span style={{fontSize:20,fontWeight:900,color:bc,animation:isW?'timerPulse .8s ease-in-out infinite':'none'}}>{timeLeft}s</span>
      </div>
      <div style={{height:5,background:T.isDark?'rgba(255,220,130,.08)':'rgba(100,60,10,.08)',borderRadius:99,overflow:'hidden'}}>
        <div className="timer-bar-fill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${bc}99,${bc})`,boxShadow:`0 0 8px ${bc}`}}/>
      </div>
    </div>
  );
});

const ModifierBanner = memo(function ModifierBanner({modifier,T}) {
  if (!modifier) return null;
  const bg=T.isDark?'rgba(168,85,247,.08)':'rgba(139,58,210,.06)';
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',borderRadius:12,background:bg,border:'1px solid rgba(168,85,247,.35)',marginBottom:14,animation:'popIn .3s ease both'}}>
      <span style={{fontSize:22,flexShrink:0}}>{modifier.emoji}</span>
      <div>
        <span style={{fontSize:11,fontWeight:800,color:'#A855F7',letterSpacing:1.5,textTransform:'uppercase',display:'block'}}>{modifier.label}</span>
        <span style={{fontSize:13,color:'rgba(168,85,247,.85)',marginTop:2,display:'block',lineHeight:1.4}}>{modifier.rule}</span>
      </div>
    </div>
  );
});

/* ── Round Summary Card ── */
const RoundSummaryCard = memo(function RoundSummaryCard({round,totalRounds,groupWon,impNames,qPair,answers,players,mode,T}) {
  const canvasRef=useRef(null);
  const isRev=mode==='reverse';
  useEffect(()=>{
    const canvas=canvasRef.current; if (!canvas||!qPair) return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const W=600; const PAD=30;
    const H=Math.max(460,310+impNames.length*44+Math.ceil(players.length/2)*30+50);
    canvas.width=W*dpr; canvas.height=H*dpr;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
    const impC=groupWon?'#10B981':'#EF4444';
    const TEXT='#F5E6C8'; const MID='rgba(245,230,200,.55)'; const DIM='rgba(245,230,200,.3)';
    ctx.fillStyle='#120D07'; ctx.fillRect(0,0,W,H);
    const g=ctx.createRadialGradient(W*.15,H*.2,0,W*.15,H*.2,W*.6);
    g.addColorStop(0,'rgba(245,159,10,.14)'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,220,130,.1)'; ctx.lineWidth=1;
    ctxRR(ctx,.5,.5,W-1,H-1,18); ctx.stroke();
    let y=PAD+14;
    ctx.font='800 20px system-ui,-apple-system,sans-serif'; ctx.fillStyle='#F59E0B';
    ctx.fillText('OUTLIER',PAD,y);
    const rs=`Round ${round} of ${totalRounds}`;
    ctx.font='700 11px system-ui,-apple-system,sans-serif'; ctx.fillStyle=DIM;
    ctx.fillText(rs,W-PAD-ctx.measureText(rs).width,y);
    ctx.font='600 10px system-ui,-apple-system,sans-serif'; ctx.fillStyle='rgba(245,220,150,.22)';
    const mn={clueless:'Clueless',undercover:'Undercover',doublecross:'Double Cross',reverse:'Reverse'};
    ctx.fillText(mn[mode]||mode,PAD,y+17); y+=38;
    ctx.strokeStyle='rgba(255,220,130,.08)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD,y); ctx.lineTo(W-PAD,y); ctx.stroke(); y+=18;
    ctx.font='700 9px system-ui,-apple-system,sans-serif'; ctx.fillStyle=DIM;
    ctx.fillText(isRev?'THE MATCHING PAIR':impNames.length>1?'THE OUTLIERS':'THE OUTLIER',PAD,y); y+=20;
    ctx.font='800 24px system-ui,-apple-system,sans-serif'; ctx.fillStyle=impC;
    ctx.fillText(impNames.join(' & '),PAD,y);
    const lbl=isRev?(groupWon?'IDENTIFIED':'ESCAPED'):(groupWon?'CAUGHT':'ESCAPED');
    ctx.font='800 10px system-ui,-apple-system,sans-serif';
    const bW=ctx.measureText(lbl).width+18,bH=22,bX=W-PAD-bW,bY=y-18;
    ctx.fillStyle=groupWon?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)';
    ctxRR(ctx,bX,bY,bW,bH,6); ctx.fill();
    ctx.strokeStyle=groupWon?'rgba(16,185,129,.45)':'rgba(239,68,68,.45)'; ctx.lineWidth=1;
    ctxRR(ctx,bX,bY,bW,bH,6); ctx.stroke();
    ctx.fillStyle=impC; ctx.fillText(lbl,bX+9,bY+15); y+=14;
    ctx.font='600 9px system-ui,-apple-system,sans-serif'; ctx.fillStyle=DIM;
    ctx.fillText(isRev?'THEIR SHARED WORD':'THEIR QUESTION',PAD,y); y+=16;
    ctx.font='italic 12px system-ui,-apple-system,sans-serif'; ctx.fillStyle=MID;
    y=ctxWrap(ctx,`"${qPair.b}"`,PAD+4,y,W-PAD*2-8,18); y+=4;
    impNames.forEach(n=>{
      const ans=answers[n]; if (!ans||ans==='…') return;
      ctx.font='700 9px system-ui,-apple-system,sans-serif'; ctx.fillStyle=DIM;
      ctx.fillText(`${n.toUpperCase()}'S ANSWER`,PAD,y); y+=16;
      ctx.font='700 13px system-ui,-apple-system,sans-serif'; ctx.fillStyle=impC;
      y=ctxWrap(ctx,`"${ans.length>60?ans.slice(0,60)+'…':ans}"`,PAD+4,y,W-PAD*2-8,18); y+=6;
    });
    y+=4;
    ctx.strokeStyle='rgba(255,220,130,.08)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD,y); ctx.lineTo(W-PAD,y); ctx.stroke(); y+=16;
    if (!isRev) {
      ctx.font='700 9px system-ui,-apple-system,sans-serif'; ctx.fillStyle=DIM;
      ctx.fillText('EVERYONE ELSE GOT',PAD,y); y+=16;
      ctx.font='italic 12px system-ui,-apple-system,sans-serif'; ctx.fillStyle=MID;
      y=ctxWrap(ctx,`"${qPair.a}"`,PAD+4,y,W-PAD*2-8,18); y+=10;
    }
    ctx.font='700 9px system-ui,-apple-system,sans-serif'; ctx.fillStyle=DIM;
    ctx.fillText('ALL ANSWERS',PAD,y); y+=14;
    let col=0,baseY=y;
    players.forEach(p=>{
      const isImp=impNames.includes(p.name); const ans=answers[p.name]||'…';
      const xPos=col%2===0?PAD:W/2+6; const rowY=baseY+Math.floor(col/2)*30;
      const dc=isImp?impC:COLORS[p.colorIdx%COLORS.length];
      ctx.beginPath(); ctx.arc(xPos+5,rowY-3,4,0,Math.PI*2); ctx.fillStyle=dc; ctx.fill();
      ctx.font='700 11px system-ui,-apple-system,sans-serif'; ctx.fillStyle=isImp?impC:TEXT;
      ctx.fillText(p.name,xPos+15,rowY);
      ctx.font='11px system-ui,-apple-system,sans-serif'; ctx.fillStyle=isImp?`${impC}bb`:MID;
      ctx.fillText(`"${ans.length>22?ans.slice(0,22)+'…':ans}"`,xPos+15,rowY+14); col++;
    });
    ctx.font='600 9px system-ui,-apple-system,sans-serif'; ctx.fillStyle='rgba(245,200,100,.15)';
    ctx.fillText('outlier · pass-the-phone party game',PAD,H-14);
  },[round,totalRounds,groupWon,impNames,qPair,answers,players,mode]);
  const dl=useCallback(()=>{
    const c=canvasRef.current; if (!c) return;
    haptic([30,20,50]); SoundEngine.click();
    const a=document.createElement('a'); a.download=`outlier-round-${round}.png`;
    a.href=c.toDataURL('image/png'); a.click();
  },[round]);
  return (
    <div style={{marginBottom:18}}>
      <p style={{color:T.textDim,fontSize:10,letterSpacing:2.5,textTransform:'uppercase',display:'block',marginBottom:10,fontWeight:700}}>Round Card</p>
      <canvas ref={canvasRef} style={{width:'100%',borderRadius:14,display:'block',border:`1px solid ${T.border}`}}/>
      <button onClick={dl} style={{...makeD(T).btn('#F59E0B',true,true),marginTop:10}}>↓ Save as Image</button>
    </div>
  );
});

/* ══════════════════════════════════════════════
   SETTINGS PAGE
══════════════════════════════════════════════ */
const SettingsPage = memo(function SettingsPage({state,dispatch,activePacks,togglePack,modifiersEnabled,setModifiersEnabled,customCount,onBack,T,D,S}) {
  return (
    <div style={{...S.card,animation:'fadeUp .28s ease both'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:28}}>
        <button onClick={onBack} style={{width:38,height:38,borderRadius:'50%',border:`1px solid ${T.border}`,background:T.surface,color:T.textMid,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>←</button>
        <div>
          <h2 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.5px',margin:0,color:T.text}}>Settings</h2>
          <p style={{color:T.textDim,fontSize:12,margin:0}}>Mode, rounds, packs & more</p>
        </div>
      </div>

      <p style={S.lbl}>Game Mode</p>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:22}}>
        {MODES.map(m=>{
          const sel=state.mode===m.id;
          return (
            <button key={m.id} onClick={()=>{SoundEngine.click();haptic(20);dispatch({type:'SET_MODE',mode:m.id});}} style={D.pill(m.color,sel)}>
              <span style={{fontSize:26,flexShrink:0}}>{m.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:sel?m.color:T.text,marginBottom:2}}>{m.name}</div>
                <span style={{fontSize:12,color:T.textDim,lineHeight:1.4}}>{m.tagline}</span>
              </div>
              <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,background:sel?m.color:T.surface,border:`1.5px solid ${sel?m.color:T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff',boxShadow:sel?`0 0 10px ${m.color}`:'none',transition:'all .18s'}}>{sel?'✓':''}</div>
            </button>
          );
        })}
      </div>

      <p style={S.lbl}>Rounds</p>
      <div style={{display:'flex',gap:8,marginBottom:18}}>
        {[3,5,7,10].map(n=>{
          const sel=state.totalRounds===n;
          return <button key={n} onClick={()=>{SoundEngine.click();haptic(15);dispatch({type:'SET_ROUNDS',rounds:n});}} style={{flex:1,padding:'13px 4px',borderRadius:12,fontWeight:900,fontSize:16,border:`1px solid ${sel?'rgba(245,159,10,.5)':T.border}`,background:sel?'rgba(245,159,10,.12)':T.surface,color:sel?'#F59E0B':T.textMid,boxShadow:sel?'0 0 0 1px rgba(245,159,10,.2)':'none',transition:'all .18s',fontFamily:'inherit',cursor:'pointer'}}>{n}</button>;
        })}
      </div>

      <p style={S.lbl}>Timer</p>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',borderRadius:T.r,marginBottom:18,background:state.timerEnabled?'rgba(249,115,22,.08)':T.surface,border:`1px solid ${state.timerEnabled?'rgba(249,115,22,.3)':T.border}`,transition:'all .2s'}}>
        <div>
          <span style={{fontWeight:800,fontSize:14,color:state.timerEnabled?'#F97316':T.text}}>⏱ Timer Mode</span>
          <span style={{display:'block',fontSize:11,color:T.textDim,marginTop:2}}>{state.timerEnabled?`${state.timerSeconds}s per question`:'Players answer at their own pace'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {state.timerEnabled&&(
            <div style={{display:'flex',gap:4}}>
              {[20,30,45,60].map(s=>{
                const sel=state.timerSeconds===s;
                return <button key={s} onClick={()=>dispatch({type:'SET_TIMER_SECONDS',seconds:s})} style={{padding:'4px 7px',borderRadius:7,fontSize:11,fontWeight:800,border:`1px solid ${sel?'#F97316':T.border}`,background:sel?'rgba(249,115,22,.18)':'transparent',color:sel?'#F97316':T.textMid,fontFamily:'inherit',cursor:'pointer'}}>{s}s</button>;
              })}
            </div>
          )}
          <button className="toggle-track" onClick={()=>{haptic(20);dispatch({type:'TOGGLE_TIMER'});}} style={{background:state.timerEnabled?'#F97316':T.isDark?'rgba(255,220,130,.12)':'rgba(100,60,10,.12)'}}>
            <div className="toggle-thumb" style={{left:state.timerEnabled?21:3}}/>
          </button>
        </div>
      </div>

      <p style={S.lbl}>Modifiers</p>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',borderRadius:T.r,marginBottom:10,background:modifiersEnabled?'rgba(168,85,247,.08)':T.surface,border:`1px solid ${modifiersEnabled?'rgba(168,85,247,.3)':T.border}`,transition:'all .2s'}}>
        <div>
          <span style={{fontWeight:800,fontSize:14,color:modifiersEnabled?'#A855F7':T.text}}>🎲 Random Modifiers</span>
          <span style={{display:'block',fontSize:11,color:T.textDim,marginTop:2}}>{modifiersEnabled?'Each player gets their own random rule':'Add a surprise personal rule each round'}</span>
        </div>
        <button className="toggle-track" onClick={()=>{haptic(20);setModifiersEnabled(v=>!v);}} style={{background:modifiersEnabled?'#A855F7':T.isDark?'rgba(255,220,130,.12)':'rgba(100,60,10,.12)',flexShrink:0}}>
          <div className="toggle-thumb" style={{left:modifiersEnabled?21:3}}/>
        </button>
      </div>

      <p style={S.lbl}>Confidence Voting</p>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',borderRadius:T.r,marginBottom:22,background:state.confidenceEnabled?'rgba(59,130,246,.08)':T.surface,border:`1px solid ${state.confidenceEnabled?'rgba(59,130,246,.3)':T.border}`,transition:'all .2s'}}>
        <div style={{paddingRight:12}}>
          <span style={{fontWeight:800,fontSize:14,color:state.confidenceEnabled?'#3B82F6':T.text}}>🎯 Confidence Betting</span>
          <span style={{display:'block',fontSize:11,color:T.textDim,marginTop:2,lineHeight:1.5}}>{state.confidenceEnabled?'🔥 safe · 🔥🔥 +bonus · 🔥🔥🔥 +big bonus (wrong = penalty)':'Bet on your vote — high confidence = bigger rewards & risks'}</span>
        </div>
        <button className="toggle-track" onClick={()=>{haptic(20);dispatch({type:'TOGGLE_CONFIDENCE'});}} style={{background:state.confidenceEnabled?'#3B82F6':T.isDark?'rgba(255,220,130,.12)':'rgba(100,60,10,.12)',flexShrink:0}}>
          <div className="toggle-thumb" style={{left:state.confidenceEnabled?21:3}}/>
        </button>
      </div>

      <p style={S.lbl}>Question Packs</p>
      <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:10}}>
        {QUESTION_PACKS.map(pack=>{
          const active=activePacks.includes(pack.id);
          const only=activePacks.length===1&&active;
          return (
            <React.Fragment key={pack.id}>
              <button onClick={()=>{if(!only){haptic(15);togglePack(pack.id);}}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 15px',borderRadius:pack.notice&&active?`${T.r}px ${T.r}px 0 0`:T.r,border:`1px solid ${active?'rgba(245,159,10,.35)':T.border}`,borderBottom:pack.notice&&active?'none':undefined,background:active?'rgba(245,159,10,.08)':T.surface,textAlign:'left',width:'100%',fontFamily:'inherit',cursor:only?'default':'pointer',opacity:only?.7:1,transition:'all .18s'}}>
                <span style={{fontSize:22,flexShrink:0}}>{pack.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:active?'#F59E0B':T.text,marginBottom:2}}>{pack.label}</div>
                  <div style={{fontSize:11,color:T.textDim}}>{pack.desc} · <span style={{color:active?'rgba(245,159,10,.65)':T.textDim}}>{pack.count} questions</span></div>
                </div>
                <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,background:active?'#F59E0B':T.surface,border:`1.5px solid ${active?'#F59E0B':T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:'#fff',transition:'all .18s'}}>{active?'✓':''}</div>
              </button>
              {pack.notice&&active&&<div style={{padding:'7px 13px',borderRadius:`0 0 ${T.r}px ${T.r}px`,background:T.isDark?'rgba(251,191,36,.07)':'rgba(180,140,10,.05)',border:'1px solid rgba(245,159,10,.35)',borderTop:'none',fontSize:11,color:T.isDark?'rgba(251,191,36,.8)':'rgba(140,90,0,.9)',fontWeight:600,lineHeight:1.45}}>⚠️ {pack.notice}</div>}
            </React.Fragment>
          );
        })}
        {customCount>0&&(()=>{
          const active=activePacks.includes('custom');
          const only=activePacks.length===1&&active;
          return (
            <button onClick={()=>{if(!only){haptic(15);togglePack('custom');}}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 15px',borderRadius:T.r,border:`1px solid ${active?'rgba(168,85,247,.35)':T.border}`,background:active?'rgba(168,85,247,.08)':T.surface,textAlign:'left',width:'100%',fontFamily:'inherit',cursor:only?'default':'pointer',opacity:only?.7:1,transition:'all .18s'}}>
              <span style={{fontSize:22}}>✏️</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:800,color:active?'#A855F7':T.text,marginBottom:2}}>Custom</div>
                <div style={{fontSize:11,color:T.textDim}}>{customCount} question{customCount!==1?'s':''} by you</div>
              </div>
              <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,background:active?'#A855F7':T.surface,border:`1.5px solid ${active?'#A855F7':T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:'#fff',transition:'all .18s'}}>{active?'✓':''}</div>
            </button>
          );
        })()}
      </div>
      {state.mode==='reverse'&&<div style={{padding:'10px 14px',borderRadius:T.r,border:'1px solid rgba(16,185,129,.3)',background:T.isDark?'rgba(16,185,129,.06)':'rgba(12,140,100,.05)',fontSize:12,color:T.isDark?'rgba(16,185,129,.85)':'rgba(10,100,70,.9)',fontWeight:600,marginBottom:14}}>🔄 Everyone gets a different word and writes a question it could answer. Two players share the same word — find the pair. +1 per twin found, +4 if you escape!</div>}
      <button onClick={onBack} style={{...D.btn('grad'),marginTop:8}}>← Back to Players</button>
    </div>
  );
});

/* ══════════════════════════════════════════════
   CUSTOM QUESTIONS PAGE
══════════════════════════════════════════════ */
const CustomQuestionsPage = memo(function CustomQuestionsPage({customQuestions,setCustomQuestions,activePacks,setActivePacks,onBack,T,D,S}) {
  const [draftV,setDraftV]=useState(EMPTY_VARIANTS);
  const [loadCode,setLoadCode]=useState('');
  const [savedCode,setSavedCode]=useState('');
  const [loadErr,setLoadErr]=useState('');
  const [copied,setCopied]=useState(false);
  const filled=draftV.filter(v=>v.trim()).length;
  const canAdd=filled>=2;
  const changeV=useCallback((i,val)=>{setDraftV(prev=>{const n=[...prev];n[i]=val;return n;});},[]);
  const addQ=useCallback(()=>{
    if (!canAdd) return; haptic(30); SoundEngine.click();
    const variants=draftV.map(v=>v.trim()).filter(Boolean);
    setCustomQuestions(prev=>{const n=[...prev,{variants}];setActivePacks(ap=>ap.includes('custom')?ap:[...ap,'custom']);return n;});
    setDraftV(EMPTY_VARIANTS);
  },[canAdd,draftV,setCustomQuestions,setActivePacks]);
  const delQ=useCallback((i)=>{haptic(20);SoundEngine.click();setCustomQuestions(prev=>prev.filter((_,j)=>j!==i));},[setCustomQuestions]);
  const saveCode=useCallback(()=>{
    if (!customQuestions.length) return; haptic(30); SoundEngine.click();
    setSavedCode(btoa(unescape(encodeURIComponent(JSON.stringify(customQuestions)))));
  },[customQuestions]);
  const copyCode=useCallback(()=>{
    if (!savedCode) return;
    navigator.clipboard.writeText(savedCode).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  },[savedCode]);
  const loadFromCode=useCallback(()=>{
    if (!loadCode.trim()) return;
    try {
      const dec=JSON.parse(decodeURIComponent(escape(atob(loadCode.trim()))));
      if (!Array.isArray(dec)||!dec.length) throw new Error();
      const valid=dec.filter(q=>q.variants&&Array.isArray(q.variants)&&q.variants.length>=2);
      if (!valid.length) throw new Error();
      haptic([30,20,50]); SoundEngine.click();
      setCustomQuestions(valid); setActivePacks(ap=>ap.includes('custom')?ap:[...ap,'custom']);
      setLoadCode(''); setLoadErr('');
    } catch { setLoadErr('Invalid code — please check and try again.'); }
  },[loadCode,setCustomQuestions,setActivePacks]);
  const acc='#A855F7';
  return (
    <div style={{...S.card,animation:'fadeUp .28s ease both'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <button onClick={onBack} style={{width:38,height:38,borderRadius:'50%',border:`1px solid ${T.border}`,background:T.surface,color:T.textMid,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>←</button>
        <div>
          <h2 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.5px',margin:0,color:T.text}}>Custom Questions</h2>
          <p style={{color:T.textDim,fontSize:12,margin:0}}>{customQuestions.length} question{customQuestions.length!==1?'s':''} saved</p>
        </div>
      </div>
      <div style={{background:T.isDark?'rgba(168,85,247,.05)':'rgba(130,60,200,.04)',border:`1px solid ${T.isDark?'rgba(168,85,247,.2)':'rgba(130,60,200,.15)'}`,borderRadius:T.rl,padding:'18px 16px',marginBottom:20}}>
        <p style={{color:T.isDark?'rgba(168,85,247,.7)':'rgba(100,40,160,.8)',fontSize:10,letterSpacing:2.5,textTransform:'uppercase',fontWeight:700,marginBottom:10,display:'block'}}>New question — up to 10 variants</p>
        <p style={{fontSize:11,color:T.textDim,marginBottom:14,lineHeight:1.55}}>Each variant is a different phrasing of the same question. Players see different variants — nobody realises they're answering the same thing. Fill at least 2.</p>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
          {EMPTY_VARIANTS.map((_,i)=>(
            <div key={i} style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:800,color:draftV[i].trim()?acc:T.textDim,width:22,textAlign:'right',flexShrink:0}}>{i+1}</span>
              <input value={draftV[i]} onChange={e=>changeV(i,e.target.value)} placeholder={i<2?`Variant ${i+1} (required)`:`Variant ${i+1} (optional)`} style={{...S.inp,fontSize:13,padding:'10px 13px'}} onFocus={e=>{e.target.style.borderColor=acc;e.target.style.boxShadow=`0 0 0 3px ${acc}18`;}} onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow='none';}}/>
            </div>
          ))}
        </div>
        <span style={{fontSize:11,color:T.textDim,display:'block',marginBottom:8}}>{filled} variant{filled!==1?'s':''} filled</span>
        <button onClick={addQ} disabled={!canAdd} style={makeD(T).btn(acc,false,true,!canAdd)}>+ Add Question</button>
      </div>
      {customQuestions.length>0&&(
        <div style={{marginBottom:20}}>
          <p style={S.lbl}>Saved ({customQuestions.length})</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {customQuestions.map((q,i)=>(
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'12px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:13}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,color:T.text,margin:'0 0 4px',lineHeight:1.5,fontWeight:600}}>{q.variants[0]}</p>
                  <p style={{fontSize:11,color:T.textDim,margin:0,fontStyle:'italic'}}>{q.variants.length} variant{q.variants.length!==1?'s':''}</p>
                </div>
                <button onClick={()=>delQ(i)} style={{background:'none',border:'none',color:T.textDim,fontSize:20,cursor:'pointer',padding:'0 2px',lineHeight:1,flexShrink:0,marginTop:2}}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{borderTop:`1px solid ${T.border}`,paddingTop:20,marginBottom:20}}>
        <p style={S.lbl}>Save & Load</p>
        <p style={{fontSize:12,color:T.textDim,marginBottom:14,lineHeight:1.6}}>Generate a code to save your questions and reload them next time — no account needed.</p>
        {customQuestions.length>0&&(
          <div style={{marginBottom:16}}>
            <button onClick={saveCode} style={{...makeD(T).btn('#10B981',false,true),marginBottom:savedCode?10:0}}>Generate Save Code</button>
            {savedCode&&(
              <div style={{background:T.isDark?'rgba(16,185,129,.06)':'rgba(12,140,100,.05)',border:'1px solid rgba(16,185,129,.25)',borderRadius:12,padding:'12px 14px'}}>
                <p style={{fontSize:10,color:'#10B981',fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Your Code</p>
                <code style={{fontSize:10,color:T.textMid,wordBreak:'break-all',lineHeight:1.6,background:T.isDark?'rgba(0,0,0,.3)':'rgba(0,0,0,.05)',padding:'8px 10px',borderRadius:8,display:'block',marginBottom:10}}>{savedCode.slice(0,120)}{savedCode.length>120?'…':''}</code>
                <button onClick={copyCode} style={makeD(T).btn('#10B981',true,true)}>{copied?'✓ Copied!':'⎘ Copy Full Code'}</button>
              </div>
            )}
          </div>
        )}
        <div>
          <label style={{...S.lbl,marginBottom:7}}>Load from Code</label>
          <textarea value={loadCode} onChange={e=>{setLoadCode(e.target.value);setLoadErr('');}} placeholder="Paste your save code here…" rows={3} style={{...S.inp,fontSize:12,lineHeight:1.5,marginBottom:8}}/>
          {loadErr&&<p style={{color:'#EF4444',fontSize:12,fontWeight:700,marginBottom:8}}>{loadErr}</p>}
          <button onClick={loadFromCode} disabled={!loadCode.trim()} style={makeD(T).btn('#3B82F6',false,true,!loadCode.trim())}>Load Questions from Code</button>
        </div>
      </div>
      <button onClick={onBack} style={D.btn('grad')}>← Back to Players</button>
    </div>
  );
});

/* ══════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════ */
function App() {
  const [state,dispatch]=useReducer(reducer,INITIAL_STATE);
  const [setupPage,setSetupPage]=useState('players');
  const [isDark,setIsDark]=useState(()=>!window.matchMedia||window.matchMedia('(prefers-color-scheme:dark)').matches);
  const [activePacks,setActivePacks]=useState(['main']);
  const [qs,setQs]=useState([]); const [qLoading,setQLoading]=useState(true); const [qError,setQError]=useState(false);
  const [customQs,setCustomQs]=useState(()=>{try{return JSON.parse(localStorage.getItem('outlier_custom_qs')||'[]');}catch{return [];}});
  const [modOn,setModOn]=useState(false);
  const [timeLeft,setTimeLeft]=useState(30); const [soundOn,setSoundOn]=useState(true);
  const timerRef=useRef(null); const subRef=useRef(false);

  const T=isDark?DARK:LIGHT;
  const S=makeS(T); const D=makeD(T);

  /* Apply theme */
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme',isDark?'dark':'light');
    document.body.style.background=T.bg; document.body.style.color=T.text;
  },[isDark,T.bg,T.text]);

  /* Persist custom questions */
  useEffect(()=>{
    localStorage.setItem('outlier_custom_qs',JSON.stringify(customQs));
    if (!customQs.length) setActivePacks(p=>{if(!p.includes('custom'))return p;const w=p.filter(x=>x!=='custom');return w.length?w:['main'];});
  },[customQs]);

  /* Load questions */
  useEffect(()=>{
    setQLoading(true); setQError(false);
    const fps=QUESTION_PACKS.filter(p=>activePacks.includes(p.id));
    Promise.all(fps.map(p=>fetch(p.file).then(r=>r.ok?r.json():[]).catch(()=>[]))).then(res=>{
      const files=res.flat();
      const custom=activePacks.includes('custom')?customQs:[];
      const all=[...files,...custom];
      if (!all.length) setQError(true); else { setQs(all); setQError(false); }
      setQLoading(false);
    }).catch(()=>{setQError(true);setQLoading(false);});
  },[activePacks,customQs]);

  /* Timer */
  useEffect(()=>{
    clearInterval(timerRef.current); subRef.current=false;
    if (state.phase!=='question'||!state.timerEnabled) return;
    setTimeLeft(state.timerSeconds);
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        const n=t-1;
        if (n<=0){clearInterval(timerRef.current);if(!subRef.current){subRef.current=true;SoundEngine.timerEnd();haptic([150,80,80]);dispatch({type:'SUBMIT_ANSWER'});}return 0;}
        if (n<=3){SoundEngine.timerWarn();haptic(40);}else if(n<=5){SoundEngine.tick();haptic(20);}
        return n;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[state.phase,state.curAns,state.timerEnabled]);

  /* Reveal drama */
  useEffect(()=>{
    if (state.phase!=='reveal') return;
    if (state.revealStage===0){SoundEngine.suspense();const t=setTimeout(()=>dispatch({type:'SET_REVEAL_STAGE',stage:1}),1900);return()=>clearTimeout(t);}
    if (state.revealStage===1){
      SoundEngine.reveal();haptic([80,40,80,40,200]);
      setTimeout(()=>{if(state.groupWon){SoundEngine.win();haptic([50,30,50,30,50,30,150]);dispatch({type:'SET_CONFETTI',value:true});}else{SoundEngine.lose();haptic([200,100,100]);}},500);
      const t=setTimeout(()=>dispatch({type:'SET_REVEAL_STAGE',stage:2}),2300);return()=>clearTimeout(t);
    }
    if (state.revealStage===2){const t=setTimeout(()=>dispatch({type:'SET_REVEAL_STAGE',stage:3}),900);return()=>clearTimeout(t);}
  },[state.phase,state.revealStage,state.groupWon]);

  /* Assign a random modifier to each player independently */
  const assignPlayerMods=useCallback((players)=>{
    const mods={};
    players.forEach(p=>{
      mods[p.name]=MODIFIERS[Math.floor(Math.random()*MODIFIERS.length)];
    });
    return mods;
  },[]);

  /* Derived */
  const valid=state.players.filter(p=>p.name.trim());
  const pc=valid.length;
  const mInfo=MODES.find(m=>m.id===state.mode)||MODES[0];
  const curP=state.players[state.qOrder[state.curAns]];
  const curName=curP?.name||'';
  const curIsImp=state.impIdxs.includes(state.qOrder[state.curAns]);
  const curCol=COLORS[curP?.colorIdx??(state.curAns%COLORS.length)];
  let curQ='';
  if (state.playerVariants) curQ=state.playerVariants[curName]||'';
  else if (state.qPair) curQ=curIsImp?state.qPair.b:state.qPair.a;
  if (state.playerSubject) curQ=curQ.replace(/\[Player\]/g,state.playerSubject);
  const vName=state.voteOrder[state.curVoter];
  const vPlayer=state.players.find(p=>p.name===vName);
  const vAcc=COLORS[(vPlayer?.colorIdx??0)%COLORS.length];
  const isMulti=state.mode==='doublecross'||state.mode==='reverse';
  const vPicks=state.votes[vName]||(isMulti?[]:null);
  const impNames=state.impIdxs.map(i=>state.players[i]?.name).filter(Boolean);
  const isRev=state.mode==='reverse';
  const accentC=['q_handoff','question'].includes(state.phase)?curCol:['vote_handoff','vote_cast'].includes(state.phase)?vAcc:mInfo.color;
  const canStart=valid.length>=MIN_PLAYERS&&qs.length>0;
  const charCount=state.writing.length;
  const charCol=charCount>=ANSWER_CHAR_LIMIT?'#EF4444':charCount>=Math.floor(ANSWER_CHAR_LIMIT*.85)?'#F97316':T.textDim;
  const togglePack=useCallback((id)=>{setActivePacks(p=>p.includes(id)?(p.length>1?p.filter(x=>x!==id):p):[...p,id]);},[]);

  const startGame=useCallback(()=>{
    const v=state.players.filter(p=>p.name.trim());
    if (v.length<MIN_PLAYERS) return;
    const lower=v.map(p=>p.name.trim().toLowerCase());
    if (lower.length!==new Set(lower).size){dispatch({type:'SET_NAME_ERROR',error:'⚠️ Two players have the same name.'});return;}
    haptic([40,20,80]); resetRNG();
    const rd=createRound({players:v,mode:state.mode,questions:qs,used:[]});
    const playerModifiers=modOn?assignPlayerMods(v):{};
    dispatch({type:'BEGIN_GAME',validPlayers:v,roundData:rd,playerModifiers});
    SoundEngine.click();
  },[state.players,state.mode,qs,modOn,assignPlayerMods]);

  const submitAns=useCallback(()=>{subRef.current=true;clearInterval(timerRef.current);haptic([40,30,40]);SoundEngine.submit();dispatch({type:'SUBMIT_ANSWER'});},[]);
  const castVote=useCallback(s=>{haptic(25);SoundEngine.vote();dispatch({type:'CAST_VOTE',suspect:s});},[]);
  const confirmVote=useCallback(()=>{
    /* If confidence voting is on and player hasn't picked a confidence, default to 1 */
    if (state.confidenceEnabled && !state.voteConfidences[state.voteOrder[state.curVoter]]) {
      dispatch({type:'SET_VOTE_CONFIDENCE',confidence:1});
    }
    haptic(35); SoundEngine.click(); dispatch({type:'CONFIRM_VOTE'});
  },[state.confidenceEnabled,state.voteConfidences,state.voteOrder,state.curVoter]);
  const nextRound=useCallback(()=>{
    haptic(30);SoundEngine.click();
    if (state.round>=state.totalRounds){dispatch({type:'GO_FINAL'});return;}
    const rd=createRound({players:state.players,mode:state.mode,questions:qs,used:state.usedIdx});
    const playerModifiers=modOn?assignPlayerMods(state.players):{};
    dispatch({type:'NEXT_ROUND',roundData:rd,newRound:state.round+1,playerModifiers});
  },[state.round,state.totalRounds,state.players,state.mode,state.usedIdx,qs,modOn,assignPlayerMods]);
  const toggleSound=useCallback(()=>{const n=SoundEngine.toggle();setSoundOn(n);haptic(20);},[]);
  const showQ=useCallback(()=>{haptic(30);SoundEngine.click();dispatch({type:'SET_PHASE',phase:'question'});},[]);
  const showVote=useCallback(()=>{haptic(30);SoundEngine.click();dispatch({type:'SET_PHASE',phase:'vote_cast'});},[]);

  /* Top bar */
  const topBar=(
    <div style={{position:'fixed',top:14,right:14,zIndex:100,display:'flex',gap:8}}>
      <button onClick={()=>{setIsDark(v=>!v);haptic(20);}} style={{width:38,height:38,borderRadius:'50%',background:T.isDark?'rgba(255,220,130,.07)':'rgba(100,60,10,.07)',border:`1px solid ${T.border}`,color:T.text,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} title="Toggle dark/light mode">
        {isDark?'☀️':'🌙'}
      </button>
      {state.phase!=='setup'&&(
        <button onClick={toggleSound} style={{width:38,height:38,borderRadius:'50%',background:T.isDark?'rgba(255,220,130,.07)':'rgba(100,60,10,.07)',border:`1px solid ${T.border}`,color:soundOn?T.text:T.textDim,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          {soundOn?'🔊':'🔇'}
        </button>
      )}
    </div>
  );

  /* ── RENDER ── */
  return (
    <div style={S.page}>
      <BlobBG accent={accentC} T={T}/>
      <Confetti active={state.confetti}/>
      {topBar}

      {/* LOADING */}
      {qLoading&&<div style={{textAlign:'center',animation:'fadeIn .5s ease'}}><div style={{fontSize:44,display:'inline-block',animation:'spin 1s linear infinite',color:'#F59E0B'}}>⟳</div><p style={{color:T.textMid,marginTop:12}}>Loading questions…</p></div>}

      {/* ERROR */}
      {!qLoading&&qError&&state.phase==='setup'&&(
        <div style={{maxWidth:420,width:'100%',animation:'fadeUp .4s ease'}}>
          <div style={{textAlign:'center',background:T.isDark?'rgba(239,68,68,.06)':'rgba(200,40,40,.05)',border:'1.5px solid rgba(239,68,68,.35)',borderRadius:T.rx,padding:'28px 24px'}}>
            <div style={{fontSize:46,marginBottom:12}}>📂</div>
            <h2 style={{fontSize:20,fontWeight:900,color:'#EF4444',marginBottom:10}}>Question files not found</h2>
            <p style={{color:T.textMid,fontSize:14,lineHeight:1.7}}>Make sure the <code style={{background:T.surface,padding:'2px 8px',borderRadius:6,color:'#F59E0B'}}>questions/</code> folder is alongside <code style={{background:T.surface,padding:'2px 8px',borderRadius:6,color:'#F59E0B'}}>index.html</code>.</p>
          </div>
        </div>
      )}

      {/* SETUP — PLAYERS */}
      {!qLoading&&state.phase==='setup'&&setupPage==='players'&&(
        <div style={{...S.card,animation:'fadeUp .35s ease both'}}>
          <div style={{textAlign:'center',marginBottom:24}}>
            <div style={{fontSize:56,display:'inline-block',marginBottom:2,filter:`drop-shadow(0 0 22px ${isDark?'rgba(245,159,10,.55)':'rgba(180,83,9,.35)'})`,animation:'bounce 3s ease-in-out infinite'}}>🕵️</div>
            <h1 className="title-gradient" style={{fontSize:54,fontWeight:900,letterSpacing:'-2.5px',lineHeight:1,margin:0}}>OUTLIER</h1>
            <p style={{color:T.textDim,fontSize:10,letterSpacing:5,textTransform:'uppercase',marginTop:8,fontWeight:700}}>Party Game · 4–10 Players</p>
          </div>

          {/* Settings summary */}
          <button onClick={()=>{haptic(15);SoundEngine.click();setSetupPage('settings');}} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 16px',borderRadius:T.r,border:`1px solid ${T.border}`,background:T.surface,textAlign:'left',fontFamily:'inherit',cursor:'pointer',marginBottom:10,transition:'all .18s'}}>
            <span style={{fontSize:20}}>{mInfo.emoji}</span>
            <div style={{flex:1}}>
              <span style={{fontWeight:800,fontSize:13,color:mInfo.color,display:'block'}}>{mInfo.name} · {state.totalRounds} rounds{state.timerEnabled?` · ${state.timerSeconds}s timer`:''}{modOn?' · Modifiers on':''}{state.confidenceEnabled?' · Confidence on':''}</span>
              <span style={{fontSize:11,color:T.textDim}}>{activePacks.length} pack{activePacks.length!==1?'s':''} selected · Tap to change settings</span>
            </div>
            <span style={{color:T.textDim,fontSize:16}}>⚙</span>
          </button>

          {/* Custom questions */}
          <button onClick={()=>{haptic(15);SoundEngine.click();setSetupPage('custom');}} style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 16px',borderRadius:T.r,border:`1px solid ${customQs.length>0?'rgba(168,85,247,.3)':T.border}`,background:customQs.length>0?'rgba(168,85,247,.06)':T.surface,textAlign:'left',fontFamily:'inherit',cursor:'pointer',marginBottom:22,transition:'all .18s'}}>
            <span style={{fontSize:20}}>✏️</span>
            <div style={{flex:1}}>
              <span style={{fontWeight:800,fontSize:13,color:customQs.length>0?'#A855F7':T.text,display:'block'}}>Custom Questions</span>
              <span style={{fontSize:11,color:T.textDim}}>{customQs.length>0?`${customQs.length} question${customQs.length!==1?'s':''} saved`:'Write your own questions'}</span>
            </div>
            <span style={{color:T.textDim,fontSize:16}}>→</span>
          </button>

          <p style={S.lbl}>Players</p>
          <div style={{display:'flex',flexDirection:'column',gap:9,marginBottom:14}}>
            {state.players.map((player,i)=>{
              const col=COLORS[player.colorIdx];
              return (
                <div key={player.id} style={{display:'flex',gap:9,alignItems:'center'}}>
                  <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,background:col+'18',border:`1.5px solid ${col}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:col}}>{i+1}</div>
                  <input value={player.name} onChange={e=>dispatch({type:'UPDATE_PLAYER_NAME',id:player.id,name:e.target.value})} placeholder={`Player ${i+1}`} style={S.inp} onFocus={e=>{e.target.style.borderColor=col;e.target.style.boxShadow=`0 0 0 3px ${col}18`;}} onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow='none';}}/>
                  {state.players.length>MIN_PLAYERS&&<button onClick={()=>dispatch({type:'REMOVE_PLAYER',id:player.id})} style={{background:'none',border:'none',color:T.textDim,fontSize:22,padding:'0 4px',lineHeight:1,cursor:'pointer'}}>×</button>}
                </div>
              );
            })}
          </div>
          {state.nameError&&<p style={{color:T.isDark?'rgba(239,68,68,.85)':'rgba(185,28,28,.9)',fontSize:12,textAlign:'center',fontWeight:700,marginBottom:12,animation:'fadeIn .3s ease'}}>{state.nameError}</p>}
          <div style={{display:'flex',gap:9,marginBottom:12}}>
            {state.players.length<10&&<button onClick={()=>dispatch({type:'ADD_PLAYER'})} style={{flex:1,padding:'12px',borderRadius:13,border:`1px solid ${T.border}`,background:T.surface,color:T.textMid,fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>+ Add Player</button>}
            <button onClick={startGame} disabled={!canStart} style={{...D.btn('grad',false,false,!canStart),flex:2}}>START GAME →</button>
          </div>
          {valid.length<MIN_PLAYERS&&<p style={{color:T.isDark?'rgba(249,115,22,.8)':'rgba(194,65,12,.9)',fontSize:12,textAlign:'center',fontWeight:700,animation:'pulse 1.5s infinite'}}>⚠️ All modes need at least {MIN_PLAYERS} players</p>}
          {qs.length===0&&!qLoading&&!qError&&<p style={{color:T.isDark?'rgba(249,115,22,.8)':'rgba(194,65,12,.8)',fontSize:12,textAlign:'center',fontWeight:700}}>⚠️ Select at least one question pack in Settings</p>}
        </div>
      )}

      {/* SETTINGS */}
      {!qLoading&&state.phase==='setup'&&setupPage==='settings'&&<SettingsPage state={state} dispatch={dispatch} activePacks={activePacks} togglePack={togglePack} modifiersEnabled={modOn} setModifiersEnabled={setModOn} customCount={customQs.length} onBack={()=>setSetupPage('players')} T={T} D={D} S={S}/>}

      {/* CUSTOM QUESTIONS */}
      {!qLoading&&state.phase==='setup'&&setupPage==='custom'&&<CustomQuestionsPage customQuestions={customQs} setCustomQuestions={setCustomQs} activePacks={activePacks} setActivePacks={setActivePacks} onBack={()=>setSetupPage('players')} T={T} D={D} S={S}/>}

      {/* Q HANDOFF */}
      {state.phase==='q_handoff'&&<LockScreen name={curName} color={curCol} sub={`Round ${state.round} of ${state.totalRounds} · Question Phase`} btnLabel="Show My Question →" onReady={showQ} T={T} D={D}/>}

      {/* QUESTION */}
      {state.phase==='question'&&(
        <div style={{...S.card,textAlign:'center',animation:'slideR .3s ease both'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:14}}>
            <div style={{background:`${mInfo.color}18`,border:`1px solid ${mInfo.color}40`,borderRadius:99,padding:'5px 14px',display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:12}}>{mInfo.emoji}</span>
              <span style={{fontSize:10,fontWeight:800,color:mInfo.color,letterSpacing:2,textTransform:'uppercase'}}>{mInfo.name} · Round {state.round}/{state.totalRounds}</span>
            </div>
          </div>
          <PBar total={pc} current={state.curAns} accent={curCol} T={T}/>
          <p style={{...S.lbl,textAlign:'center'}}>Answering</p>
          <h2 style={{fontSize:42,fontWeight:900,margin:'0 0 4px',letterSpacing:'-1.5px',color:curCol,textShadow:`0 0 30px ${curCol}70`}}>{curName}</h2>
          <p style={{color:T.textDim,fontSize:13,marginBottom:18,fontWeight:600}}>{state.curAns+1} of {pc}</p>
          {state.timerEnabled&&<TimerBar timeLeft={timeLeft} total={state.timerSeconds} accent={curCol} T={T}/>}
          {state.playerModifiers&&state.playerModifiers[curName]&&<ModifierBanner modifier={state.playerModifiers[curName]} T={T}/>}
          {curIsImp&&state.mode!=='clueless'&&!isRev&&(
            <div style={{background:T.isDark?'rgba(239,68,68,.08)':'rgba(185,28,28,.06)',border:'1.5px solid rgba(239,68,68,.5)',borderRadius:T.r,padding:'13px 16px',marginBottom:14,animation:'popIn .35s ease both'}}>
              <p style={{fontSize:16,fontWeight:900,margin:'0 0 4px',color:'#EF4444'}}>🎭 You are the outlier!</p>
              <p style={{fontSize:12,color:T.textMid,margin:0,lineHeight:1.5}}>{state.mode==='doublecross'?"There's one other outlier — but you don't know who. Blend in!":"Blend in with your answer. Don't get caught!"}</p>
            </div>
          )}
          {isRev&&(
            <div style={{background:T.isDark?'rgba(16,185,129,.07)':'rgba(12,140,100,.05)',border:`1px solid ${T.isDark?'rgba(16,185,129,.3)':'rgba(12,140,100,.22)'}`,borderRadius:T.r,padding:'10px 14px',marginBottom:14}}>
              <p style={{fontSize:12,color:T.isDark?'rgba(16,185,129,.85)':'rgba(10,100,70,.9)',margin:0,fontWeight:600}}>🔄 Write a question that your word could be the answer to. Two players share the same word — your writing style might give it away!</p>
            </div>
          )}
          <div style={{background:`${curCol}14`,border:`1.5px solid ${curCol}45`,borderRadius:T.rl,padding:'22px 18px',marginBottom:16,boxShadow:`0 0 30px ${curCol}20`}}>
            <p style={{...S.lbl,textAlign:'center',color:curCol+'cc',marginBottom:10}}>{isRev?'Your word':'Your question'}</p>
            <p style={{fontSize:isRev?36:19,fontWeight:isRev?900:700,lineHeight:1.55,color:T.text,margin:0,letterSpacing:isRev?'-1px':'normal'}}>{curQ}</p>
          </div>
          <div style={{textAlign:'left',marginBottom:14}}>
            <label style={S.lbl}>{isRev?'Your question':'Your answer'}</label>
            <textarea value={state.writing} onChange={e=>dispatch({type:'SET_WRITING',value:e.target.value.slice(0,ANSWER_CHAR_LIMIT)})} placeholder={isRev?'Write a question your word could answer…':'Type your answer…'} rows={3} maxLength={ANSWER_CHAR_LIMIT} style={{...S.inp,border:`1.5px solid ${curCol}50`,lineHeight:1.6,boxShadow:`0 0 0 3px ${curCol}10`}}/>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:5}}><span style={{fontSize:11,fontWeight:700,color:charCol,transition:'color .2s'}}>{charCount} / {ANSWER_CHAR_LIMIT}</span></div>
          </div>
          <button onClick={submitAns} style={D.btn(curCol)}>
            {state.curAns+1<pc?'Done — pass the phone →':'All answered — start voting!'}
          </button>
        </div>
      )}

      {/* VOTE HANDOFF */}
      {state.phase==='vote_handoff'&&<LockScreen name={vName} color={vAcc} sub={`Voting · ${state.curVoter+1} of ${pc}`} btnLabel="Show Answers & Vote →" onReady={showVote} T={T} D={D}/>}

      {/* VOTE CAST */}
      {state.phase==='vote_cast'&&(
        <div style={{...S.card,animation:'slideR .3s ease both'}}>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:10}}>
              <div style={{background:`${vAcc}20`,border:`1.5px solid ${vAcc}55`,borderRadius:99,padding:'7px 16px',display:'flex',alignItems:'center',gap:8,boxShadow:`0 0 20px ${vAcc}25`}}>
                <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,background:vAcc+'18',border:`1.5px solid ${vAcc}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:vAcc}}>{vName?.[0]?.toUpperCase()}</div>
                <span style={{fontSize:14,fontWeight:800,color:vAcc}}>{vName}'s vote</span>
                <span style={{fontSize:10,color:vAcc+'70',letterSpacing:1}}>({state.curVoter+1}/{pc})</span>
              </div>
            </div>
            <p style={{color:T.textMid,fontSize:13,fontWeight:600,lineHeight:1.5}}>
              {state.mode==='doublecross'?'Pick 2 suspects — both could be outliers!':isRev?'Pick the 2 players you think got the SAME word':'Tap who you think had the different question'}
            </p>
          </div>
          <p style={S.lbl}>{isRev?"Everyone's Questions":"Everyone's Answers"}</p>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
            {state.players.map(player=>{
              const col=COLORS[player.colorIdx];
              const picks=isMulti?(vPicks||[]):(vPicks?[vPicks]:[]);
              const picked=picks.includes(player.name);
              const isSelf=player.name===vName;
              return (
                <div key={player.id} onClick={()=>{if(!isSelf)castVote(player.name);}} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'13px 15px',borderRadius:T.r,cursor:isSelf?'default':'pointer',background:picked?`${col}14`:T.surface,border:`1px solid ${picked?col+'55':T.border}`,boxShadow:picked?`0 0 0 1px ${col}20,0 6px 20px ${col}20`:'none',transition:'all .18s',opacity:isSelf?.45:1}}>
                  <div style={D.avatar(col)}>{player.name[0]?.toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontWeight:800,fontSize:13,color:picked?col:T.textMid}}>{player.name}{isSelf?' (you)':''}</p>
                    <p style={{margin:'3px 0 0',fontSize:14,color:isSelf?T.textDim:T.text,fontStyle:isSelf?'italic':'normal'}}>{state.answers[player.name]||'…'}</p>
                  </div>
                  {!isSelf&&<div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,alignSelf:'center',background:picked?col:T.surface,border:`1.5px solid ${picked?col:T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff',boxShadow:picked?`0 0 10px ${col}`:'none',transition:'all .18s'}}>{picked?'✓':''}</div>}
                </div>
              );
            })}
          </div>
          {isMulti&&(vPicks||[]).length<2&&(
            <div style={{background:T.isDark?'rgba(249,115,22,.08)':'rgba(194,65,12,.06)',border:`1px solid ${T.isDark?'rgba(249,115,22,.3)':'rgba(194,65,12,.2)'}`,borderRadius:10,padding:'8px 14px',marginBottom:12,textAlign:'center',fontSize:12,color:T.isDark?'#F97316':'#C2410C',fontWeight:800,animation:'pulse 1.5s infinite'}}>
              Select {2-(vPicks||[]).length} more suspect{(vPicks||[]).length===1?'':'s'}
            </div>
          )}

          {/* ── Confidence betting ── */}
          {state.confidenceEnabled&&(()=>{
            const hasVoted=isMulti?(vPicks||[]).length>0:vPicks!=null;
            const curConf=state.voteConfidences[vName]||1;
            const CONF_LEVELS=[
              {val:1,emoji:'🙂',label:'Safe',sub:'No bonus, no penalty',col:'#6B7280'},
              {val:2,emoji:'🔥',label:'Confident',sub:'+1 if right · −1 if wrong',col:'#F97316'},
              {val:3,emoji:'🚀',label:'Certain',sub:'+2 if right · −2 if wrong',col:'#EF4444'},
            ];
            return (
              <div style={{background:T.isDark?'rgba(59,130,246,.07)':'rgba(37,99,235,.05)',border:`1px solid ${T.isDark?'rgba(59,130,246,.28)':'rgba(37,99,235,.2)'}`,borderRadius:T.r,padding:'14px 15px',marginBottom:14,opacity:hasVoted?1:.45,transition:'opacity .2s'}}>
                <p style={{fontSize:10,fontWeight:800,color:'#3B82F6',letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>🎯 How confident are you?</p>
                {!hasVoted&&<p style={{fontSize:11,color:T.textDim,marginBottom:0,fontStyle:'italic'}}>Pick your suspect first, then set confidence.</p>}
                {hasVoted&&(
                  <div style={{display:'flex',gap:7}}>
                    {CONF_LEVELS.map(lv=>{
                      const sel=curConf===lv.val;
                      return (
                        <button key={lv.val} onClick={()=>{haptic(20);SoundEngine.click();dispatch({type:'SET_VOTE_CONFIDENCE',confidence:lv.val});}} style={{flex:1,padding:'10px 6px',borderRadius:12,border:`1.5px solid ${sel?lv.col+'80':T.border}`,background:sel?lv.col+'15':T.surface,fontFamily:'inherit',cursor:'pointer',transition:'all .18s',textAlign:'center'}}>
                          <div style={{fontSize:20,marginBottom:3}}>{lv.emoji}</div>
                          <div style={{fontSize:11,fontWeight:800,color:sel?lv.col:T.textMid}}>{lv.label}</div>
                          <div style={{fontSize:9,color:T.textDim,marginTop:2,lineHeight:1.4}}>{lv.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <button onClick={confirmVote} disabled={isMulti?(vPicks||[]).length!==2:vPicks==null} style={D.btn(vAcc,false,false,isMulti?(vPicks||[]).length!==2:vPicks==null)}>
            {state.curVoter+1<pc?'Confirm Vote — pass the phone →':'Confirm Vote — see results!'}
          </button>
        </div>
      )}

      {/* REVEAL */}
      {state.phase==='reveal'&&(
        <div style={{...S.card,animation:'fadeUp .35s ease both'}}>
          {state.revealStage===0&&(
            <div style={{textAlign:'center',padding:'44px 20px',animation:'fadeIn .4s ease'}}>
              <div style={{fontSize:68,marginBottom:20,display:'inline-block',animation:'spin 2.2s linear infinite'}}>🎭</div>
              <h2 style={{fontSize:22,fontWeight:900,color:T.textMid,marginBottom:8}}>{isRev?'Revealing the matching pair…':impNames.length>1?'Revealing the outliers…':'Revealing the outlier…'}</h2>
              <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:24}}>
                {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:T.isDark?'rgba(245,200,100,.3)':'rgba(100,60,10,.2)',animation:`pulse 1s ease-in-out ${i*.33}s infinite`}}/>)}
              </div>
            </div>
          )}
          {state.revealStage>=1&&(
            <div style={{background:state.groupWon?T.isDark?'rgba(16,185,129,.07)':'rgba(12,140,100,.05)':T.isDark?'rgba(239,68,68,.07)':'rgba(185,28,28,.05)',border:`1.5px solid ${state.groupWon?'rgba(16,185,129,.4)':'rgba(239,68,68,.4)'}`,borderRadius:T.rx,padding:'24px 20px',textAlign:'center',marginBottom:16,boxShadow:`0 0 50px ${state.groupWon?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)'}`,animation:'popIn .5s ease both'}}>
              <div style={{fontSize:50,marginBottom:10,animation:state.groupWon?'bounce .9s ease-in-out infinite':'none'}}>{state.groupWon?'🎉':'😈'}</div>
              <p style={{fontSize:10,letterSpacing:3.5,textTransform:'uppercase',color:T.textDim,fontWeight:700,marginBottom:8}}>{isRev?'The matching pair was':impNames.length>1?'The outliers were':'The outlier was'}</p>
              <h2 style={{fontSize:impNames.length>1?30:42,fontWeight:900,margin:'0 0 14px',letterSpacing:'-1px',color:state.groupWon?'#10B981':'#EF4444',textShadow:`0 0 50px ${state.groupWon?'#10B98188':'#EF444488'}`,animation:'revealName .7s ease both'}}>{impNames.join(' & ')}</h2>
              <div style={{background:T.surface,borderRadius:12,padding:'12px 14px',marginBottom:10,textAlign:'left',border:`1px solid ${T.border}`}}>
                <p style={{fontSize:9,color:T.textDim,letterSpacing:3,textTransform:'uppercase',fontWeight:700,marginBottom:5}}>{isRev?'Their shared word was':'Their question was'}</p>
                <p style={{fontSize:isRev?28:13,fontWeight:isRev?900:400,fontStyle:isRev?'normal':'italic',color:isRev?'#10B981':T.textMid,lineHeight:1.55,letterSpacing:isRev?'-0.5px':'normal'}}>{isRev?state.qPair?.b:`"${state.qPair?.b}"`}</p>
              </div>
              {!isRev&&<><p style={{fontSize:11,color:T.textDim,marginBottom:3}}>Everyone else got:</p><p style={{fontSize:13,fontStyle:'italic',color:T.textMid}}>"{state.qPair?.a}"</p></>}
              <p style={{fontSize:20,fontWeight:900,marginTop:16,color:state.groupWon?'#10B981':'#EF4444'}}>
                {isRev?(state.groupWon?'Pair identified! 🎊':'Twins escaped! 😂'):(state.groupWon?'Group wins! 🎊':'Outlier escapes! 😂')}
              </p>
              {isRev&&<p style={{fontSize:11,color:T.textDim,marginTop:8}}>+1 per twin you found · +4 to each twin that wasn't top-2 voted</p>}
            </div>
          )}
          {state.revealStage>=2&&(
            <div style={{animation:'fadeUp .4s ease both'}}>
              <p style={S.lbl}>Who voted for whom{state.confidenceEnabled?' · with confidence':''}</p>
              <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:16}}>
                {state.players.map((player,i)=>{
                  const vFor=isMulti?(state.votes[player.name]||[]).join(' & ')||'—':state.votes[player.name]||'—';
                  const correct=isMulti?(state.votes[player.name]||[]).some(v=>impNames.includes(v)):impNames.includes(state.votes[player.name]);
                  const col=COLORS[player.colorIdx];
                  const conf=state.confidenceEnabled?(state.voteConfidences[player.name]||1):null;
                  const CONF_EMOJIS=['','🙂','🔥','🚀'];
                  const ptDelta=conf&&conf>1?(correct?+(conf-1):-(conf-1)):null;
                  return (
                    <div key={player.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:correct?T.isDark?'rgba(16,185,129,.07)':'rgba(12,140,100,.05)':T.surface,border:`1px solid ${correct?'rgba(16,185,129,.3)':T.border}`,borderRadius:12,animation:'stagger .35s ease both',animationDelay:`${i*50}ms`}}>
                      <div style={D.avatar(col,28)}>{player.name[0]?.toUpperCase()}</div>
                      <span style={{flex:1,fontSize:13,fontWeight:700,color:T.textMid}}>{player.name}</span>
                      {conf&&<span style={{fontSize:13}}>{CONF_EMOJIS[conf]}</span>}
                      <span style={{fontSize:12,color:T.textDim}}>→</span>
                      <span style={{fontSize:13,fontWeight:800,color:correct?'#10B981':T.textMid}}>{vFor}</span>
                      {ptDelta!==null&&<span style={{fontSize:11,fontWeight:800,padding:'2px 7px',borderRadius:7,background:ptDelta>0?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)',color:ptDelta>0?'#10B981':'#EF4444',border:`1px solid ${ptDelta>0?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}`}}>{ptDelta>0?`+${ptDelta}`:ptDelta}</span>}
                      <span style={{fontSize:16}}>{correct?'✅':'❌'}</span>
                    </div>
                  );
                })}
              </div>
              {state.confidenceEnabled&&<p style={{fontSize:11,color:T.textDim,textAlign:'center',marginBottom:4,marginTop:-6}}>🎯 Confidence bonus/penalty shown above</p>}
            </div>
          )}
          {state.revealStage>=3&&(
            <div style={{animation:'fadeUp .4s ease both'}}>
              <div style={{height:1,background:T.isDark?'linear-gradient(90deg,transparent,rgba(245,200,100,.12),transparent)':'linear-gradient(90deg,transparent,rgba(100,60,10,.1),transparent)',margin:'20px 0'}}/>
              {state.questionsCycled&&<p style={{color:T.isDark?'rgba(249,115,22,.65)':'rgba(160,80,0,.6)',fontSize:11,textAlign:'center',marginBottom:12,fontStyle:'italic'}}>🔄 All questions used — cycling back through</p>}
              <RoundSummaryCard round={state.round} totalRounds={state.totalRounds} groupWon={state.groupWon} impNames={impNames} qPair={state.qPair} answers={state.answers} players={state.players} mode={state.mode} T={T}/>
              <p style={{...S.lbl,marginBottom:12}}>Leaderboard · Round {state.round}</p>
              <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:20}}>
                {Object.entries(state.scores).sort((a,b)=>b[1]-a[1]).map(([name,pts],i)=>{
                  const player=state.players.find(p=>p.name===name);
                  return <ScoreRow key={name} name={name} score={pts} rank={i+1} roundPts={state.roundPts[name]||0} color={COLORS[(player?.colorIdx??i)%COLORS.length]} delay={i*65} T={T}/>;
                })}
              </div>
              <button onClick={nextRound} style={D.btn(state.round>=state.totalRounds?'#10B981':'#3B82F6')}>
                {state.round>=state.totalRounds?'🏆 Final Results →':'Next Round →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* FINAL */}
      {state.phase==='final'&&(()=>{
        const sorted=Object.entries(state.scores).sort((a,b)=>b[1]-a[1]);
        const winner=sorted[0]?.[0];
        const wPlayer=state.players.find(p=>p.name===winner);
        const wCol=COLORS[(wPlayer?.colorIdx??0)%COLORS.length];
        return (
          <div style={{...S.card,animation:'fadeUp .4s ease both'}}>
            <div style={{textAlign:'center',marginBottom:24}}>
              <div style={{fontSize:66,display:'inline-block',marginBottom:4,filter:T.isDark?'drop-shadow(0 0 28px rgba(245,159,10,.65))':'drop-shadow(0 0 22px rgba(180,83,9,.4))',animation:'crown 2.2s ease-in-out infinite'}}>🏆</div>
              <h1 className="title-gradient" style={{fontSize:44,fontWeight:900,letterSpacing:'-2px',margin:0}}>Final Results</h1>
              <p style={{color:T.textDim,fontSize:10,marginTop:6,letterSpacing:3,textTransform:'uppercase'}}>{state.totalRounds} round{state.totalRounds!==1?'s':''} complete</p>
            </div>
            <div style={{background:`${wCol}12`,border:`1.5px solid ${wCol}50`,borderRadius:T.rx,padding:'22px',textAlign:'center',marginBottom:20,boxShadow:`0 0 0 1px ${wCol}18,0 8px 40px ${wCol}28`,animation:'popIn .5s ease both'}}>
              <p style={{fontSize:10,letterSpacing:3.5,textTransform:'uppercase',color:wCol+'80',fontWeight:700,marginBottom:8}}>Winner</p>
              <div style={{width:60,height:60,borderRadius:'50%',margin:'0 auto 10px',background:wCol+'25',border:`2px solid ${wCol}70`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,color:wCol}}>{winner?.[0]?.toUpperCase()}</div>
              <h2 style={{fontSize:34,fontWeight:900,letterSpacing:'-1px',color:T.text}}>{winner} 👑</h2>
              <p style={{fontSize:26,fontWeight:900,color:wCol,marginTop:4}}>{sorted[0]?.[1]} pt{sorted[0]?.[1]!==1?'s':''}</p>
            </div>
            <p style={S.lbl}>Full Standings</p>
            <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:22}}>
              {sorted.map(([name,pts],i)=>{
                const player=state.players.find(p=>p.name===name);
                return <ScoreRow key={name} name={name} score={pts} rank={i+1} roundPts={0} color={COLORS[(player?.colorIdx??i)%COLORS.length]} delay={i*80} T={T}/>;
              })}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              <button onClick={startGame} style={D.btn('grad')}>Play Again (Same Players) →</button>
              <button onClick={()=>{haptic(20);SoundEngine.click();dispatch({type:'RESET_TO_SETUP'});setSetupPage('players');}} style={{display:'block',width:'100%',padding:'12px',borderRadius:14,border:`1px solid ${T.border}`,background:'transparent',color:T.textMid,fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>Change Settings</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
