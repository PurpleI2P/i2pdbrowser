/* This file overlays about:addons. It does the following: */
/*   Workaround https://bugzilla.mozilla.org/show_bug.cgi?id=1132971 */
/*   Hide the "Install Add-on From File" menu if xpinstall.enabled is false */
/*   Hides the discover pane if xpinstall.enabled is false */
/*   Hides the add-on entry if specified in the CCK2 config */

const EXPORTED_SYMBOLS = [];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://cck2/CCK2.jsm");

var addonId = "cck2wizard@kaply.com";

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
            case "about:addons":
            case "chrome://mozapps/content/extensions/extensions.xul":
              var configs = CCK2.getConfigs();
              var hiddenAddons = [];
              var requiredAddons = [];
              for (let id in configs) {
                var config = configs[id];
                if (config && "extension" in config && config.extension.hide) {
                  hiddenAddons.push(config.extension.id);
                }
                if (config.requiredAddons) {
                  requiredAddons.push.apply(requiredAddons, config.requiredAddons.split(","));
                }
              }
              if (hiddenAddons.length > 0 || requiredAddons.length > 0) {
                var ss;
                for (var i = 0; i < doc.styleSheets.length; i++) {
                  if (doc.styleSheets[i].href == "chrome://mozapps/skin/extensions/extensions.css") {
                    ss = doc.styleSheets[i];
                    break;
                  }
                }
                for (var i=0; i < hiddenAddons.length; i++) {
                  ss.insertRule("richlistitem[value='" + hiddenAddons[i] + "'] { display: none;}", ss.cssRules.length);
                }
                for (var i=0; i < requiredAddons.length; i++) {
                  ss.insertRule("richlistitem[value='" + requiredAddons[i] + "'] button[anonid='disable-btn'] { display: none;}", ss.cssRules.length);
                  ss.insertRule("richlistitem[value='" + requiredAddons[i] + "'] button[anonid='remove-btn'] { display: none;}", ss.cssRules.length);
                }
                if (requiredAddons.length > 0) {
                  win.gViewController.commands.cmd_disableItem.origIsEnabled = win.gViewController.commands.cmd_disableItem.isEnabled;
                  win.gViewController.commands.cmd_disableItem.isEnabled = function(aAddon) { if (aAddon && requiredAddons.indexOf(aAddon.id) != -1) return false; return this.origIsEnabled;}
                  win.gViewController.commands.cmd_uninstallItem.origIsEnabled = win.gViewController.commands.cmd_disableItem.isEnabled;
                  win.gViewController.commands.cmd_uninstallItem.isEnabled = function(aAddon) { if (aAddon && requiredAddons.indexOf(aAddon.id) != -1) return false; return this.origIsEnabled;}
                }
              }
              var showDiscoverPane = true;
              var xpinstallEnabled = true;
              try {
                xpinstallEnabled = Services.prefs.getBoolPref("xpinstall.enabled");
              } catch (e) {}
              try {
                showDiscoverPane = Services.prefs.getBoolPref("extensions.getAddons.showPane");
              } catch (e) {}
              if (!xpinstallEnabled || !showDiscoverPane) {
                // Work around Mozilla bug 1132971
                // Hide the discover pane if it is the selected pane
                if (E("view-port", doc) && E("view-port", doc).selectedIndex == 0) {
                  try {
                    win.gViewController.loadView("addons://list/extension");
                  } catch (ex) {
                    // This fails with Webconverger installed. Ignore it.
                  }
                }
              }
              if (!xpinstallEnabled) {
                // Hide the "Install Add-on From File" separator
                hide(E("utils-installFromFile-separator", doc));
                // Hide the "Install Add-on From File" menuitem
                hide(E("utils-installFromFile", doc));
                win.gDragDrop.onDragOver = function(event) {
                  event.dataTransfer.dropEffect = "none";
                  event.stopPropagation();
                  event.preventDefault();
                };
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

function hide(element) {
  if (element) {
    element.setAttribute("hidden", "true");
  }
}
