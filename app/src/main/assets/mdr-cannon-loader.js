/* Lazy-load the optional MIT-licensed Cannon-es engine only in the Pro edition. */
(function () {
  'use strict';
  let loading = null;
  window.loadMDRCannonPhysics = function () {
    if (window.MDR_EDITION !== 'pro') return Promise.reject(new Error('Cannon physics is available in the Pro APK only.'));
    if (window.MDRCannonPhysics) return Promise.resolve(window.MDRCannonPhysics);
    if (!loading) loading = import('./mdr-cannon-physics.mjs').then(api => {
      window.MDRCannonPhysics = api;
      return api;
    }).catch(error => { loading = null; throw error; });
    return loading;
  };
})();
