/* Asigna las fotografías de GRC_IMAGES a los <img data-img> del HTML. */
document.querySelectorAll('img[data-img]').forEach(function (im) {
  var src = GRC_IMAGES[im.getAttribute('data-img')];
  if (src) im.src = src;
});
