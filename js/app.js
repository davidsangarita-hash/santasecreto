/* Santa Secreto - lógica del juego (salas, sorteo, pantallas) */
(function(){
  var app=document.getElementById('app');
  var db=null, myId=null, code=null, myName='', unsubs=[];
  var mode='',roomData=null, players=[], tab='join', msg='';


  function h(tag,attrs,kids){
    var e=document.createElement(tag);
    for(var k in (attrs||{})){
      if(k==='text')e.textContent=attrs[k];
      else if(k.indexOf('on')===0)e.addEventListener(k.slice(2),attrs[k]);
      else e.setAttribute(k,attrs[k]);
    }
    (kids||[]).forEach(function(c){if(c)e.appendChild(c);});
    return e;
  }
  function clean(s){return s.replace(/\s+/g,' ').trim();}
  function mkCode(){var a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='';for(var i=0;i<5;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}
  function store(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}}
  function read(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function stopListening(){unsubs.forEach(function(u){try{u();}catch(e){}});unsubs=[];}

  /* ---------- Pantallas ---------- */
  function showMsg(text){app.innerHTML='';app.appendChild(h('div',{class:'card'},[h('h2',{text:'Un momento'}),h('p',{class:'hint',text:text})]));}

  function renderHome(){
    stopListening();app.innerHTML='';
    var nameIn=h('input',{type:'text',placeholder:'Tu nombre de usuario',maxlength:'20',autocomplete:'off',id:'nm'});
    var codeIn=h('input',{type:'text',class:'code',placeholder:'CÓDIGO',maxlength:'5',autocomplete:'off',id:'cd'});
    var err=h('div',{class:'err',role:'alert',text:msg});msg='';
    var tabs=h('div',{class:'tabs'},[
      h('button',{class:tab==='join'?'on':'',text:'Unirme a una sala',onclick:function(){tab='join';renderHome();}}),
      h('button',{class:tab==='create'?'on':'',text:'Crear sala',onclick:function(){tab='create';renderHome();}})
    ]);
    var kids=[tabs,h('label',{for:'nm',text:'Tu nombre'}),nameIn];
    if(tab==='join'){kids.push(h('label',{for:'cd',text:'Código de la sala'}),codeIn);}
    var go=h('button',{class:'main',text:tab==='join'?'Entrar a la sala':'Crear mi sala',onclick:function(){
      var n=clean(nameIn.value);
      if(!n){err.textContent='Escribe tu nombre de usuario.';return;}
      go.disabled=true;
      (tab==='join'?joinRoom(codeIn.value.trim().toUpperCase(),n):createRoom(n)).catch(function(e){
        go.disabled=false;err.textContent=(e&&e.message)||'No se pudo completar. Intenta de nuevo.';
      });
    }});
    var saved=read('ss-name');if(saved)nameIn.value=saved;
    kids.push(go,err);
    if(mode==='local')app.appendChild(h('div',{class:'card',style:'border-top-color:#f2c14e'},[
      h('h2',{text:'Modo de prueba'}),
      h('p',{class:'hint',text:'Las salas solo se ven en este navegador. Para jugar entre celulares conecta Firebase (mira LEEME.md).'})]));
    app.appendChild(h('div',{class:'card'},[
      h('h2',{text:tab==='join'?'Entra con tu código':'Eres el administrador'}),
      h('p',{class:'hint',text:tab==='join'?'Pídele el código al administrador de la sala.':'Creas la sala, compartes el código y tú inicias el sorteo.'})
    ].concat(kids)));
  }

  async function createRoom(name){
    var c,tries=0;
    do{c=mkCode();var s=await db.doc('rooms/'+c).get();if(!s.exists)break;tries++;}while(tries<6);
    await db.doc('rooms/'+c).set({adminId:myId,started:false,assign:{},created:Date.now()});
    await db.doc('rooms/'+c+'/players/'+myId).set({name:name,joined:Date.now()});
    enter(c,name);
  }

  async function joinRoom(c,name){
    if(c.length!==5)throw new Error('El código tiene 5 caracteres.');
    var rs=await db.doc('rooms/'+c).get();
    if(!rs.exists)throw new Error('No existe una sala con ese código.');
    var mine=await db.doc('rooms/'+c+'/players/'+myId).get();
    if(mine.exists){enter(c,mine.data().name);return;}
    if(rs.data().started)throw new Error('Esa sala ya hizo el sorteo.');
    var all=await db.collection('rooms/'+c+'/players').get();
    var dup=all.docs.some(function(d){return String(d.data().name).toLowerCase()===name.toLowerCase();});
    if(dup)throw new Error('Ese nombre ya está en la sala. Usa otro, por ejemplo “'+name+' M.”.');
    await db.doc('rooms/'+c+'/players/'+myId).set({name:name,joined:Date.now()});
    enter(c,name);
  }

  function enter(c,name){
    code=c;myName=name;store('ss-room',c);store('ss-name',name);
    stopListening();roomData=null;players=[];
    unsubs.push(db.doc('rooms/'+c).onSnapshot(function(s){
      if(!s.exists){leave(true);return;}
      roomData=s.data();renderRoom();
    },function(){showMsg('Se perdió la conexión con la sala. Recarga la página.');}));
    unsubs.push(db.collection('rooms/'+c+'/players').onSnapshot(function(s){
      players=s.docs.map(function(d){return {id:d.id,name:String(d.data().name),joined:d.data().joined||0};})
        .sort(function(a,b){return a.joined-b.joined;});
      var still=players.some(function(p){return p.id===myId;});
      if(!still&&roomData){leave(true);return;}
      renderRoom();
    }));
  }

  function leave(silent){
    stopListening();store('ss-room',null);code=null;roomData=null;players=[];
    if(silent)msg='Saliste de la sala.';
    renderHome();
  }

  function renderRoom(){
    if(!roomData||!code)return;
    var isAdmin=roomData.adminId===myId;
    app.innerHTML='';
    if(roomData.started){app.appendChild(revealCard(isAdmin));return;}

    var rc=h('div',{class:'roomcode'},[h('small',{text:'Código de la sala'}),h('b',{text:code}),
      h('button',{text:'Copiar código',onclick:function(e){
        try{navigator.clipboard.writeText(code);e.target.textContent='¡Copiado!';}catch(x){e.target.textContent='Cópialo a mano';}
      }})]);
    var list=h('ul');
    players.forEach(function(p){
      var li=h('li',{class:'p'},[h('span',{},[h('span',{text:p.name}),
        p.id===roomData.adminId?h('em',{text:'administrador'}):(p.id===myId?h('em',{text:'tú'}):null)])]);
      if(isAdmin&&p.id!==myId)li.appendChild(h('button',{text:'×','aria-label':'Quitar a '+p.name,onclick:function(){db.doc('rooms/'+code+'/players/'+p.id).delete();}}));
      list.appendChild(li);
    });
    var card=h('div',{class:'card'},[
      h('h2',{text:'Sala de espera'}),
      h('p',{class:'hint',text:'Comparte el código. Quien entre aparece aquí al instante.'}),rc,list,
      h('p',{class:'hint',style:'margin-top:12px',text:players.length+(players.length===1?' persona':' personas')})
    ]);
    if(isAdmin){
      var b=h('button',{class:'main',text:'Iniciar sorteo',onclick:function(){b.disabled=true;startDraw().catch(function(){b.disabled=false;});}});
      if(players.length<3){b.disabled=true;card.appendChild(b);card.appendChild(h('p',{class:'wait',text:'Se necesitan mínimo 3 personas para sortear.'}));}
      else card.appendChild(b);
    }else card.appendChild(h('p',{class:'wait',text:'Esperando a que el administrador inicie el sorteo… 🎅'}));
    card.appendChild(h('button',{class:'ghost',text:isAdmin?'Cerrar la sala':'Salir de la sala',onclick:function(){
      if(isAdmin){if(!confirm('¿Cerrar la sala para todos?'))return;
        Promise.all(players.map(function(p){return db.doc('rooms/'+code+'/players/'+p.id).delete();})).then(function(){return db.doc('rooms/'+code).delete();});
      }else db.doc('rooms/'+code+'/players/'+myId).delete();
    }}));
    app.appendChild(card);
  }

  // Cada persona regala a la siguiente de una lista mezclada: nadie se saca a sí mismo ni se repite.
  async function startDraw(){
    var order=players.slice();
    for(var i=order.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=order[i];order[i]=order[j];order[j]=t;}
    var assign={};
    order.forEach(function(p,i){assign[p.id]=order[(i+1)%order.length].name;});
    await db.doc('rooms/'+code).update({started:true,assign:assign});
  }

  function revealCard(isAdmin){
    var target=(roomData.assign||{})[myId];
    var secret=h('div',{class:'secret',tabindex:'0',role:'button','aria-label':'Mostrar mi amigo secreto',text:target||'…'});
    var tap=h('p',{class:'tap',text:'Toca el nombre para descubrirlo'});
    function toggle(){var o=secret.classList.toggle('open');if(o&&window.Effects)Effects.confetti();tap.textContent=o?'Memorízalo y no se lo digas a nadie 🤫':'Toca el nombre para descubrirlo';}
    secret.addEventListener('click',toggle);
    secret.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
    var card=h('div',{class:'card reveal'},[
      h('p',{class:'hint',text:'Hola, '+myName+' 👋'}),
      h('div',{class:'gift','aria-hidden':'true',text:'🎁'}),
      h('h2',{text:'Tu amigo secreto es'}),secret,tap
    ]);
    if(isAdmin){
      card.appendChild(h('button',{class:'alt',text:'Volver a sortear',onclick:function(){
        if(confirm('¿Hacer un sorteo nuevo con las mismas personas?'))db.doc('rooms/'+code).update({started:false,assign:{}});
      }}));
    }
    card.appendChild(h('button',{class:'ghost',text:'Salir de la sala',onclick:function(){
      if(!confirm('Si sales ya no podrás ver a quién te tocó. ¿Salir?'))return;
      store('ss-room',null);db.doc('rooms/'+code+'/players/'+myId).delete();
    }}));
    return card;
  }

  /* ---------- Arranque ---------- */
  async function boot(){
    try{
      var conn=await SantaStorage.connect();
      db=conn.db;myId=conn.myId;mode=conn.mode;
      var c=read('ss-room');
      if(c){
        var snap=await db.doc('rooms/'+c+'/players/'+myId).get();
        if(snap.exists){enter(c,snap.data().name);return;}
        store('ss-room',null);
      }
      renderHome();
    }catch(e){showMsg('No se pudo conectar. Recarga la página.');}
  }
  boot();
})();
