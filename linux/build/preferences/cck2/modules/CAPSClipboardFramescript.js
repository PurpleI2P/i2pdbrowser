const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

const EXPORTED_SYMBOLS = [];

var gAllowedPasteSites = [];
var gAllowedCutCopySites = [];
var gDeniedPasteSites = [];
var gDeniedCutCopySites = [];
var gDefaultPastePolicy = false;
var gDefaultCutCopyPolicy = false;

function allowCutCopy(doc) {
  var win = doc.defaultView;
  if (win !== win.top) {
    // It's an iframe. Use the top level window
    // for security purposes
    win = win.top;
  }

  if (gDefaultCutCopyPolicy == true) {
    for (var i=0; i < gDeniedCutCopySites.length; i++) {
      if (win.location.href.indexOf(gDeniedCutCopySites[i]) == 0) {
        return false;
      }
    }
    return true;
  } else {
    for (var i=0; i < gAllowedCutCopySites.length; i++) {
      if (win.location.href.indexOf(gAllowedCutCopySites[i]) == 0) {
        return true;
      }
    }
    return false;
  }
}

function allowPaste(doc) {
  var win = doc.defaultView;
  if (win !== win.top) {
    // It's an iframe. Use the top level window
    // for security purposes
    win = win.top;
  }

  if (gDefaultPastePolicy == true) {
    for (var i=0; i < gDeniedPasteSites.length; i++) {
      if (win.location.href.indexOf(gDeniedPasteSites[i]) == 0) {
        return false;
        break;
      }
    }
    return true;
  } else {
    for (var i=0; i < gAllowedPasteSites.length; i++) {
      if (win.location.href.indexOf(gAllowedPasteSites[i]) == 0) {
        return true;
        break;
      }
    }
    return false;
  }
}

function myExecCommand(doc, originalExecCommand) {
  return function(aCommandName, aShowDefaultUI, aValueArgument) {
    switch (aCommandName.toLowerCase()) {
    case "cut":
    case "copy":
      if (allowCutCopy(doc)) {
        var win = Services.wm.getMostRecentWindow("navigator:browser");
        win.goDoCommand("cmd_" + aCommandName.toLowerCase());
        return true;
      }
      break;
    case "paste":
      if (allowPaste(doc)) {
        var win = Services.wm.getMostRecentWindow("navigator:browser");
        win.goDoCommand("cmd_" + aCommandName.toLowerCase());
        return true;
      }
      break;
    }
    return originalExecCommand.call(doc, aCommandName, aShowDefaultUI, aValueArgument);
  }
}

function myQueryCommandSupported(doc, originalQueryCommandSupported) {
  return function(aCommandName) {
    switch (aCommandName.toLowerCase()) {
    case "cut":
    case "copy":
      if (allowCutCopy(doc)) {
        return true;
      }
      break;
    case "paste":
      if (allowPaste(doc)) {
        return true;
      }
      break;
    }
    return originalQueryCommandSupported.call(doc, aCommandName, aShowDefaultUI, aValueArgument);
  }
}

var documentObserver = {
  observe: function observe(subject, topic, data) {
    if (subject instanceof Ci.nsIDOMWindow && topic == 'content-document-global-created') {
      var doc = subject.document;
      var cutCopyAllowed = allowCutCopy(doc);
      var pasteAllowed = allowPaste(doc);
      if (!cutCopyAllowed && !pasteAllowed) {
        return;
      }
      var originalExecCommand = Cu.waiveXrays(doc).execCommand;
      Cu.exportFunction(myExecCommand(doc, originalExecCommand), doc, {defineAs: "execCommand"});
      var originalQueryCommandSupported = Cu.waiveXrays(doc).queryCommandSupported;
      Cu.exportFunction(myQueryCommandSupported(doc, originalQueryCommandSupported), doc, {defineAs: "queryCommandSupported"});
      var originalQueryCommandEnabled = Cu.waiveXrays(doc).queryCommandEnabled;
      Cu.exportFunction(myQueryCommandSupported(doc, originalQueryCommandEnabled), doc, {defineAs: "queryCommandEnabled"});
    }
  }
}

// Don't do this check before Firefox 29
if (Services.vc.compare(Services.appinfo.version, "29") > 0) {
  try {
    if (Services.prefs.getCharPref("capability.policy.default.Clipboard.cutcopy") == "allAccess") {
      gDefaultCutCopyPolicy = true;
    }
  } catch (e) {}
  try {
    if (Services.prefs.getCharPref("capability.policy.default.Clipboard.paste") == "allAccess") {
      gDefaultPastePolicy = true;
    }
  } catch (e) {}
  try {
    var policies = [];
    policies = Services.prefs.getCharPref("capability.policy.policynames").split(', ');
    for (var i=0; i < policies.length; i++ ) {
      try {
        if (Services.prefs.getCharPref("capability.policy." + policies[i] + ".Clipboard.cutcopy") == "allAccess") {
          var allowedCutCopySites = Services.prefs.getCharPref("capability.policy." + policies[i] + ".sites").split(" ");
          for (var j=0; j < allowedCutCopySites.length; j++) {
            gAllowedCutCopySites.push(allowedCutCopySites[j]);
          }
        }
      } catch(e) {}
      try {
        if (Services.prefs.getCharPref("capability.policy." + policies[i] + ".Clipboard.cutcopy") == "noAccess") {
          var deniedCutCopySites = Services.prefs.getCharPref("capability.policy." + policies[i] + ".sites").split(" ");
          for (var j=0; j < deniedCutCopySites.length; j++) {
            gDeniedCutCopySites.push(deniedCutCopySites[j]);
          }
        }
      } catch(e) {}
      try {
        if (Services.prefs.getCharPref("capability.policy." + policies[i] + ".Clipboard.paste") == "allAccess") {
          var allowedPasteSites = Services.prefs.getCharPref("capability.policy." + policies[i] + ".sites").split(" ");
          for (var j=0; j < allowedPasteSites.length; j++) {
            gAllowedPasteSites.push(allowedPasteSites[j]);
          }
        }
      } catch(e) {}
      try {
        if (Services.prefs.getCharPref("capability.policy." + policies[i] + ".Clipboard.paste") == "noAccess") {
          var deniedPasteSites = Services.prefs.getCharPref("capability.policy." + policies[i] + ".sites").split(" ");
          for (var j=0; j < deniedPasteSites.length; j++) {
            gDeniedPasteSites.push(deniedPasteSites[j]);
          }
        }
      } catch(e) {}
    }
  } catch (e) {}
  if (gDefaultCutCopyPolicy || gDefaultPastePolicy ||
      gAllowedCutCopySites.length > 0 || gAllowedPasteSites> 0) {
    Services.obs.addObserver(documentObserver, "content-document-global-created", false);
    addEventListener("unload", function() {
      Services.obs.removeObserver(documentObserver, "content-document-global-created", false);
    })
  }
}
