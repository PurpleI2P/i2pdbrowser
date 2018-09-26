/* This file is a workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1139509 */
/* It bolds the Firefox version in the about dialog and unbolds the distribution information */
/* It can be removed once Firefox 38 ESR is out of support */

const EXPORTED_SYMBOLS = [];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");

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
            case "chrome://browser/content/aboutDialog.xul":
              doc.querySelector("#version").style.fontWeight = "bold";
              doc.querySelector("#distribution").style.fontWeight = "normal";
              doc.querySelector("#distributionId").style.fontWeight = "normal";
              break;
          }
        }, false);
        break;
    }
  }
}

Services.obs.addObserver(observer, "chrome-document-global-created", false);
