(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const audio = $("audio"), status = $("status"), list = $("chapters");
  const stateKey = "escuela-gloria:audiobook:panorama-nt-clase-02:v2";
  const legacyStateKey = "escuela-gloria:audiobook:panorama-nt-clase-02:v1";
  let manifest, chapters = [], chapterStarts = [], current = 0, saveTimer, manifestUrl, initialized = false;
  let transcriptItems = [], activeParagraph = -1, pendingSeek = 0;
  const fmt = (s) => { if (!Number.isFinite(s) || s < 0) s = 0; const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=Math.floor(s%60).toString().padStart(2,"0"); return h ? `${h}:${m.toString().padStart(2,"0")}:${sec}` : `${m}:${sec}`; };
  const getState = (key=stateKey) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
  const setStatus = (text) => { status.textContent=text; };
  const baseForAssets = (url) => { const configured=window.AUDIOBOOK_BASE_URL; return configured ? new URL(configured.endsWith("/")?configured:`${configured}/`,document.baseURI) : new URL("./",url); };
  const contentsUrl = () => new URL("transcripts/libro.json",baseForAssets(manifestUrl));
  const bookUrl = () => new URL(manifest.full_download,baseForAssets(manifestUrl)).href;
  const chapterAt = (time) => { let lo=0,hi=chapterStarts.length-1,found=0; while(lo<=hi){const mid=(lo+hi)>>1;if(chapterStarts[mid]/1000<=time){found=mid;lo=mid+1;}else hi=mid-1;}return found; };
  const getStateForRestore = () => {
    const saved=getState();if(Number.isFinite(saved.position))return saved;
    const old=getState(legacyStateKey),index=chapters.findIndex(c=>c.id===old.chapter);
    if(index<0)return {};
    return {position:chapterStarts[index]/1000+Math.max(0,Number(old.position)||0),speed:old.speed};
  };
  const saveState = () => {
    if(!initialized)return;
    const position=Number.isFinite(audio.currentTime)?audio.currentTime:0;
    try{localStorage.setItem(stateKey,JSON.stringify({position,speed:audio.playbackRate,chapter:chapters[chapterAt(position)]?.id}));}catch{}
  };
  function renderList(){
    list.replaceChildren();
    chapters.forEach((chapter,i)=>{
      const li=document.createElement("li");li.className="chapter-item";
      const button=document.createElement("button");button.className="chapter-select";button.type="button";button.dataset.index=i;button.setAttribute("aria-label",`Ir al capítulo ${i+1}: ${chapter.title}`);
      const num=document.createElement("span");num.className="chapter-number";num.textContent=String(i+1).padStart(2,"0");
      const title=document.createElement("span");title.className="chapter-select-title";title.textContent=chapter.title;
      const time=document.createElement("span");time.className="chapter-details";time.textContent=fmt(chapter.duration_ms/1000);
      button.append(num,title,time);li.append(button);list.append(li);
    });
    $("contents-count").textContent=`${chapters.length} capítulos`;
  }
  const REF_NUMBER = String.raw`(?:uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|diecisiete|dieciocho|diecinueve|veinte|veintiuno|veintidós|veintitrés|veinticuatro|veinticinco|veintiséis|veintisiete|veintiocho|veintinueve|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|mil)(?:\s+(?:y|al|a)\s+(?:uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|diecisiete|dieciocho|diecinueve|veinte|veintiuno|veintidós|veintitrés|veinticuatro|veinticinco|veintiséis|veintisiete|veintiocho|veintinueve|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|mil)){0,4}`;
  const books=["Primera de Corintios","Segunda de Corintios","Primera de Tesalonicenses","Segunda de Tesalonicenses","Primera de Timoteo","Segunda de Timoteo","Primera de Pedro","Segunda de Pedro","Primera de Juan","Segunda de Juan","Tercera de Juan","Cantar de los Cantares","Primera de Samuel","Segunda de Samuel","Primera de Reyes","Segunda de Reyes","Primera de Crónicas","Segunda de Crónicas","Primera a los Corintios","Segunda a los Corintios","Primera a Timoteo","Segunda a Timoteo","Primera a los Tesalonicenses","Segunda a los Tesalonicenses","Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces","Rut","Esdras","Nehemías","Ester","Job","Salmos","Salmo","Proverbios","Eclesiastés","Isaías","Jeremías","Lamentaciones","Ezequiel","Daniel","Oseas","Joel","Amós","Abdías","Jonás","Miqueas","Nahúm","Habacuc","Sofonías","Hageo","Zacarías","Malaquías","Mateo","Marcos","Lucas","Juan","Hechos","Romanos","Gálatas","Efesios","Filipenses","Colosenses","Filemón","Hebreos","Santiago","Judas","Apocalipsis"];
  const escapeRe=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const bookPattern=books.sort((a,b)=>b.length-a.length).map(escapeRe).join("|");
  const refPattern=new RegExp(String.raw`(?:${bookPattern}),?\s+capítulo\s+${REF_NUMBER}(?:,?\s+versículos?\s+${REF_NUMBER})?|(?:${bookPattern})\s+${REF_NUMBER}(?:,?\s+versículos?\s+${REF_NUMBER})?`,"gi");
  const highlightedPhrases=["¿quién es Jesús y cómo lo presentan los cuatro Evangelios?","los cuatro presentan a la misma persona","Jesucristo es Dios manifestado en carne","en Cristo habita corporalmente toda la plenitud de la Deidad","Señor mío, y Dios mío","Cristo murió por nuestros pecados, fue sepultado y resucitó al tercer día, conforme a las Escrituras","el Verbo era Dios y se hizo carne","Dios fue manifestado en carne","quién es este que hasta el viento y el mar le obedecen"];
  const inlinePattern=new RegExp(`(${refPattern.source})|(${highlightedPhrases.map(escapeRe).join("|")})`,"gi");
  function appendFormattedText(parent,text){
    inlinePattern.lastIndex=0;let last=0,match;
    while((match=inlinePattern.exec(text))){if(match.index>last)parent.append(document.createTextNode(text.slice(last,match.index)));
      const span=document.createElement("span");span.className=match[1]?"bible-reference":"reader-emphasis";span.textContent=match[0];parent.append(span);last=match.index+match[0].length;
    }
    if(last<text.length)parent.append(document.createTextNode(text.slice(last)));
  }
  function renderParagraph(segment,index){
    const isChapter=segment.heading||/^Capítulo\s+/i.test(segment.text);
    const tag=isChapter?"h2":"p",el=document.createElement(tag);el.className=isChapter?"reader-chapter-heading":"reader-paragraph";
    el.id=isChapter?`book-section-${segment.chapter_id}`:undefined;
    const subhead=/^((?:Paso|Eje)\s+(?:uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|[0-9]+):|Mirada\s+(?:histórica|del autor|teológica)\.)\s*/i.exec(segment.text);
    if(subhead){const label=document.createElement("span");label.className="reader-subhead";appendFormattedText(label,subhead[1]);el.append(label,document.createTextNode(" "));appendFormattedText(el,segment.text.slice(subhead[0].length));}
    else appendFormattedText(el,segment.text);
    el.dataset.start=String(segment.start_ms/1000);el.dataset.end=String(segment.end_ms/1000);el.dataset.index=String(index);
    return el;
  }
  async function loadBookText(){
    const content=$("reader-content"),label=$("reader-status");label.textContent="Cargando el texto completo…";
    try{
      const response=await fetch(contentsUrl());if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(data.book_id!==manifest.book_id||!Array.isArray(data.segments)||data.segments.length===0)throw new Error("Texto del libro incompleto.");
      const fragment=document.createDocumentFragment();transcriptItems=[];
      data.segments.forEach((segment,index)=>{const element=renderParagraph(segment,index);fragment.append(element);transcriptItems.push({element,start:segment.start_ms/1000,end:segment.end_ms/1000,chapterId:segment.chapter_id});});
      content.append(fragment);label.textContent="Guion original en lectura continua. Las referencias bíblicas y las ideas destacadas tienen formato propio.";updateTranscript(audio.currentTime,false);
    }catch(error){label.textContent="No se pudo cargar el texto. El audiolibro sigue disponible para escuchar.";}
  }
  function updateTranscript(time,scroll=true){
    if(!transcriptItems.length)return;
    let lo=0,hi=transcriptItems.length-1,found=-1;
    while(lo<=hi){const mid=(lo+hi)>>1,item=transcriptItems[mid];if(time<item.start)hi=mid-1;else if(time>=item.end)lo=mid+1;else{found=mid;break;}}
    if(found<0){const targetId=chapters[chapterAt(time)]?.id;const next=transcriptItems[lo];const previous=transcriptItems[lo-1];
      if(next?.chapterId===targetId)found=lo;else if(previous?.chapterId===targetId)found=lo-1;else{found=transcriptItems.findIndex(item=>item.chapterId===targetId);if(found<0)found=Math.max(0,Math.min(transcriptItems.length-1,lo-1));}}
    if(found!==activeParagraph){if(activeParagraph>=0){transcriptItems[activeParagraph].element.classList.remove("is-active");transcriptItems[activeParagraph].element.removeAttribute("aria-current");}
      activeParagraph=found;const active=transcriptItems[found].element;active.classList.add("is-active");active.setAttribute("aria-current","true");if(scroll)active.scrollIntoView({block:"nearest",behavior:"smooth"});}
    const chapterIndex=chapters.findIndex(c=>c.id===transcriptItems[found].chapterId);
    if(chapterIndex>=0&&chapterIndex!==current)setCurrentChapter(chapterIndex);
  }
  function setCurrentChapter(index){
    current=index;const chapter=chapters[index];$("current-title").textContent=chapter.title;
    document.querySelectorAll(".chapter-select").forEach((button,i)=>button.setAttribute("aria-current",i===index?"true":"false"));
  }
  function jumpToChapter(index){
    if(index<0||index>=chapters.length)return;
    pendingSeek=chapterStarts[index]/1000;
    if(Number.isFinite(audio.duration)){audio.currentTime=pendingSeek;updateTranscript(audio.currentTime);}
    setCurrentChapter(index);
  }
  async function init(){
    try{
      const configured=window.AUDIOBOOK_MANIFEST_URL;
      manifestUrl=configured?new URL(configured,document.baseURI):new URL("./manifest.json",document.baseURI);
      const response=await fetch(manifestUrl);if(!response.ok)throw new Error(`No se pudo cargar el audiolibro (${response.status}).`);
      manifest=await response.json();chapters=[...manifest.chapters].sort((a,b)=>a.order-b.order);
      let cursor=0;chapters.forEach(chapter=>{chapterStarts.push(cursor);cursor+=chapter.duration_ms;});
      $("book-title").textContent=manifest.title;$("subtitle").textContent=manifest.subtitle||"";$("description").textContent=manifest.description||"";
      $("collection").textContent=(manifest.collection_id||"").replaceAll("-"," ").toUpperCase();$("cover").src=new URL(manifest.cover,baseForAssets(manifestUrl)).href;
      $("chapter-count").textContent=`${chapters.length} capítulos`;$("total-duration").textContent=`${fmt(manifest.total_duration_ms/1000)} en total`;
      renderList();const saved=getStateForRestore();$("speed").value=String(saved.speed||1);audio.playbackRate=Number($("speed").value);pendingSeek=Math.max(0,Number(saved.position)||0);
      audio.src=bookUrl();audio.load();await loadBookText();initialized=true;setCurrentChapter(chapterAt(pendingSeek));
    }catch(error){setStatus(error.message||"No se pudo cargar el audiolibro.");}
  }
  list.addEventListener("click",event=>{const button=event.target.closest(".chapter-select");if(button)jumpToChapter(Number(button.dataset.index));});
  $("play").addEventListener("click",()=>{if(audio.paused)audio.play().then(()=>setStatus("Reproduciendo el audiolibro completo.")).catch(()=>setStatus("No se pudo iniciar el audio. Revisa tu conexión."));else{audio.pause();saveState();}});
  audio.addEventListener("play",()=>{$("play").textContent="❚❚";$("play").setAttribute("aria-label","Pausar");$("play").title="Pausar";});
  audio.addEventListener("pause",()=>{$("play").textContent="▶";$("play").setAttribute("aria-label","Reproducir");$("play").title="Reproducir";});
  audio.addEventListener("waiting",()=>setStatus("Cargando audio…"));audio.addEventListener("canplay",()=>setStatus("Audiolibro listo."));
  audio.addEventListener("error",()=>setStatus("No se pudo cargar el audiolibro. Comprueba tu conexión o vuelve a intentarlo."));
  audio.addEventListener("loadedmetadata",()=>{if(pendingSeek>0&&pendingSeek<audio.duration)audio.currentTime=pendingSeek;updateTranscript(audio.currentTime,false);$("remaining").textContent=`−${fmt(Math.max(0,audio.duration-audio.currentTime))}`;});
  audio.addEventListener("timeupdate",()=>{const d=audio.duration||0,t=audio.currentTime||0;$("seek").value=d?String(Math.round(t/d*1000)):"0";$("elapsed").textContent=fmt(t);$("remaining").textContent=`−${fmt(Math.max(0,d-t))}`;updateTranscript(t);if(!saveTimer)saveTimer=setTimeout(()=>{saveState();saveTimer=null;},3000);});
  audio.addEventListener("ended",()=>{setStatus("Audiolibro terminado.");saveState();});
  $("seek").addEventListener("input",()=>{if(Number.isFinite(audio.duration)){audio.currentTime=Number($("seek").value)/1000*audio.duration;updateTranscript(audio.currentTime);}});
  $("previous").addEventListener("click",()=>jumpToChapter(Math.max(0,current-1)));$("next").addEventListener("click",()=>jumpToChapter(Math.min(chapters.length-1,current+1)));
  $("back").addEventListener("click",()=>{audio.currentTime=Math.max(0,audio.currentTime-15);});$("forward").addEventListener("click",()=>{audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);});
  $("speed").addEventListener("change",event=>{audio.playbackRate=Number(event.target.value);saveState();});
  document.addEventListener("keydown",event=>{if(event.target.matches("input,select,textarea,button,a"))return;if(event.code==="Space"){event.preventDefault();$("play").click();}else if(event.code==="ArrowLeft"){audio.currentTime=Math.max(0,audio.currentTime-15);}else if(event.code==="ArrowRight"){audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);}});
  window.addEventListener("pagehide",saveState);
  init();
})();
