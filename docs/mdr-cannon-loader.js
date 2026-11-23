/* Lazy-load the bundled, MIT-licensed Cannon-es physics runtime. */
(function () {
  'use strict';
  let loading = null;
  window.loadMDRCannonPhysics = function () {
    if (window.MDRCannonPhysics) return Promise.resolve(window.MDRCannonPhysics);
    if (!loading) loading = import('./mdr-cannon-physics.mjs').then(api => {
      window.MDRCannonPhysics = api;
      return api;
    }).catch(error => { loading = null; throw error; });
    return loading;
  };
})();
