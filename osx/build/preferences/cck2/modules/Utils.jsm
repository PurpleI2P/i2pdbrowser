const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

var EXPORTED_SYMBOLS = ["errorCritical"];

Components.utils.import("resource://gre/modules/Services.jsm");

function errorCritical(e)
{
  Services.prompt.alert(null, "", e);
}
