/* Asigna las fotografías de GRC_IMAGES a los <img data-img> del HTML.
   Si una clave no existe (p. ej. caché vieja), la imagen se oculta en vez
   de mostrar el recuadro roto con el texto alternativo. */
document.querySelectorAll('img[data-img]').forEach(function (im) {
  var src = GRC_IMAGES[im.getAttribute('data-img')];
  if (src) { im.src = src; im.addEventListener('error', function () { im.style.display = 'none'; }); }
  else { im.style.display = 'none'; }
});
