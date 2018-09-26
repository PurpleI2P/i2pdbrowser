/* This file overrides about:support It does the following:
 *   Remove the reset Firefox button if disableResetFirefox is set
 *   Remove the safe mode Button if disableSafeMode is set
 *   Remove the box if both are set
 */

const EXPORTED_SYMBOLS = [];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://cck2/CCK2.jsm");

var configs = null;

var observer = {
  observe: function observe(subject, topic, data) {
    switch (topic) {
      case "chrome-document-global-created":
        var win = subject.QueryInterface(Components.interfaces.nsIDOMWindow);
        win.addEventListener("load", function onLoad(event) {
          win.removeEventListener("load", onLoad, false);
          var doc = event.target;
          var url = doc.location.href.split("?")[0].split("#")[0];
          switch (url) {
            case "about:support":
            case "chrome://global/content/aboutSupport.xhtml":
              if (!configs) {
                configs = CCK2.getConfigs();
              }
              for (let id in configs) {
                var config = configs[id];
                if (config.disableResetFirefox) {
                  remove(E("reset-box", doc));
                }
                if (config.disableSafeMode) {
                  remove(E("safe-mode-box", doc));
                }
                if (config.disableResetFirefox &&
                    config.disableSafeMode) {
                  remove(E("action-box", doc));
                }
              }
              break;
          }
        }, false);
        break;
    }
  }
}
Services.obs.addObserver(observer, "chrome-document-global-created", false);

function E(id, context) {
  var element = context.getElementById(id);
  return element;
}


function remove(element) {
  if (element && element.parentNode)
    element.parentNode.removeChild(element);
}
