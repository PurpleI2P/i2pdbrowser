const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const EXPORTED_SYMBOLS = [];

var gForceExternalHandler = false;

XPCOMUtils.defineLazyServiceGetter(this, "extProtocolSvc",
    "@mozilla.org/uriloader/external-protocol-service;1", "nsIExternalProtocolService");

var documentObserver = {
  observe: function observe(subject, topic, data) {
    if (subject instanceof Ci.nsIDOMWindow && topic == 'content-document-global-created') {
      var doc = subject.document;
      doc.addEventListener("DOMContentLoaded", function onLoad(event) {
        event.target.removeEventListener("DOMContentLoaded", onLoad, false);
        // If the parent document is a local file, don't do anything
        // Links will just work
        if (doc.location.href.indexOf("file://") == 0) {
          return;
        }
        var links = event.target.getElementsByTagName("a");
        for (var i=0; i < links.length; i++) {
          var link = links[i];
          if (link.href.indexOf("file://") != 0) {
            continue;
          }
          link.addEventListener("click", function(link) {
            return function(event) {
              event.preventDefault();
              if (gForceExternalHandler) {
                extProtocolSvc.loadUrl(Services.io.newURI(link.href, null, null));
              } else {
                var target = "_self";
                if (link.hasAttribute("target")) {
                  target = link.getAttribute("target");
                }
                // If we were told somewhere other than current (based on modifier keys), use it
                var where = whereToOpenLink(event);
                if (where != "current" || target == "_blank") {
                  sendAsyncMessage("cck2:open-url", {
                    "url": link.href,
                    "where": (target == "_blank") ? "tab" : where
                  });
                  return;
                }
                switch (target) {
                  case "_self":
                    link.ownerDocument.location = link.href;
                    break;
                  case "_parent":
                    link.ownerDocument.defaultView.parent.document.location = link.href;
                    break;
                  case "_top":
                    link.ownerDocument.defaultView.top.document.location = link.href;
                    break;
                  default:
                    // Attempt to find the iframe that this goes into
                    var iframes = doc.defaultView.parent.document.getElementsByName(target);
                    if (iframes.length > 0) {
                      iframes[0].contentDocument.location = link.href;
                    } else {
                      link.ownerDocument.location = link.href;
                    }
                    break;
                }
              }
            }
          }(link), false);
        }
      }, false);
    }
  }
}

// Don't do this check before Firefox 29
if (Services.vc.compare(Services.appinfo.version, "29") > 0) {
  try {
    if (Services.prefs.getCharPref("capability.policy.default.checkloaduri.enabled") == "allAccess") {
      gForceExternalHandler = !extProtocolSvc.isExposedProtocol('file');
      Services.obs.addObserver(documentObserver, "content-document-global-created", false);
      addEventListener("unload", function() {
        Services.obs.removeObserver(documentObserver, "content-document-global-created", false);
      })
    }
  } catch (e) {}
}


/* Copied from http://mxr.mozilla.org/mozilla-central/source/browser/base/content/utilityOverlay.js?raw=1 */

function getBoolPref(prefname, def)
{
  try {
    return Services.prefs.getBoolPref(prefname);
  }
  catch(er) {
    return def;
  }
}

/* whereToOpenLink() looks at an event to decide where to open a link.
 *
 * The event may be a mouse event (click, double-click, middle-click) or keypress event (enter).
 *
 * On Windows, the modifiers are:
 * Ctrl        new tab, selected
 * Shift       new window
 * Ctrl+Shift  new tab, in background
 * Alt         save
 *
 * Middle-clicking is the same as Ctrl+clicking (it opens a new tab).
 *
 * Exceptions:
 * - Alt is ignored for menu items selected using the keyboard so you don't accidentally save stuff.
 *    (Currently, the Alt isn't sent here at all for menu items, but that will change in bug 126189.)
 * - Alt is hard to use in context menus, because pressing Alt closes the menu.
 * - Alt can't be used on the bookmarks toolbar because Alt is used for "treat this as something draggable".
 * - The button is ignored for the middle-click-paste-URL feature, since it's always a middle-click.
 */
function whereToOpenLink( e, ignoreButton, ignoreAlt )
{
  Components.utils.import("resource://gre/modules/AppConstants.jsm");

  // This method must treat a null event like a left click without modifier keys (i.e.
  // e = { shiftKey:false, ctrlKey:false, metaKey:false, altKey:false, button:0 })
  // for compatibility purposes.
  if (!e)
    return "current";

  var shift = e.shiftKey;
  var ctrl =  e.ctrlKey;
  var meta =  e.metaKey;
  var alt  =  e.altKey && !ignoreAlt;

  // ignoreButton allows "middle-click paste" to use function without always opening in a new window.
  var middle = !ignoreButton && e.button == 1;
  var middleUsesTabs = true;

  // Don't do anything special with right-mouse clicks.  They're probably clicks on context menu items.

  var metaKey = AppConstants.platform == "macosx" ? meta : ctrl;
  if (metaKey || (middle && middleUsesTabs))
    return shift ? "tabshifted" : "tab";

  if (alt && getBoolPref("browser.altClickSave", false))
    return "save";

  if (shift || (middle && !middleUsesTabs))
    return "window";

  return "current";
}
