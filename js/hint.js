
(function(){
  function showHint(){var h=document.getElementById('linkHint');if(h){h.style.display='block';h.scrollIntoView({block:'nearest',behavior:'smooth'});}}
  var sms=document.getElementById('openSMS'), wa=document.getElementById('openWA');
  if(sms){sms.addEventListener('click',function(e){var u=sms.getAttribute('href');if(!u||u==='#')return;e.preventDefault();window.location.href=u;setTimeout(function(){if(!document.hidden)showHint();},1000);});}
  if(wa){wa.addEventListener('click',function(e){var u=wa.getAttribute('href');if(!u||u==='#')return;e.preventDefault();var text=u.split('?text=')[1]||'';window.location.href='whatsapp://send?phone=17869316508&text='+text;setTimeout(function(){if(!document.hidden){window.location.href=u;setTimeout(function(){if(!document.hidden)showHint();},1300);}},900);});}
})();
