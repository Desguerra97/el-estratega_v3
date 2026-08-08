/* ============================================================
   Enrutador — Diamond Rush con config completa
   ============================================================ */
(function () {
  'use strict';
  window.LabEngines = {
    start(level, config, onEnd) {
      const canvas = document.getElementById('lab-canvas');
      canvas.style.display = 'block';
      const container = document.getElementById('lab-game-container');
      if (container) container.style.display = 'none';
      // Cargar poderes desde levels.json (config global de niveles)
      window.DiamondRush.start(level, onEnd, config._levelsConfig || {});
    },
    stop() {
      if (window.DiamondRush && window.DiamondRush.stop) window.DiamondRush.stop();
    }
  };
})();
