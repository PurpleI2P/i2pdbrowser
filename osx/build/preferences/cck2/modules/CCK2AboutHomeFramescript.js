/* This file overrides about:home. It does the following:
 *   Remove the sync button if Sync is disabled
 *   Remove the Addons button if Sync is disabled
 *   Remove the snippets if snippets are disabled
 */

const EXPORTED_SYMBOLS = [];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");

var configs = null;

var observer = {
  observe: function observe(subject, topic, data) {
    switch (topic) {
      case "content-document-global-created":
        var win = subject.QueryInterface(Components.interfaces.nsIDOMWindow);
        win.addEventListener("load", function onLoad(event) {
          win.removeEventListener("load", onLoad, false);
          var doc = event.target;
          var url = doc.location.href.split("?")[0].split("#")[0];
          switch (url) {
            case "about:home":
            case "chrome://browser/content/abouthome/aboutHome.xhtml":
              if (!configs) {
                // TODO - Make this Async
                configs = sendSyncMessage("cck2:get-configs")[0];
              }
              for (let id in configs) {
                var config = configs[id];
                if (config.disableSync) {
                  remove(E("sync", doc));
                }
                if (config.disableAddonsManager) {
                  remove(E("addons", doc));
                }
                if (config.disableWebApps) {
                  remove(E("apps", doc));
                }
                if (config.removeSnippets) {
                  var snippets = E("snippets", doc);
                  if (snippets) {
                    snippets.style.display = "none";
                  }
                }
                if (config.hiddenUI) {
                  for (var i=0; i < config.hiddenUI.length; i++) {
                    var uiElements = doc.querySelectorAll(config.hiddenUI[i]);
                    for (var j=0; j < uiElements.length; j++) {
                      var uiElement = uiElements[j];
                      uiElement.setAttribute("hidden", "true");
                    }
                  }
                }
              }
              break;
          }
        }, false);
        break;
    }
  }
}
Services.obs.addObserver(observer, "content-document-global-created", false);

addEventListener("unload", function() {
  Services.obs.removeObserver(observer, "content-document-global-created", false);
})

function E(id, context) {
  var element = context.getElementById(id);
  return element;
}

function remove(element) {
  if (element && element.parentNode)
    element.parentNode.removeChild(element);
}
