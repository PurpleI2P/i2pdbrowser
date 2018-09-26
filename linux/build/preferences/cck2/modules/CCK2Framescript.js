const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

var disableSearchEngineInstall = false;

var documentObserver = {
  observe: function observe(subject, topic, data) {
    if (subject instanceof Ci.nsIDOMWindow && topic == 'content-document-global-created') {
      var doc = subject.document;
      doc.addEventListener("DOMContentLoaded", function onLoad(event) {
        event.target.removeEventListener("DOMContentLoaded", onLoad, false);
        if (disableSearchEngineInstall) {
          subject.wrappedJSObject.external.AddSearchProvider = function() {};
        }
        if (!doc.documentURI.startsWith("about:")) {
          return;
        }
        for (let id in configs) {
          var config = configs[id];
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
      }, false);
    }
  }
}

var configs = sendSyncMessage("cck2:get-configs")[0];
for (var id in configs) {
  var config = configs[id];
  if (config.disableSearchEngineInstall) {
    disableSearchEngineInstall = true;
    break;
  }
}

Services.obs.addObserver(documentObserver, "content-document-global-created", false);
addEventListener("unload", function() {
  Services.obs.removeObserver(documentObserver, "content-document-global-created", false);
})
