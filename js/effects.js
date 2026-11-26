/* Santa Secreto - efectos visuales: nieve y confeti */
(function(){
  var snow=document.getElementById('snow');
  for(var i=0;i<30;i++){
    var f=document.createElement('i');
    f.style.setProperty('--s',(Math.random()*5+2)+'px');
    f.style.setProperty('--x',(Math.random()*100)+'%');
    f.style.setProperty('--d',(Math.random()*9+8)+'s');
    f.style.setProperty('--l',(-Math.random()*12)+'s');
    snow.appendChild(f);
  }
  var pieces=['🎉','✨','🎄','⭐','🎁','❄️'];
  window.Effects={
    confetti:function(){
      if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
      for(var i=0;i<26;i++){
        var c=document.createElement('span');
        c.className='confetti';
        c.textContent=pieces[Math.floor(Math.random()*pieces.length)];
        c.style.setProperty('--x',(Math.random()*100)+'%');
        c.style.setProperty('--z',(Math.random()*14+14)+'px');
        c.style.setProperty('--d',(Math.random()*1.6+1.6)+'s');
        c.style.setProperty('--dx',(Math.random()*160-80)+'px');
        c.style.setProperty('--r',(Math.random()*720-360)+'deg');
        document.body.appendChild(c);
        setTimeout(function(el){el.remove();},3500,c);
      }
    }
  };
})();
