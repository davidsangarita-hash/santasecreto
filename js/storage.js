/* Santa Secreto - capa de datos.
   Expone SantaStorage.connect() -> { db, myId }  (db con la misma API que Claude: doc/collection/get/set/update/delete/onSnapshot).
   0) Con Firebase configurado (js/firebase-config.js): salas compartidas entre cualquier dispositivo.
   1) Dentro de Claude (artifact publicado) usa la base de datos compartida real: salas multijugador.
   2) Fuera de Claude usa localStorage: sirve para probar en un solo navegador (varias pestañas).
   Para multijugador en tu propio hosting, reemplaza la parte "local" por Firebase/Supabase
   manteniendo estas mismas funciones. */
(function(){
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}

  async function viaClaude(){
    for(var i=0;i<25&&!(window.claude&&claude.use);i++)await sleep(200);
    if(!(window.claude&&claude.use))return null;
    var u=await claude.use('user'), d=await claude.use('db');
    var id=u?await u.id():null;
    return (d&&id)?{db:d,myId:id,mode:'claude'}:null;
  }


  /* Firebase Firestore: salas compartidas entre dispositivos (GitHub Pages, etc.) */
  function viaFirebase(){
    var cfg=window.FIREBASE_CONFIG;
    if(!cfg||!window.firebase||!cfg.projectId||cfg.projectId==='PEGA_AQUI')return null;
    try{
      if(!firebase.apps.length)firebase.initializeApp(cfg);
      var fs=firebase.firestore();
      var id=null;try{id=localStorage.getItem('ss-uid');}catch(e){}
      if(!id){id='u_'+Math.random().toString(36).slice(2,12);try{localStorage.setItem('ss-uid',id);}catch(e){}}
      return {db:{doc:function(p){return fs.doc(p);},collection:function(p){return fs.collection(p);}},myId:id,mode:'firebase'};
    }catch(e){return null;}
  }

  function viaLocal(){
    var KEY='ss-local-db', subs=[];
    function load(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return {};}}
    function save(o){try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){} fire();}
    function snapDoc(path,o){var v=o[path];return {id:path.split('/').pop(),exists:v!==undefined,data:function(){return v===undefined?undefined:JSON.parse(JSON.stringify(v));}};}
    function children(path,o){
      var depth=path.split('/').length+1;
      return Object.keys(o).filter(function(k){return k.indexOf(path+'/')===0&&k.split('/').length===depth;}).map(function(k){return snapDoc(k,o);});
    }
    function fire(){subs.forEach(function(f){f();});}
    function sub(read,next){
      var f=function(){next(read(load()));};subs.push(f);setTimeout(f,0);
      return function(){subs=subs.filter(function(x){return x!==f;});};
    }
    window.addEventListener('storage',function(e){if(e.key===KEY)fire();});
    function doc(path){return {
      id:path.split('/').pop(),path:path,
      get:function(){return Promise.resolve(snapDoc(path,load()));},
      set:function(data){var o=load();o[path]=data;save(o);return Promise.resolve();},
      update:function(data){var o=load();o[path]=Object.assign({},o[path],data);save(o);return Promise.resolve();},
      delete:function(){var o=load();Object.keys(o).forEach(function(k){if(k===path||k.indexOf(path+'/')===0)delete o[k];});save(o);return Promise.resolve();},
      onSnapshot:function(next){return sub(function(o){return snapDoc(path,o);},next);}
    };}
    function collection(path){
      function mk(o){var d=children(path,o);return {docs:d,size:d.length,empty:!d.length};}
      return {path:path,doc:doc,
        get:function(){return Promise.resolve(mk(load()));},
        onSnapshot:function(next){return sub(mk,next);}};
    }
    var id=null;try{id=sessionStorage.getItem('ss-local-id');}catch(e){}
    if(!id){id='local_'+Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('ss-local-id',id);}catch(e){}}
    return {db:{doc:doc,collection:collection},myId:id,mode:'local'};
  }

  window.SantaStorage={
    connect:async function(){
      var c=viaFirebase();            // 1) Firebase si está configurado
      if(!c)c=await viaClaude();      // 2) Base de datos de Claude si se abre dentro de Claude
      return c||viaLocal();           // 3) Modo local (un solo navegador)
    }
  };
})();
