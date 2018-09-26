const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

var EXPORTED_SYMBOLS = [];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

let CCK2FileBlock = {
  chromeBlacklist: ["browser", "mozapps", "marionette", "specialpowers",
                    "branding", "alerts"],
  shouldLoad: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
    // Prevent the loading of chrome URLs into the main browser window
    if (aContentLocation.scheme == "chrome") {
      if (aRequestOrigin &&
          (aRequestOrigin.spec == "chrome://browser/content/browser.xul" ||
          aRequestOrigin.scheme == "moz-nullprincipal")) {
        for (var i=0; i < this.chromeBlacklist.length; i++) {
          if (aContentLocation.host == this.chromeBlacklist[i]) {
            if (aContentLocation.spec.includes(".xul")) {
              return Ci.nsIContentPolicy.REJECT_REQUEST;
            }
          }
        }
      }
    }
    return Ci.nsIContentPolicy.ACCEPT;
  },
  shouldProcess: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
    return Ci.nsIContentPolicy.ACCEPT;
  },
  classDescription: "CCK2 FileBlock Service",
  contractID: "@kaply.com/cck2-fileblock-service;1",
  classID: Components.ID('{26e7afc9-e22d-4d12-bb57-c184fe24b828}'),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPolicy]),
  createInstance: function(outer, iid) {
     return this.QueryInterface(iid);
  },
};

var registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
registrar.registerFactory(CCK2FileBlock.classID,
                          CCK2FileBlock.classDescription,
                          CCK2FileBlock.contractID,
                          CCK2FileBlock);

var cm = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
cm.addCategoryEntry("content-policy", CCK2FileBlock.contractID,
                    CCK2FileBlock.contractID, false, true);
