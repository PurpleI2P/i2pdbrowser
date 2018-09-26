/* This file modifies the preferences dialogs. It does the following:
 *   Removes private browsing from the pref UI if it is disabled
 *   Removes Sync from the pref UI if it is diabled
 *   Disables the crash reporter button if crash reporter is disabled
 *   Removed the master password UI if it is disabled
 *   Goes through the hiddenUI list and hides any UI
 *
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
            case "chrome://browser/content/preferences/preferences.xul":
              configs = CCK2.getConfigs();
              win.addEventListener("paneload", function(event) {
                updatePrefUI(event.target.ownerDocument);
              }, false);
              updatePrefUI(doc);
              for (let id in configs) {
                var config = configs[id];
                if (!config.disableSync) {
                  continue;
                }
                var prefWindow = E("BrowserPreferences", doc);
                var paneSyncRadio = doc.getAnonymousElementByAttribute(prefWindow, "pane", "paneSync");
                hide(paneSyncRadio);
                var paneDeck = doc.getAnonymousElementByAttribute(prefWindow, "anonid", "paneDeck");
                var paneSync = E("paneSync", doc);
                paneSync.removeAttribute("helpTopic");
                var weavePrefsDeck = E("weavePrefsDeck", doc);
                if (weavePrefsDeck)
                  weavePrefsDeck.parentNode.removeChild(weavePrefsDeck);
                if (prefWindow.currentPane == E("paneSync", doc))
                  prefWindow.showPane(E("paneMain", doc));
              }
              break;
            case "about:preferences":
            case "chrome://browser/content/preferences/in-content/preferences.xul":
              configs = CCK2.getConfigs();
              for (let id in configs) {
                var config = configs[id];
                if (config.disableSync) {
                  hide(E("category-sync", doc));
                }
              }
              updatePrefUI(doc);
              break;
          }
        }, false);
        break;
    }
  }
}
Services.obs.addObserver(observer, "chrome-document-global-created", false);

// The IDs are the same, so I can reuse this for regular and in-content prefs
function updatePrefUI(doc) {
  for (var id in configs) {
    var config = configs[id];
    if (config.disablePrivateBrowsing) {
      hide(E("privateBrowsingAutoStart", doc));
      var privateBrowsingMenu = doc.querySelector("menuitem[value='dontremember']");
      hide(privateBrowsingMenu, doc);
    }
    if (config.disableCrashReporter) {
      disable(E("submitCrashesBox", doc));
    }
    if (config.disableSync) {
      hide(E("noFxaAccount", doc));
      hide(E("hasFxaAccount", doc));
    }
    if (config.noMasterPassword == true) {
      hide(E("useMasterPassword", doc));
      hide(E("changeMasterPassword", doc));
    }
    if (config.hiddenUI) {
      for (var i=0; i < config.hiddenUI.length; i++) {
        // Don't use .hidden since it doesn't work sometimes
        var style = doc.getElementById("cck2-hidden-style");
        if (!style) {
          style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
          style.setAttribute("id", "cck2-hidden-style");
          style.setAttribute("type", "text/css");
          doc.documentElement.appendChild(style);
        }
        style.textContent = style.textContent + config.hiddenUI[i] + "{display: none !important;}";
      }
    }
  }
}

function E(id, context) {
  var element = context.getElementById(id);
  return element;
}

function hide(element) {
  if (element) {
    element.setAttribute("hidden", "true");
  }
}

function disable(element) {
  if (element) {
    element.disabled = true;
  }
}
