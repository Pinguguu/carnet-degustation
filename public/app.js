(function(){
'use strict';
var CEPAGES=window.CEPAGES||[];

/* ---------- données ---------- */
var SCALE={
  type:['Blanc','Rosé','Rouge'], eff:['Tranquille','Pétillant','Mousseux'], limp:['Limpide','Trouble'], icol:['Pâle','Moyenne','Profonde'],
  cond:['Net','Défaut apparent'], inez:['Légère','Moyenne -','Moyenne','Moyenne +','Prononcée'],
  dev:['Jeune','En développement','Pleinement développé','Fatigué'], suc:['Sec','Demi-sec','Moelleux','Liquoreux'],
  n5:['Faible','Moyenne -','Moyenne','Moyenne +','Élevée'], alc:['Faible','Moyen','Élevé'], corps:['Léger','Moyen -','Moyen','Moyen +','Plein'],
  iboc:['Légère','Moyenne','Prononcée'], fin:['Courte','Moyenne -','Moyenne','Moyenne +','Longue'], yn:['Oui','Non'],
  qual:['Mauvaise','Passable','Bonne','Très bonne','Exceptionnelle'],
  mat:['Trop jeune','À boire maintenant (potentiel de garde)','À boire maintenant (pas de potentiel)','Trop vieux / en déclin']
};
var COLORS={Blanc:['Citron-vert','Citron','Or','Ambre','Brun'],'Rosé':['Rose','Saumon','Orange'],Rouge:['Pourpre','Rubis','Grenat','Tuilé','Brun']};
var HEX={'Citron-vert':'#DDE48B','Citron':'#EEDF7E','Or':'#DDB544','Ambre':'#C4862B','Brun':'#6E4126','Rose':'#F2B4C1','Saumon':'#F1A58A','Orange':'#E8894A','Pourpre':'#6B1450','Rubis':'#8E1230','Grenat':'#852020','Tuilé':'#A44C2E'};
var TYPEHEX={Blanc:'#EEDF7E','Rosé':'#F2B4C1',Rouge:'#8E1230'};

var F={
  date:{l:'Date',kind:'date'}, deg:{l:'Dégustateur',kind:'text'}, nom:{l:'Vin / cuvée',kind:'text',ph:'ex. Chablis 1er Cru Montmains',wide:1},
  prod:{l:'Producteur',kind:'text'}, app:{l:'Appellation, région, pays',kind:'text'}, cep:{l:'Cépage(s)',kind:'text'},
  mil:{l:'Millésime',kind:'text',ph:'2022',mode:'numeric'}, prix:{l:'Prix (€)',kind:'text',mode:'decimal'}, abv:{l:'Alcool indiqué (% vol.)',kind:'text',mode:'decimal'},
  type:{l:'Type de vin',kind:'seg',s:'type'}, eff:{l:'Effervescence',kind:'seg',s:'eff'},
  limp:{l:'Limpidité',kind:'seg',s:'limp'}, icol:{l:'Intensité de la couleur',kind:'seg',s:'icol'}, col:{l:'Couleur',kind:'color'},
  aobs:{l:'Autres observations',kind:'area',ph:'dépôt, larmes, bulles…',wide:1},
  cond:{l:'Condition',kind:'seg',s:'cond'}, inez:{l:'Intensité',kind:'seg',s:'inez'}, dev:{l:'Développement',kind:'seg',s:'dev'},
  anez:{l:'Caractéristiques aromatiques',kind:'aroma',ph:'agrumes, pomme verte, brioche…',wide:1},
  suc:{l:'Sucrosité',kind:'seg',s:'suc'}, aci:{l:'Acidité',kind:'seg',s:'n5'}, tan:{l:'Tanin (surtout les rouges)',kind:'seg',s:'n5'},
  ttan:{l:'Texture du tanin',kind:'text',ph:'grain fin, souple, rugueux…'}, alc:{l:'Alcool',kind:'seg',s:'alc'}, corps:{l:'Corps',kind:'seg',s:'corps'},
  mousse:{l:'Mousse (vins effervescents)',kind:'text',ph:'fine, persistante…'}, iboc:{l:'Intensité aromatique',kind:'seg',s:'iboc'}, fin:{l:'Finale',kind:'seg',s:'fin'},
  aboc:{l:'Caractéristiques aromatiques',kind:'aroma',ph:'citron vert, minéral…',wide:1}, bobs:{l:'Autres observations',kind:'area',ph:'texture, minéralité…',wide:1},
  bal:{l:'Équilibre',kind:'seg',s:'yn'}, lon:{l:'Longueur',kind:'seg',s:'yn'}, int:{l:'Intensité',kind:'seg',s:'yn'}, cpx:{l:'Complexité',kind:'seg',s:'yn'},
  qual:{l:'Niveau de qualité',kind:'seg',s:'qual',wide:1}, jqual:{l:'Justification de la qualité',kind:'area',wide:1},
  mat:{l:'Niveau de maturité',kind:'seg',s:'mat',wide:1}, com:{l:'Commentaire libre',kind:'area',wide:1}
};
var SECTIONS=[
  {t:'Le vin',keys:['date','deg','nom','prod','app','cep','mil','prix','abv','type','eff']},
  {n:1,t:'Apparence',keys:['limp','icol','col','aobs']},
  {n:2,t:'Nez',keys:['cond','inez','dev','anez']},
  {n:3,t:'Bouche',keys:['suc','aci','tan','ttan','alc','corps','mousse','iboc','fin','aboc','bobs']},
  {n:4,t:'Conclusions',keys:['bal','lon','int','cpx','qual','jqual','mat','com']}
];
var PROFILE=[['inez','Intensité nez'],['suc','Sucrosité'],['aci','Acidité'],['tan','Tanin'],['alc','Alcool'],['corps','Corps'],['iboc','Intensité bouche'],['fin','Finale']];
var DETAIL=[['Le vin',['cep','eff','prix','abv','deg']],['Apparence',['limp','icol','col','aobs']],['Nez',['cond','inez','dev','anez']],
  ['Bouche',['suc','aci','tan','ttan','alc','corps','mousse','iboc','fin','aboc','bobs']],['Conclusions',['bal','lon','int','cpx','qual','jqual','mat','com']]];
var JCOLS=['date','nom','prod','app','cep','mil','type','eff','limp','icol','col','aobs','cond','inez','anez','dev','suc','aci','tan','ttan','alc','corps','mousse','iboc','aboc','fin','bobs','bal','lon','int','cpx','qual','jqual','mat','abv','prix','deg','com'];
var FIELDKEYS=Object.keys(F);

var LEX=[
 {n:'Primaire',s:'cépage et fermentation',g:[
  ['Floral','acacia, chèvrefeuille, sureau, rose, violette'],
  ['Fruits verts','pomme verte, poire, coing, groseille à maquereau, raisin'],
  ['Agrumes','pamplemousse, citron vert, citron, orange'],
  ['Fruits à noyau','pêche, abricot, nectarine'],
  ['Fruits tropicaux','banane, litchi, mangue, melon, fruit de la passion, ananas'],
  ['Fruits rouges','fraise, framboise, groseille, cerise rouge'],
  ['Fruits noirs','cassis, mûre, myrtille, cerise noire, prune'],
  ['Herbacé','poivron vert, herbe coupée, feuille de tomate, asperge'],
  ['Herbes','menthe, eucalyptus, fenouil, aneth'],
  ['Épices','poivre blanc, poivre noir, réglisse']]},
 {n:'Secondaire',s:'vinification',g:[
  ['Lies, levures','biscuit, brioche, pain grillé, pâte, levure'],
  ['Malolactique','beurre, crème, fromage, yaourt'],
  ['Chêne','vanille, clou de girofle, noix de coco, cèdre, fumé, café, chocolat, grillé']]},
 {n:'Tertiaire',s:'vieillissement',g:[
  ['Fruits secs, cuits','raisin sec, figue, pruneau, confiture, kirsch'],
  ['Oxydatif','noix, noisette, amande, caramel, café, chocolat'],
  ['Bouteille, blancs','pétrole, kérosène, cannelle, gingembre, noix muscade, miel, champignon'],
  ['Bouteille, rouges','sous-bois, feuilles mortes, terre, cuir, gibier, viande, tabac, cèdre, champignon']]}
];
LEX.forEach(function(l){l.g=l.g.map(function(x){return [x[0],x[1].split(', ')];});});

/* ---------- utilitaires ---------- */
function $(s,r){return (r||document).querySelector(s);}
function h(tag,attrs){
  var e=document.createElement(tag),i,k,v,kids=Array.prototype.slice.call(arguments,2);
  if(attrs){for(k in attrs){v=attrs[k];if(v==null||v===false)continue;
    if(k==='class')e.className=v;else if(k==='text')e.textContent=v;
    else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v);}}
  (function add(list){list.forEach(function(c){if(c==null||c===false)return;if(Array.isArray(c))return add(c);e.append(c.nodeType?c:document.createTextNode(c));});})(kids);
  return e;
}
function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmtDate(s){var p=String(s||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:(s||'');}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}
function newId(){return 'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function levels(t){
  if(!t||t==='—')return null;
  var re=/(très élevé|faible|léger|légère|moyen(?:ne)?|élevée?|plein)([+\-])?/gi,m,vals=[];
  while((m=re.exec(t))){
    var w=m[1].toLowerCase(),v;
    if(w==='faible'||w.indexOf('léger')===0)v=1;
    else if(w.indexOf('moyen')===0)v=m[2]==='+'?4:(m[2]==='-'?2:3);
    else v=5;
    vals.push(v);
  }
  return vals.length?[Math.min.apply(null,vals),Math.max.apply(null,vals)]:null;
}

/* ---------- état ---------- */
var entry,editId=null,editMeta=null,entries=[],ready=false,jfail=false,me=null,libs={};
var els={},toastTimer=null,draftTimer=null,openIds={},jfilter={q:'',type:''},cfilter={q:'',col:''},cOpen={};
function blank(keepDeg){var e={date:today()};if(keepDeg&&entry&&entry.deg)e.deg=entry.deg;return e;}
entry=blank(false);

/* ---------- fiche : construction ---------- */
function labelFor(k){return h('label',{class:'lab',id:'l-'+k,for:'f-'+k},F[k].l);}
function buildField(k){
  var f=F[k],w=h('div',{class:'field'+(f.wide?' wide':'')}),c;
  if(f.kind==='text'||f.kind==='date'){
    c=h('input',{class:'inp',id:'f-'+k,type:f.kind==='date'?'date':'text',placeholder:f.ph||null,inputmode:f.mode||null,autocomplete:'off',
      oninput:function(){setVal(k,c.value,true);}});
    els[k]={input:c};w.append(labelFor(k),c);
    if(k==='nom')w.append(h('p',{class:'err',id:'nom-err',hidden:true},'Renseigne au moins le nom du vin.'));
  }else if(f.kind==='area'){
    c=h('textarea',{class:'ta',id:'f-'+k,rows:2,placeholder:f.ph||null,oninput:function(){setVal(k,c.value,true);}});
    els[k]={input:c};w.append(labelFor(k),c);
  }else if(f.kind==='aroma'){
    c=h('textarea',{class:'ta',id:'f-'+k,rows:2,placeholder:f.ph||null,oninput:function(){setVal(k,c.value,true);}});
    var chips=[],box=h('div',{class:'lexbox'});
    LEX.forEach(function(l){
      var grp=h('div',null,h('p',{class:'lexlvl-t'},l.n+' · '+l.s));
      l.g.forEach(function(g){
        var row=h('div',{class:'chips'});
        g[1].forEach(function(t){
          var b=h('button',{type:'button',class:'chip','aria-pressed':'false',onclick:function(){toggleTerm(k,t);}},t);
          b._t=t;chips.push(b);row.append(b);
        });
        grp.append(h('div',{class:'lexgrp'},h('span',{class:'lexg'},g[0]),row));
      });
      box.append(grp);
    });
    els[k]={input:c,chips:chips};
    w.append(labelFor(k),c,h('details',{class:'lex'},h('summary',null,'Choisir dans le lexique'),box));
  }else if(f.kind==='seg'){
    var opts=SCALE[f.s],g=h('div',{class:'seg',role:'radiogroup','aria-labelledby':'l-'+k});
    var btns=opts.map(function(o){
      var b=h('button',{type:'button',role:'radio','aria-checked':'false',class:'opt',onclick:function(){setVal(k,entry[k]===o?'':o);}},o);
      g.append(b);return b;
    });
    els[k]={btns:btns,opts:opts};
    w.append(h('span',{class:'lab',id:'l-'+k},f.l),g);
  }else if(f.kind==='color'){
    var box2=h('div',{class:'swatches',role:'radiogroup','aria-labelledby':'l-col'});
    els[k]={box:box2};
    w.append(h('span',{class:'lab',id:'l-col'},f.l+' (selon le type de vin)'),box2);
  }
  return w;
}
function buildForm(){
  var st=$('#fstack');
  st.append(h('div',{class:'editbar',id:'editbar',hidden:true},
    h('span',{id:'edittxt'}),
    h('button',{class:'btn sm',type:'button',onclick:function(){resetForm();toast('Modification annulée');}},'Annuler la modification')));
  SECTIONS.forEach(function(s){
    var fields=h('div',{class:'fields'});
    s.keys.forEach(function(k){fields.append(buildField(k));});
    st.append(h('section',{class:'sec','aria-labelledby':'s-'+(s.n||0)},
      h('div',{class:'sec-h'},s.n?h('span',{class:'step'},'Étape '+s.n+' sur 4'):h('span',{class:'step'},'Identification'),h('h2',{id:'s-'+(s.n||0)},s.t)),
      fields));
  });
}
function buildProfile(){
  var p=$('#profile');
  els.sum={dot:h('span',{class:'p-dot'}),name:h('p',{class:'p-name'}),meta:h('p',{class:'p-meta'}),rows:{},concl:{}};
  p.append(h('div',{class:'p-head'},els.sum.dot,h('div',null,els.sum.name,els.sum.meta)));
  PROFILE.forEach(function(r){
    var k=r[0],n=SCALE[F[k].s].length,cells=[];
    for(var i=0;i<n;i++)cells.push(h('i'));
    var v=h('span',{class:'v'});
    els.sum.rows[k]={cells:cells,v:v};
    p.append(h('div',{class:'prow'},h('span',{class:'k'},r[1]),h('div',{class:'gauge','aria-hidden':'true'},cells),v));
  });
  var c=h('div',{class:'concl'});
  [['bal','Équilibre'],['lon','Longueur'],['int','Intensité'],['cpx','Complexité'],['qual','Qualité'],['mat','Maturité']].forEach(function(r){
    var v=h('span');els.sum.concl[r[0]]=v;c.append(h('div',{class:'r'},h('span',null,r[1]),v));
  });
  p.append(c);
}

/* ---------- fiche : état et synchro ---------- */
function setVal(k,v,fromInput){
  entry[k]=v;
  if(k==='type'&&entry.col&&(COLORS[v]||[]).indexOf(entry.col)<0)entry.col='';
  if(!fromInput)syncField(k);
  if(k==='type')renderColors();
  if(els[k]&&els[k].chips)syncChips(k);
  if(k==='nom'&&v)$('#nom-err').hidden=true;
  renderSummary();queueDraft();
}
function syncField(k){
  var e=els[k],f=F[k];if(!e)return;
  if(e.input)e.input.value=entry[k]||'';
  if(e.btns)e.btns.forEach(function(b,i){var on=entry[k]===e.opts[i];b.setAttribute('aria-checked',on?'true':'false');b.classList.toggle('on',on);});
  if(e.chips)syncChips(k);
  if(f.kind==='color')renderColors();
}
function syncChips(k){
  var have=splitTerms(entry[k]).map(norm);
  els[k].chips.forEach(function(b){var on=have.indexOf(norm(b._t))>=0;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');});
}
function splitTerms(s){return String(s||'').split(',').map(function(x){return x.trim();}).filter(Boolean);}
function toggleTerm(k,t){
  var arr=splitTerms(entry[k]),i=arr.map(norm).indexOf(norm(t));
  if(i>=0)arr.splice(i,1);else arr.push(t);
  setVal(k,arr.join(', '));
}
function renderColors(){
  var box=els.col.box;box.textContent='';
  if(!entry.type){box.append(h('p',{class:'hint'},'Choisis d’abord le type de vin dans « Le vin ».'));return;}
  COLORS[entry.type].forEach(function(c){
    var on=entry.col===c;
    box.append(h('button',{type:'button',role:'radio','aria-checked':on?'true':'false',class:'swb'+(on?' on':''),
      onclick:function(){setVal('col',entry.col===c?'':c);}},h('i',{style:'background:'+HEX[c]}),c));
  });
}
function syncAll(){
  FIELDKEYS.forEach(syncField);renderColors();renderSummary();updateBar();
}
function gaugeFill(cells,idx){cells.forEach(function(c,i){c.classList.toggle('on',idx>=0&&i<=idx);});}
function renderSummary(){
  var s=els.sum;
  s.name.textContent=entry.nom||'Nouveau vin';
  var meta=[entry.prod,entry.app,entry.mil].filter(Boolean).join(' · ');
  s.meta.textContent=meta||'Le profil se dessine au fil de la dégustation.';
  s.dot.style.background=entry.col?HEX[entry.col]:(entry.type?TYPEHEX[entry.type]:'');
  PROFILE.forEach(function(r){
    var k=r[0],row=s.rows[k],i=SCALE[F[k].s].indexOf(entry[k]);
    gaugeFill(row.cells,i);row.v.textContent=i>=0?entry[k]:'—';
  });
  ['bal','lon','int','cpx','qual','mat'].forEach(function(k){s.concl[k].textContent=entry[k]||'—';});
}
function isEmpty(){return FIELDKEYS.every(function(k){return !entry[k]||((k==='date'&&entry[k]===today())||k==='deg');});}
function updateBar(){
  $('#bsave').textContent=editId?'Mettre à jour le vin':'Enregistrer dans le journal';
  if(editId)blindOn=false;
  paintBlind();
  var eb=$('#editbar');eb.hidden=!editId;
  if(editId)$('#edittxt').textContent='Modification de « '+(entry.nom||'ce vin')+' ». Les changements remplacent la ligne du journal.';
  $('#barnote').textContent=editId?'':'';
}
function draftKey(){return me?'carnet-draft-v2:'+me.username:null;}
function writeDraft(){var k=draftKey();if(k)lsSet(k,JSON.stringify({entry:entry,editId:editId,editMeta:editMeta}));}
function queueDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(writeDraft,400);}
window.addEventListener('pagehide',function(){if(draftTimer){clearTimeout(draftTimer);draftTimer=null;if(!isEmpty()||editId)writeDraft();}});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&draftTimer){clearTimeout(draftTimer);draftTimer=null;writeDraft();}});
function restoreDraft(){
  var k=draftKey(),raw=k?lsGet(k):null;if(!raw)return;
  try{var d=JSON.parse(raw);if(d&&d.entry&&typeof d.entry==='object'){entry=Object.assign(blank(false),d.entry);editId=d.editId||null;editMeta=d.editMeta||null;}}catch(e){}
}
var blindOn=false;
function paintBlind(){
  var b=$('#bblind');if(!b)return;
  b.hidden=!!editId;b.classList.toggle('on',blindOn);b.setAttribute('aria-pressed',blindOn?'true':'false');
  b.textContent=blindOn?'À l\'aveugle : activé':'À l\'aveugle : désactivé';
  $('#bsave').textContent=editId?'Mettre à jour le vin':(blindOn?'Enregistrer sans nom':'Enregistrer dans le journal');
}
function resetForm(){
  blindOn=false;entry=blank(true);editId=null;editMeta=null;var k=draftKey();if(k)lsDel(k);syncAll();
}

/* ---------- API, compte et journal ---------- */
async function api(method,path,body){
  var opts={method:method,credentials:'same-origin',headers:{}};
  if(body!==undefined){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);}
  var res;
  try{res=await fetch(path,opts);}catch(e){throw {status:0,message:'Connexion impossible. Vérifie ton réseau et réessaie.'};}
  var data=null;try{data=await res.json();}catch(e){}
  if(!res.ok){
    var err={status:res.status,message:(data&&data.error)||'Erreur du serveur. Réessaie dans un instant.',inviteRequired:!!(data&&data.inviteRequired)};
    if(res.status===401&&me)sessionLost();
    throw err;
  }
  return data;
}
function sessionLost(){
  if(!me)return;
  clearTimeout(draftTimer);draftTimer=null;writeDraft();me=null;
  toast('Ta session a expiré : reconnecte-toi.');
  setTimeout(function(){location.reload();},1200);
}
function upsertLocal(list){
  list.forEach(function(e){var i=entries.findIndex(function(x){return x.id===e.id;});if(i>=0)entries[i]=e;else entries.push(e);});
}
var store={
  save:async function(e){var r=await api('PUT','/api/journal/'+encodeURIComponent(e.id),e);upsertLocal([r.entry]);renderJournal();return r.entry;},
  saveMany:async function(list){
    var done=0;
    try{
      for(var i=0;i<list.length;i+=50){
        var r=await api('POST','/api/journal',{entries:list.slice(i,i+50)});
        upsertLocal(r.entries);done+=r.entries.length;renderJournal();
      }
    }catch(err){err.done=done;throw err;}
    return done;
  },
  remove:async function(id){await api('DELETE','/api/journal/'+encodeURIComponent(id));entries=entries.filter(function(x){return x.id!==id;});renderJournal();}
};
async function loadJournal(){
  jfail=false;ready=false;renderJournal();
  try{var r=await api('GET','/api/journal');entries=r.entries||[];ready=true;}
  catch(e){jfail=true;}
  renderJournal();
}
function loadLib(src){
  if(libs[src])return libs[src];
  libs[src]=new Promise(function(res,rej){
    var el=document.createElement('script');el.src=src;
    el.onload=function(){res();};el.onerror=function(){delete libs[src];rej(new Error('chargement impossible : '+src));};
    document.head.appendChild(el);
  });
  return libs[src];
}

/* ---------- écran de connexion ---------- */
var authMode='login',inviteNeeded=false;
function setAuthMode(m){
  authMode=m;
  var reg=m==='register';
  [['au-m-login',!reg],['au-m-register',reg]].forEach(function(p){var b=$('#'+p[0]);b.classList.toggle('on',p[1]);b.setAttribute('aria-checked',p[1]?'true':'false');});
  $('#au-invite-f').hidden=!(reg&&inviteNeeded);
  $('#au-pass').setAttribute('autocomplete',reg?'new-password':'current-password');
  $('#au-submit').textContent=reg?'Créer mon compte':'Se connecter';
  $('#au-note').textContent=reg
    ?'Identifiant : 3 à 24 caractères (lettres minuscules, chiffres, point, tiret, tiret bas). Mot de passe : 8 caractères minimum.'
    :'Mot de passe oublié ? Il n’y a pas d’e-mail : demande à la personne qui gère le site de le réinitialiser.';
  $('#au-err').hidden=true;
}
function showAuth(msg){
  $('#app').hidden=true;$('#authwrap').hidden=false;setAuthMode('login');
  if(msg){$('#au-err').textContent=msg;$('#au-err').hidden=false;}
  $('#au-user').focus();
}
async function submitAuth(ev){
  ev.preventDefault();
  var body={username:$('#au-user').value.trim(),password:$('#au-pass').value};
  if(!body.username||!body.password){$('#au-err').textContent='Saisis ton identifiant et ton mot de passe.';$('#au-err').hidden=false;return;}
  if(authMode==='register')body.invite=$('#au-invite').value;
  var btn=$('#au-submit');btn.disabled=true;$('#au-err').hidden=true;
  var user=null;
  try{user=(await api('POST',authMode==='login'?'/api/login':'/api/register',body)).user;}
  catch(e){
    if(e.inviteRequired&&!inviteNeeded){inviteNeeded=true;setAuthMode(authMode);}
    $('#au-err').textContent=e.message;$('#au-err').hidden=false;btn.disabled=false;return;
  }
  btn.disabled=false;$('#au-pass').value='';$('#au-invite').value='';
  await enterApp(user);
}
function startTab(){var hash=(location.hash||'').slice(1);return ['fiche','journal','cepages','lexique','compte'].indexOf(hash)>=0?hash:'fiche';}
async function enterApp(user){
  me=user;
  $('#authwrap').hidden=true;$('#app').hidden=false;
  $('#acname').textContent=user.username;
  restoreDraft();syncAll();
  show(startTab());
  await loadJournal();
}
async function boot(){
  var user=null;
  try{user=(await api('GET','/api/me')).user;}
  catch(e){inviteNeeded=!!(e&&e.inviteRequired);showAuth(e&&e.status===0?e.message:'');return;}
  await enterApp(user);
}

/* ---------- compte ---------- */
function showErr(sel,msg){var e=$(sel);e.textContent=msg||'';e.hidden=!msg;}
async function logout(){
  clearTimeout(draftTimer);draftTimer=null;writeDraft();
  try{await api('POST','/api/logout');}catch(e){toast('Déconnexion impossible : '+e.message);return;}
  me=null;location.reload();
}
async function changePassword(ev){
  ev.preventDefault();showErr('#pw-err','');
  var cur=$('#pw-cur').value,nw=$('#pw-new').value,nw2=$('#pw-new2').value;
  if(!cur){showErr('#pw-err','Saisis ton mot de passe actuel.');return;}
  if(nw.length<8){showErr('#pw-err','Le nouveau mot de passe doit contenir au moins 8 caractères.');return;}
  if(nw!==nw2){showErr('#pw-err','Les deux nouveaux mots de passe sont différents.');return;}
  try{await api('POST','/api/password',{current:cur,next:nw});}
  catch(e){showErr('#pw-err',e.message);return;}
  ['#pw-cur','#pw-new','#pw-new2'].forEach(function(x){$(x).value='';});
  toast('Mot de passe changé. Les autres appareils devront se reconnecter.');
}
var delArmed=false,delTimer=null;
function disarmDelete(){delArmed=false;clearTimeout(delTimer);var b=$('#del-btn');b.textContent='Supprimer mon compte';b.classList.remove('warn');}
async function deleteAccount(ev){
  ev.preventDefault();showErr('#del-err','');
  var pw=$('#del-pw').value;
  if(!pw){showErr('#del-err','Saisis ton mot de passe pour confirmer.');return;}
  if(!delArmed){delArmed=true;var b=$('#del-btn');b.textContent='Confirmer la suppression définitive';b.classList.add('warn');delTimer=setTimeout(disarmDelete,5000);return;}
  clearTimeout(delTimer);
  try{await api('DELETE','/api/me',{password:pw});}
  catch(e){disarmDelete();showErr('#del-err',e.message);return;}
  var k=draftKey();if(k)lsDel(k);
  me=null;location.reload();
}

/* ---------- enregistrer / vider ---------- */
var clearArmed=false,clearTimer=null;
async function saveEntry(){
  var blind=blindOn&&!editId;
  if(!blind&&!String(entry.nom||'').trim()){
    $('#nom-err').hidden=false;
    var i=els.nom.input;i.focus();i.scrollIntoView({block:'center',behavior:'smooth'});return;
  }
  var now=new Date().toISOString(),o={};
  FIELDKEYS.forEach(function(k){if(entry[k])o[k]=entry[k];});
  o.id=editId||newId();o.createdAt=(editMeta&&editMeta.createdAt)||now;o.updatedAt=now;
  var btn=$('#bsave'),btn2=$('#bblind');btn.disabled=true;btn2.disabled=true;
  try{
    await store.save(o);
    var wasEdit=!!editId,name=entry.nom||'Dégustation à l\'aveugle';
    resetForm();
    toast(wasEdit?'« '+name+' » mis à jour':'« '+name+' » ajouté au journal','Voir le journal',function(){show('journal');});
  }catch(e){
    console.warn(e);toast('Enregistrement impossible : '+((e&&e.message)||'réessaie dans un instant.'));
  }finally{btn.disabled=false;btn2.disabled=false;}
}
function clearForm(){
  var b=$('#bclear');
  if(isEmpty()&&!editId){toast('La fiche est déjà vide');return;}
  if(!clearArmed){clearArmed=true;b.textContent='Confirmer ?';b.classList.add('warn');
    clearTimer=setTimeout(disarm,3500);return;}
  disarm();resetForm();toast('Fiche vidée');
}
function disarm(){clearArmed=false;clearTimeout(clearTimer);var b=$('#bclear');b.textContent='Vider la fiche';b.classList.remove('warn');}

/* ---------- journal ---------- */
function tabCount(){$('#jcount').textContent=ready&&entries.length?String(entries.length):'';}
function matchEntry(e,q){
  if(!q)return true;
  var hay=norm(['nom','prod','app','cep','mil','type','col','anez','aboc','com'].map(function(k){return e[k]||'';}).join(' '));
  return norm(q).split(/\s+/).every(function(t){return hay.indexOf(t)>=0;});
}
function renderJournal(){
  tabCount();
  var list=$('#jlist');if(!list)return;list.textContent='';
  $('#jstore').textContent='Journal privé, enregistré sur ton compte et disponible sur tous tes appareils. Télécharge-le en Excel pour en garder une copie.';
  if(jfail&&!ready){
    $('#jn').textContent='';
    list.append(h('div',{class:'empty'},h('h3',null,'Journal indisponible'),h('p',{class:'hint'},'Impossible de charger ton journal pour l’instant.'),
      h('div',null,h('button',{class:'btn pri',type:'button',onclick:loadJournal},'Réessayer'))));
    return;
  }
  if(!ready){list.append(h('p',{class:'hint'},'Chargement du journal…'));$('#jn').textContent='';return;}
  if(!entries.length){
    $('#jn').textContent='';
    var ex=h('div',{class:'entry ghost','aria-hidden':'true'},h('div',{class:'rh'},h('span',{class:'dot',style:'background:#DDB544'}),
      h('div',null,h('div',{class:'e-name'},'Chablis 1er Cru ',h('span',{class:'tagex'},'exemple')),h('div',{class:'e-meta'},'Domaine X · Bourgogne · Chardonnay · 2022')),
      h('div',{class:'e-side'},h('span',{class:'pill'},'Blanc'),h('span',{class:'pill q'},'Très bonne'))));
    list.append(h('div',{class:'empty'},h('h3',null,'Aucun vin enregistré'),
      h('p',{class:'hint'},'Remplis la fiche puis appuie sur « Enregistrer dans le journal » : le vin apparaît ici et la fiche se vide, prête pour le suivant.'),
      h('div',null,h('button',{class:'btn pri',type:'button',onclick:function(){show('fiche');}},'Ouvrir la fiche')),ex));
    return;
  }
  var rows=entries.filter(function(e){return matchEntry(e,jfilter.q)&&(!jfilter.type||e.type===jfilter.type);});
  rows.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||''));});
  $('#jn').textContent=rows.length+' / '+entries.length+' vin'+(entries.length>1?'s':'');
  if(!rows.length){list.append(h('p',{class:'hint'},'Aucun vin ne correspond à cette recherche.'));return;}
  rows.forEach(function(e){list.append(entryEl(e));});
}
function entryEl(e){
  var open=!!openIds[e.id];
  var det=h('div',{class:'detail',hidden:!open});
  var head=h('button',{class:'rh',type:'button','aria-expanded':open?'true':'false',onclick:function(){
      open=!open;openIds[e.id]=open;head.setAttribute('aria-expanded',open?'true':'false');det.hidden=!open;if(open&&!det.firstChild)fillDetail(det,e);}},
    h('span',{class:'dot',style:e.col?'background:'+HEX[e.col]:(e.type?'background:'+TYPEHEX[e.type]:null)}),
    h('div',{style:'min-width:0'},h('div',{class:'e-name'},e.nom||'À l\'aveugle'),
      h('div',{class:'e-meta'},[fmtDate(e.date),e.prod,e.app,e.cep,e.mil].filter(Boolean).join(' · '))),
    h('div',{class:'e-side'},e.type?h('span',{class:'pill'},e.type):null,e.qual?h('span',{class:'pill q'},e.qual):null));
  if(open)fillDetail(det,e);
  return h('article',{class:'entry'},head,det);
}
function fillDetail(det,e){
  det.textContent='';
  DETAIL.forEach(function(g){
    var items=g[1].filter(function(k){return e[k];}).map(function(k){
      var v=k==='prix'?e[k]+' €':(k==='abv'?e[k]+' % vol.':e[k]);
      return h('div',{class:'it'},h('b',null,F[k].l),h('span',null,v));
    });
    if(items.length)det.append(h('div',null,h('p',{class:'dgrp-t'},g[0]),h('div',{class:'kv'},items)));
  });
  var del=h('button',{class:'btn sm',type:'button'},'Supprimer'),armed=false,t;
  del.addEventListener('click',async function(){
    if(!armed){armed=true;del.textContent='Confirmer la suppression';del.classList.add('warn');t=setTimeout(function(){armed=false;del.textContent='Supprimer';del.classList.remove('warn');},3500);return;}
    clearTimeout(t);
    try{await store.remove(e.id);delete openIds[e.id];toast('« '+(e.nom||'Vin')+' » supprimé');}catch(err){toast('Suppression impossible : '+((err&&err.message)||'réessaie.'));}
  });
  det.append(h('div',{class:'acts'},h('button',{class:'btn sm pri',type:'button',onclick:function(){downloadSheet(e);}},'Télécharger la fiche'),h('button',{class:'btn sm',type:'button',onclick:function(){startEdit(e);}},'Modifier dans la fiche'),del));
}
function startEdit(e){
  var n=blank(false);FIELDKEYS.forEach(function(k){if(e[k])n[k]=e[k];});
  entry=n;editId=e.id;editMeta={createdAt:e.createdAt};syncAll();queueDraft();show('fiche');window.scrollTo(0,0);
}
function slug(t){return norm(t).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'vin';}
function sheetModel(e){
  var groups=[];
  SECTIONS.forEach(function(sec){
    var rows=[];
    sec.keys.forEach(function(k){
      var v=e[k];if(!v||k==='nom')return;
      if(k==='date')v=fmtDate(v);else if(k==='prix')v=v+' €';else if(k==='abv')v=v+' % vol.';
      rows.push([F[k].l,String(v)]);
    });
    if(rows.length)groups.push({t:sec.n?'Étape '+sec.n+' · '+sec.t:sec.t,rows:rows});
  });
  return {title:e.nom||'À l\'aveugle',meta:[e.prod,e.app,e.mil].filter(Boolean).join(' · '),groups:groups};
}
function sheetText(e){
  var m=sheetModel(e),out=[m.title];
  if(m.meta)out.push(m.meta);
  m.groups.forEach(function(g){out.push('','== '+g.t+' ==');g.rows.forEach(function(r){out.push(r[0]+' : '+r[1]);});});
  return out.join('\r\n')+'\r\n';
}
function rgb(hex){var n=parseInt(String(hex).replace('#',''),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function buildPdf(e){
  var J=window.jspdf&&window.jspdf.jsPDF;if(!J)return null;
  var m=sheetModel(e),doc=new J({unit:'mm',format:'a4'}),W=210,H=297,M=18,cw=W-2*M,y=M,LH=4.7,LW=46;
  function ensure(n){if(y+n>H-16){doc.addPage();y=M;}}
  var hex=e.col?HEX[e.col]:(e.type?TYPEHEX[e.type]:null),tx=M;
  if(hex){var c=rgb(hex);doc.setFillColor(c[0],c[1],c[2]);doc.setDrawColor(120,110,125);doc.circle(M+4.5,y+3.2,4.2,'FD');tx=M+13;}
  doc.setFont('helvetica','bold');doc.setFontSize(20);doc.setTextColor(29,20,34);
  var tl=doc.splitTextToSize(m.title,W-M-tx);doc.text(tl,tx,y+5);y+=Math.max(9,tl.length*8.2);
  if(m.meta){doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(106,96,115);
    var ml=doc.splitTextToSize(m.meta,W-M-tx);doc.text(ml,tx,y);y+=ml.length*LH;}
  y+=3;doc.setDrawColor(123,30,62);doc.setLineWidth(0.6);doc.line(M,y,W-M,y);y+=7;
  m.groups.forEach(function(g){
    ensure(14);
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(123,30,62);doc.text(g.t.toUpperCase(),M,y);
    doc.setDrawColor(220,216,225);doc.setLineWidth(0.2);doc.line(M,y+1.6,W-M,y+1.6);y+=6.5;
    g.rows.forEach(function(r){
      doc.setFont('helvetica','normal');doc.setFontSize(10);
      var lines=doc.splitTextToSize(r[1],cw-LW);
      ensure(lines.length*LH+2);
      doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(106,96,115);
      doc.text(doc.splitTextToSize(r[0],LW-4),M,y);
      doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(29,20,34);
      doc.text(lines,M+LW,y);
      y+=Math.max(lines.length,1)*LH+1.8;
    });
    y+=4;
  });
  var n=doc.getNumberOfPages();
  for(var i=1;i<=n;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(150,140,158);
    doc.text('Carnet de dégustation',M,H-9);doc.text('Page '+i+' / '+n,W-M,H-9,{align:'right'});}
  return doc.output('arraybuffer');
}
async function downloadSheet(e){
  var base='fiche-'+slug(e.nom)+(e.date?'-'+e.date:''),text=sheetText(e),pdf=null;
  try{await loadLib('/vendor/jspdf.umd.min.js');pdf=buildPdf(e);}catch(err){console.warn('pdf',err);}
  if(pdf)return saveFile(base+'.pdf',pdf);
  return saveFile(base+'.txt',text);
}
var MIME={pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',txt:'text/plain;charset=utf-8'};
function browserDownload(name,data){
  var ext=name.split('.').pop(),blob=new Blob([data],{type:MIME[ext]||'application/octet-stream'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},4000);
}
function saveFile(name,data){
  try{browserDownload(name,data);toast('Fichier téléchargé : « '+name+' »');}
  catch(e){console.warn(e);toast('Téléchargement impossible. Réessaie.');}
}
function needData(){if(!entries.length){toast('Le journal est vide pour l’instant.');return false;}return true;}

/* ---------- Excel : export et import ---------- */
var EXH={date:'Date',nom:'Vin / cuvée',prod:'Producteur',app:'Région / appellation',cep:'Cépage(s)',mil:'Millésime',type:'Type',eff:'Effervescence',
  limp:'Limpidité',icol:'Intensité couleur',col:'Couleur',aobs:'Obs. apparence',cond:'Condition (nez)',inez:'Intensité nez',anez:'Arômes nez',dev:'Développement',
  suc:'Sucrosité',aci:'Acidité',tan:'Tanin',ttan:'Texture du tanin',alc:'Alcool',corps:'Corps',mousse:'Mousse',iboc:'Intensité arômes bouche',aboc:'Arômes bouche',
  fin:'Finale',bobs:'Obs. bouche',bal:'Équilibre',lon:'Longueur',int:'Intensité',cpx:'Complexité',qual:'Qualité',jqual:'Justification qualité',mat:'Maturité',
  abv:'Alcool indiqué (% vol.)',prix:'Prix (€)',deg:'Dégustateur',com:'Commentaire'};
var EXW={date:12,nom:28,prod:22,app:24,cep:20,mil:10,type:9,eff:13,limp:11,icol:13,col:12,aobs:28,cond:15,inez:14,anez:34,dev:18,suc:11,aci:11,tan:11,ttan:18,
  alc:9,corps:10,mousse:14,iboc:14,aboc:34,fin:10,bobs:28,bal:10,lon:10,int:10,cpx:11,qual:16,jqual:34,mat:34,abv:12,prix:9,deg:14,com:36};
function sortedEntries(){return entries.slice().sort(function(a,b){return String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||''));});}
async function buildXlsx(){
  await loadLib('/vendor/exceljs.min.js');
  var wb=new ExcelJS.Workbook();wb.creator='Carnet de dégustation';wb.created=new Date();
  var ws=wb.addWorksheet('Journal',{views:[{state:'frozen',xSplit:2,ySplit:1}]});
  var cols=JCOLS.map(function(k){return {header:EXH[k],key:k,width:EXW[k]||14};}).concat([{header:'ID',key:'id',width:12}]);
  ws.columns=cols;
  sortedEntries().forEach(function(e){
    var row={};
    JCOLS.forEach(function(k){
      var v=e[k];if(!v)return;
      if(k==='date'){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);row[k]=m?new Date(Date.UTC(+m[1],+m[2]-1,+m[3])):v;}
      else if((k==='mil'||k==='prix'||k==='abv')&&/^\d+([.,]\d+)?$/.test(v))row[k]=parseFloat(v.replace(',','.'));
      else row[k]=v;
    });
    row.id=e.id;ws.addRow(row);
  });
  var head=ws.getRow(1);head.height=34;
  head.eachCell(function(c){
    c.font={name:'Arial',size:10,bold:true,color:{argb:'FFFFFFFF'}};
    c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF7B1E3E'}};
    c.alignment={vertical:'middle',horizontal:'center',wrapText:true};
  });
  for(var r=2;r<=ws.rowCount;r++){
    ws.getRow(r).eachCell({includeEmpty:true},function(c,n){
      c.font={name:'Arial',size:n===cols.length?8:10,color:{argb:n===cols.length?'FF808080':'FF1D1422'}};
      c.alignment={vertical:'top',wrapText:true};
      c.border={bottom:{style:'thin',color:{argb:'FFDCD8E1'}}};
    });
  }
  ws.getColumn('date').numFmt='dd/mm/yyyy';
  ws.autoFilter={from:{row:1,column:1},to:{row:1,column:cols.length}};
  var buf=await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}
async function downloadXlsx(){
  if(!needData())return;
  var data;
  try{data=await buildXlsx();}catch(e){console.warn(e);toast('Impossible de créer le fichier Excel : vérifie ta connexion et réessaie.');return;}
  await saveFile('journal-degustation-'+today()+'.xlsx',data);
}
function cellVal(v,key){
  if(v==null)return '';
  if(v instanceof Date){
    var p=function(n){return String(n).padStart(2,'0');};
    return key==='date'?v.getUTCFullYear()+'-'+p(v.getUTCMonth()+1)+'-'+p(v.getUTCDate()):v.toISOString();
  }
  if(typeof v==='number'){
    if(key==='date'){var d=new Date(Date.UTC(1899,11,30)+Math.round(v)*864e5);return cellVal(d,'date');}
    return String(v);
  }
  if(typeof v==='object'){
    if(Array.isArray(v.richText))return v.richText.map(function(t){return t.text;}).join('');
    if('result' in v)return cellVal(v.result,key);
    if('text' in v)return String(v.text);
    return '';
  }
  var s=String(v).trim();
  if(key==='date'){var m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');}
  return s;
}
async function importXlsx(file){
  if(!file)return;
  try{await loadLib('/vendor/exceljs.min.js');}catch(e){toast('Impossible de lire un fichier Excel pour l’instant. Réessaie.');return;}
  var wb=new ExcelJS.Workbook();
  try{await wb.xlsx.load(await file.arrayBuffer());}catch(e){toast('Ce fichier n’est pas un classeur Excel (.xlsx) lisible.');return;}
  var ws=wb.getWorksheet('Journal')||wb.worksheets[0];
  if(!ws){toast('Ce classeur est vide.');return;}
  var rev={id:'id'};Object.keys(EXH).forEach(function(k){rev[norm(EXH[k])]=k;});
  var hdr={},hasNom=false;
  ws.getRow(1).eachCell(function(c,n){var k=rev[norm(cellVal(c.value,''))];if(k){hdr[n]=k;if(k==='nom')hasNom=true;}});
  if(!hasNom){toast('Colonne « Vin / cuvée » introuvable : utilise un fichier téléchargé depuis ce carnet.');return;}
  var list=[];
  for(var r=2;r<=ws.rowCount;r++){
    var row=ws.getRow(r),o={},id='';
    Object.keys(hdr).forEach(function(n){
      var k=hdr[n],v=cellVal(row.getCell(+n).value,k);
      if(!v)return;
      if(k==='id')id=v;else o[k]=v;
    });
    if(!Object.keys(o).length)continue;
    if(!o.date)o.date=today();
    o.id=/^[A-Za-z0-9_\-]{1,60}$/.test(id)?id:newId();
    list.push(o);
  }
  if(!list.length){toast('Aucun vin trouvé dans ce fichier.');return;}
  var ok=0;
  try{ok=await store.saveMany(list);}
  catch(e){toast((e.done?e.done+' vin(s) importé(s) avant une erreur : ':'Import impossible : ')+((e&&e.message)||'réessaie.'));return;}
  toast(ok+' vin'+(ok>1?'s':'')+' importé'+(ok>1?'s':'')+' depuis Excel');
}

/* ---------- cépages ---------- */
function gaugeRange(rng,txt){
  var cells=[];for(var i=1;i<=5;i++)cells.push(h('i',{class:rng&&i>=rng[0]&&i<=rng[1]?'on':null}));
  return h('div',{class:'gauge',role:'img','aria-label':txt},cells);
}
function renderCepages(){
  var g=$('#cgrid');g.textContent='';
  var q=norm(cfilter.q).split(/\s+/).filter(Boolean);
  var rows=CEPAGES.filter(function(c){
    if(cfilter.col&&c.c.indexOf(cfilter.col)!==0)return false;
    var hay=norm([c.n,c.reg,c.ter,c.aro,c.gout,c.ex].join(' '));
    return q.every(function(t){return hay.indexOf(t)>=0;});
  });
  $('#cn').textContent=rows.length+' cépage'+(rows.length>1?'s':'');
  if(!rows.length){g.append(h('p',{class:'hint'},'Aucun cépage ne correspond.'));return;}
  rows.forEach(function(c){
    var open=!!cOpen[c.n],red=c.c.indexOf('Rouge')===0;
    var d=h('div',{class:'cep-d',hidden:!open},
      h('div',null,h('b',null,'Terroir et climat'),c.ter),h('div',null,h('b',null,'Arômes typiques'),c.aro),
      h('div',null,h('b',null,'Goût et structure'),c.gout),h('div',null,h('b',null,'Vins et appellations types'),c.ex));
    var tog=h('button',{class:'btn sm',type:'button','aria-expanded':open?'true':'false',onclick:function(){
      open=!open;cOpen[c.n]=open;d.hidden=!open;tog.setAttribute('aria-expanded',open?'true':'false');tog.textContent=open?'Masquer le détail':'Voir le détail';}},open?'Masquer le détail':'Voir le détail');
    var use=h('button',{class:'btn sm',type:'button',onclick:function(){useCepage(c);}},'Utiliser dans la fiche');
    var rng=h('div',{class:'rng'});
    [['Acidité',c.ac],['Tanin',c.ta],['Corps',c.co]].forEach(function(r){
      if(!r[1]||r[1]==='—')return;
      rng.append(h('span',{class:'k'},r[0]),gaugeRange(levels(r[1]),r[0]+' : '+r[1]),h('span',{class:'t'},r[1]));
    });
    g.append(h('article',{class:'cep'},
      h('div',{class:'cep-h'},h('span',{class:'dot',style:'background:'+(red?'#8E1230':'#EEDF7E')}),h('h3',null,c.n),h('span',{class:'cep-c'},c.c)),
      h('p',{class:'cep-r'},c.reg),rng,d,h('div',{class:'cep-a'},tog,use)));
  });
}
function useCepage(c){
  var base=c.n.replace(/\s*\(.*\)\s*$/,'');
  var arr=splitTerms(entry.cep);
  if(arr.map(norm).indexOf(norm(base))<0)arr.push(base);
  setVal('cep',arr.join(', '));
  if(!entry.type)setVal('type',c.c.indexOf('Rouge')===0?'Rouge':'Blanc');
  show('fiche');toast('« '+base+' » ajouté à la fiche');
}

/* ---------- lexique ---------- */
function renderLexique(){
  var root=$('#lex');
  LEX.forEach(function(l){
    var col=h('div',{class:'lcol'},h('h3',null,l.n),h('p',{class:'s'},l.s));
    l.g.forEach(function(g){
      col.append(h('div',null,h('p',{class:'lexg',style:'margin-bottom:5px'},g[0]),h('div',{class:'chips'},g[1].map(function(t){return h('span',{class:'chip'},t);}))));
    });
    root.append(col);
  });
  var sc=$('#scales');sc.append(h('h2',null,'Échelles de la fiche'));
  [['Apparence',[['limp','Limpidité'],['icol','Intensité couleur']]],
   ['Nez',[['cond','Condition'],['inez','Intensité'],['dev','Développement']]],
   ['Bouche',[['suc','Sucrosité'],['aci','Acidité et tanin'],['alc','Alcool'],['corps','Corps'],['iboc','Intensité aromatique'],['fin','Finale']]],
   ['Conclusions',[['qual','Qualité'],['mat','Maturité']]]].forEach(function(g){
    g[1].forEach(function(r,i){
      var key=r[0]==='aci'?'aci':r[0];
      sc.append(h('div',{class:'srow'},h('div',{class:'k'},h('span',{class:'st'},i===0?g[0]:' '),r[1]),
        h('div',{class:'sc'},SCALE[F[key].s].map(function(o,j){return h('span',{class:'chip','data-i':String(j+1)},o);}))));
    });
  });
}

/* ---------- onglets, toast ---------- */
function show(tab){
  document.querySelectorAll('.tab').forEach(function(t){t.setAttribute('aria-selected',t.dataset.tab===tab?'true':'false');});
  document.querySelectorAll('.view').forEach(function(v){v.hidden=v.id!=='v-'+tab;});
  $('#bar').hidden=tab!=='fiche';
  try{history.replaceState(null,'','#'+tab);}catch(e){}
  if(tab!=='fiche')window.scrollTo(0,0);
}
function toast(msg,actionLabel,action){
  var t=$('#toast');t.textContent='';t.append(h('span',null,msg));
  if(actionLabel)t.append(h('button',{type:'button',onclick:function(){t.hidden=true;action();}},actionLabel));
  t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.hidden=true;},4500);
}
function segFilter(box,opts,get,set){
  opts.forEach(function(o){
    var b=h('button',{type:'button',role:'radio',class:'opt','aria-checked':'false',onclick:function(){set(o[1]);sync();}},o[0]);
    b._v=o[1];box.append(b);
  });
  function sync(){Array.prototype.forEach.call(box.children,function(b){var on=b._v===get();b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false');});}
  sync();
}

/* ---------- démarrage ---------- */
buildForm();buildProfile();syncAll();renderLexique();
document.querySelectorAll('.tab').forEach(function(t){t.addEventListener('click',function(){show(t.dataset.tab);});});
$('#bsave').addEventListener('click',saveEntry);
$('#bblind').addEventListener('click',function(){blindOn=!blindOn;paintBlind();});
$('#bclear').addEventListener('click',clearForm);
$('#jdl').addEventListener('click',downloadXlsx);
$('#xlfile').addEventListener('change',function(e){var f=e.target.files&&e.target.files[0];e.target.value='';if(f)importXlsx(f);});
$('#jq').addEventListener('input',function(e){jfilter.q=e.target.value;renderJournal();});
$('#cq').addEventListener('input',function(e){cfilter.q=e.target.value;renderCepages();});
segFilter($('#jtype'),[['Tous',''],['Blanc','Blanc'],['Rosé','Rosé'],['Rouge','Rouge']],function(){return jfilter.type;},function(v){jfilter.type=v;renderJournal();});
segFilter($('#ccol'),[['Tous',''],['Blancs','Blanc'],['Rouges','Rouge']],function(){return cfilter.col;},function(v){cfilter.col=v;renderCepages();});
renderCepages();
$('#auform').addEventListener('submit',submitAuth);
$('#au-m-login').addEventListener('click',function(){setAuthMode('login');});
$('#au-m-register').addEventListener('click',function(){setAuthMode('register');});
$('#logout').addEventListener('click',logout);
$('#pwform').addEventListener('submit',changePassword);
$('#delform').addEventListener('submit',deleteAccount);
boot();
})();
