(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const audio = $("audio"), status = $("status"), list = $("chapters");
  const stateKey = "escuela-gloria:audiobook:panorama-nt-clase-02:v1";
  let manifest, chapters = [], current = 0, saveTimer, manifestUrl, initialized = false, transcriptItems = [], activeParagraph = -1, transcriptRequest = 0;
  const fmt = (s) => { if (!Number.isFinite(s) || s < 0) s = 0; const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=Math.floor(s%60).toString().padStart(2,"0"); return h ? `${h}:${m.toString().padStart(2,"0")}:${sec}` : `${m}:${sec}`; };
  const bytes = (n) => n >= 1e9 ? `${(n/1e9).toFixed(2)} GB` : `${(n/1e6).toFixed(1)} MB`;
  const getState = () => { try { return JSON.parse(localStorage.getItem(stateKey) || "{}"); } catch { return {}; } };
  const saveState = () => { if (!initialized || !chapters[current]) return; const s=getState(); s.chapter=chapters[current].id; s.position=Number.isFinite(audio.currentTime)?audio.currentTime:0; s.speed=audio.playbackRate; try{localStorage.setItem(stateKey,JSON.stringify(s));}catch{} };
  const setStatus = (text) => { status.textContent=text; };
  const baseForAssets = (manifestUrl) => { const configured=window.AUDIOBOOK_BASE_URL; return configured ? new URL(configured.endsWith("/")?configured:`${configured}/`,document.baseURI) : new URL("./",manifestUrl); };
  const trackUrl = (chapter) => new URL(chapter.file,baseForAssets(manifestUrl)).href;
  async function loadTranscript(chapter){
    const request=++transcriptRequest, content=$("reader-content"), label=$("reader-status");
    transcriptItems=[];activeParagraph=-1;content.replaceChildren();
    if(!chapter.transcript_file){label.textContent="El texto de lectura no está disponible para este capítulo.";return;}
    label.textContent="Cargando el texto…";
    try{
      const url=new URL(chapter.transcript_file,baseForAssets(manifestUrl));
      const response=await fetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();if(request!==transcriptRequest)return;
      if(data.chapter_id!==chapter.id||!Array.isArray(data.segments))throw new Error("El texto no corresponde al capítulo.");
      const fragment=document.createDocumentFragment();
      data.segments.forEach((segment,index)=>{
        const p=document.createElement("p");p.className="reader-paragraph";p.textContent=segment.text;
        p.dataset.start=String(segment.start_ms/1000);p.dataset.end=String(segment.end_ms/1000);
        fragment.append(p);transcriptItems.push({element:p,start:segment.start_ms/1000,end:segment.end_ms/1000});
      });
      content.append(fragment);label.textContent="Texto original del guion; el párrafo se resalta conforme avanza el audio.";updateTranscript(audio.currentTime,false);
    }catch(error){if(request===transcriptRequest)label.textContent="No se pudo cargar la lectura sincronizada. Puedes seguir escuchando el audio.";}
  }
  function updateTranscript(time,scroll=true){
    if(!transcriptItems.length)return;
    let lo=0,hi=transcriptItems.length-1,found=-1;
    while(lo<=hi){const mid=(lo+hi)>>1,item=transcriptItems[mid];if(time<item.start)hi=mid-1;else if(time>=item.end)lo=mid+1;else{found=mid;break;}}
    if(found<0){found=Math.max(0,Math.min(transcriptItems.length-1,lo-1));}
    if(found===activeParagraph)return;
    if(activeParagraph>=0){transcriptItems[activeParagraph].element.classList.remove("is-active");transcriptItems[activeParagraph].element.removeAttribute("aria-current");}
    activeParagraph=found;const active=transcriptItems[found].element;active.classList.add("is-active");active.setAttribute("aria-current","true");
    if(scroll)active.scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  function renderList(){
    list.replaceChildren();
    chapters.forEach((chapter,i)=>{
      const li=document.createElement("li");li.className="chapter-item";
      const num=document.createElement("span");num.className="chapter-number";num.textContent=String(i+1).padStart(2,"0");
      const button=document.createElement("button");button.className="chapter-select";button.type="button";button.dataset.index=i;button.textContent=chapter.title;
      const meta=document.createElement("span");meta.className="chapter-details";meta.textContent=`${fmt(chapter.duration_ms/1000)} · ${bytes(chapter.size_bytes)}`;button.append(meta);
      const download=document.createElement("a");download.className="chapter-download";download.href=trackUrl(chapter);download.download=chapter.file.split("/").pop();download.textContent="Descargar";download.setAttribute("aria-label",`Descargar ${chapter.title}`);
      li.append(num,button,download);list.append(li);
    });
  }
  function selectChapter(index, resume=0, autoplay=false){
    if(index<0||index>=chapters.length)return;
    saveState();current=index;const chapter=chapters[index];audio.pause();audio.src=trackUrl(chapter);
    $("current-title").textContent=chapter.title;$("seek").value="0";$("elapsed").textContent="0:00";$("remaining").textContent=`−${fmt(chapter.duration_ms/1000)}`;
    document.querySelectorAll(".chapter-select").forEach((b,i)=>b.setAttribute("aria-current",i===index?"true":"false"));
    setStatus("Cargando capítulo…");
    loadTranscript(chapter);
    const onMetadata=()=>{audio.removeEventListener("loadedmetadata",onMetadata);if(resume>0&&resume<audio.duration)audio.currentTime=resume;if(autoplay)audio.play().catch(()=>setStatus("Pulsa reproducir para iniciar el audio."));else setStatus("Listo para reproducir.");};
    audio.addEventListener("loadedmetadata",onMetadata);audio.load();
  }
  async function init(){
    try{
      const configured=window.AUDIOBOOK_MANIFEST_URL;
      manifestUrl=configured?new URL(configured,document.baseURI):new URL("./manifest.json",document.baseURI);
      window.__audiobookManifestUrl=manifestUrl.href;
      const response=await fetch(manifestUrl);if(!response.ok)throw new Error(`No se pudo cargar el catálogo (${response.status}).`);
      manifest=await response.json();chapters=[...manifest.chapters].sort((a,b)=>a.order-b.order);
      $("book-title").textContent=manifest.title;$("subtitle").textContent=manifest.subtitle||"";$("description").textContent=manifest.description||"";
      $("collection").textContent=(manifest.collection_id||"").replaceAll("-"," ").toUpperCase();$("cover").src=new URL(manifest.cover,baseForAssets(manifestUrl)).href;
      $("chapter-count").textContent=`${chapters.length} capítulos`;$("total-duration").textContent=`${fmt(manifest.total_duration_ms/1000)} en total`;$("size-total").textContent=`${bytes(manifest.total_size_bytes)} de audio`;
      const full=$("full-download");if(manifest.full_download){full.href=new URL(manifest.full_download,baseForAssets(manifestUrl)).href;full.download=manifest.full_download.split("/").pop();full.hidden=false;}
      renderList();const saved=getState();$("speed").value=String(saved.speed||1);audio.playbackRate=Number($("speed").value);
      const savedIndex=chapters.findIndex(c=>c.id===saved.chapter);selectChapter(savedIndex>=0?savedIndex:0,saved.position||0,false);initialized=true;
    }catch(e){setStatus(e.message||"No se pudo cargar el audiolibro.");}
  }
  list.addEventListener("click",e=>{const b=e.target.closest(".chapter-select");if(b)selectChapter(Number(b.dataset.index),0,true);});
  $("play").addEventListener("click",()=>{if(audio.paused)audio.play().then(()=>setStatus("Reproduciendo.")).catch(()=>setStatus("No se pudo iniciar el audio. Revisa tu conexión."));else{audio.pause();saveState();}});
  audio.addEventListener("play",()=>{$("play").textContent="❚❚";$("play").setAttribute("aria-label","Pausar");$("play").title="Pausar";});
  audio.addEventListener("pause",()=>{$("play").textContent="▶";$("play").setAttribute("aria-label","Reproducir");$("play").title="Reproducir";});
  audio.addEventListener("waiting",()=>setStatus("Cargando audio…"));audio.addEventListener("canplay",()=>setStatus("Reproducción disponible."));
  audio.addEventListener("error",()=>setStatus("No se pudo cargar este capítulo. Comprueba tu conexión o vuelve a intentarlo."));
  audio.addEventListener("timeupdate",()=>{const d=audio.duration||0,t=audio.currentTime||0;$("seek").value=d?String(Math.round(t/d*1000)):"0";$("elapsed").textContent=fmt(t);$("remaining").textContent=`−${fmt(Math.max(0,d-t))}`;updateTranscript(t);if(!saveTimer)saveTimer=setTimeout(()=>{saveState();saveTimer=null;},3000);});
  audio.addEventListener("loadedmetadata",()=>{const d=audio.duration||0;$("remaining").textContent=`−${fmt(d-audio.currentTime)}`;});
  audio.addEventListener("ended",()=>{if(current+1<chapters.length)selectChapter(current+1,0,true);else{setStatus("Audiolibro terminado.");saveState();}});
  $("seek").addEventListener("input",()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number($("seek").value)/1000*audio.duration;});
  $("previous").addEventListener("click",()=>selectChapter(Math.max(0,current-1),0,true));$("next").addEventListener("click",()=>selectChapter(Math.min(chapters.length-1,current+1),0,true));
  $("back").addEventListener("click",()=>{audio.currentTime=Math.max(0,audio.currentTime-15);});$("forward").addEventListener("click",()=>{audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);});
  $("speed").addEventListener("change",e=>{audio.playbackRate=Number(e.target.value);saveState();});
  document.addEventListener("keydown",e=>{if(e.target.matches("input,select,textarea,button,a"))return;if(e.code==="Space"){e.preventDefault();$("play").click();}else if(e.code==="ArrowLeft"){audio.currentTime=Math.max(0,audio.currentTime-15);}else if(e.code==="ArrowRight"){audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);}});
  window.addEventListener("pagehide",saveState);
  init();
})();
