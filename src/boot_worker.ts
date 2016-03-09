import 'es6-shim';
import 'es6-promise';
import 'reflect-metadata';
import 'zone.js/dist/zone-microtask';
import 'zone.js/dist/long-stack-trace-zone';
import * as _ from 'lodash';

import { platform, provide, enableProdMode } from 'angular2/core';
import {
  WebWorkerInstance,
  WORKER_RENDER_APP,
  WORKER_RENDER_PLATFORM,
  WORKER_SCRIPT,
  WORKER_RENDER_ROUTER
} from 'angular2/platform/worker_render';

const fastclick = require('fastclick');
// fastclick.attach(document.body);

const CLIENT_RENDER = true;
if (!CLIENT_RENDER) {
  throw new Error('Aborting rendering for testing');
}

// TODO: only if prod config
enableProdMode();
console.log('client loaded');

const workerScriptUrl = URL.createObjectURL(new Blob([`
  var importScripts_ = this.importScripts;

  this.importScripts = function importScripts() {
    for (var i = 0, scripts = new Array(arguments.length); i < scripts.length; ++i) {
      var script = arguments[i];

      if (script.indexOf('http:') !== 0 || script.indexOf('https:') !== 0) {
        script = '${window.location.origin}' + (script[0] === '/' ? script : '/' + script);
      }

      scripts[i] = script;
    }

    return importScripts_.apply(this, scripts);
  };

  importScripts('${VENDOR_NAME}.js', '${WORKER_APP_NAME}.js');
`], {
    type: 'text/javascript'
}));

const appRef = platform(WORKER_RENDER_PLATFORM).application([
  WORKER_RENDER_APP,
  WORKER_RENDER_ROUTER,
  provide(WORKER_SCRIPT, { useValue: workerScriptUrl })
]);

const worker = appRef.injector.get(WebWorkerInstance).worker;

worker.addEventListener('message', function onAppReady(event) {
  if (event.data === 'APP_READY') {
    worker.removeEventListener('message', onAppReady, false);
    URL.revokeObjectURL(workerScriptUrl);
    setTimeout(() => document.dispatchEvent(new Event('BootstrapComplete')));
  }
}, false);

// TODO: throttle
addEventListener('scroll', _.throttle((event: Event) => {
  worker.postMessage({
    name: 'window.scroll',
    windowHeight: window.innerHeight,
    bodyHeight: document.body.clientHeight,
    bodyScrollTop: document.body.scrollTop
  });
}, 100));
