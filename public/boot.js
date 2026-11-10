// Aplica el tema antes del primer pintado: sin esto, quien usa modo oscuro
// veía un destello claro mientras React arrancaba. Es un archivo aparte (y no
// un <script> en línea) para que la política de seguridad pueda prohibir todo
// script en línea.
(function () {
  try {
    var pref = localStorage.getItem('splitit_theme_pref') || 'system';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    // Color de la app elegido por la persona (ver src/utils/accent.js).
    var css = localStorage.getItem('splitit_accent_css');
    if (css) {
      var st = document.createElement('style');
      st.id = 'accent-style';
      st.textContent = css;
      document.head.appendChild(st);
      document.documentElement.setAttribute('data-accent', '');
    }
  } catch (e) {}
})();
