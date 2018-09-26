/**
 * Copied from https://github.com/jvillalobos/CTP-Manager/blob/master/extension/modules/permissions.js
 **/

/**
 * Copyright 2013 Jorge Villalobos
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var EXPORTED_SYMBOLS = ["CTP"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/Services.jsm");

var CTP = {
  /**
   * Cleans up the plugin name to a more readable form.
   * Taken from /browser/base/content/pageinfo/permissions.js (Firefox 20)
   * @param aPluginName the name to clean up.
   * @return cleaned up plugin name.
   */
  makeNicePluginName : function(aPluginName) {
    let newName =
      aPluginName.replace(/[\s\d\.\-\_\(\)]+$/, "").
        replace(/\bplug-?in\b/i, "").trim();

    return newName;
  },

  /**
   * Gets the plugin permission string from the tag object. In Firefox 20, this
   * is the plugin filename. In 21 an above, the file extension is removed and
   * Flash and Java are special-cased.
   * @param aTag the tag object with the plugin information.
   * @return permission string that corresponds to the plugin in the tag.
   */
  getPluginPermissionFromTag : function(aTag) {
    let permission = null;
    let majorVersion = Services.appinfo.platformVersion.split(".")[0];

    if (21 <= majorVersion) {
      let mimeTypes = aTag.getMimeTypes();

      if (CTP.isFlashPlugin(mimeTypes)) {
        permission = "flash";
      } else if (CTP.isJavaPlugin(mimeTypes)) {
        permission = "java";
      } else {
        let lastPeriod = aTag.filename.lastIndexOf(".");

        permission =
          ((0 < lastPeriod) ? aTag.filename.substring(0, lastPeriod) :
           aTag.filename);
        // Remove digits at the end
        permission = permission.replace(/[0-9]+$/, "");
        permission = permission.toLowerCase();
      }
    } else {
      permission = aTag.filename;
    }

    return permission;
  },

  /**
   * Checks if the tag object corresponds to the Java plugin.
   * @param aMimeTypes the list of MIME types for the plugin.
   * @return true if the tag corresponds to the Java plugin.
   */
  isJavaPlugin : function(aMimeTypes) {
    let isJava = false;
    let mimeType;

    for (let i = 0; i < aMimeTypes.length; i++) {
      mimeType =
        ((null != aMimeTypes[i].type) ? aMimeTypes[i].type : aMimeTypes[i]);

      if ((0 == mimeType.indexOf("application/x-java-vm")) ||
          (0 == mimeType.indexOf("application/x-java-applet")) ||
          (0 == mimeType.indexOf("application/x-java-bean"))) {
        isJava = true;
        break;
      }
    }

    return isJava;
  },

  /**
   * Checks if the tag object corresponds to the Flash plugin.
   * @param aMimeTypes the list of MIME types for the plugin.
   * @return true if the tag corresponds to the Flash plugin.
   */
  isFlashPlugin : function(aMimeTypes) {
    let isFlash = false;
    let mimeType;

    for (let i = 0; i < aMimeTypes.length; i++) {
      mimeType =
        ((null != aMimeTypes[i].type) ? aMimeTypes[i].type : aMimeTypes[i]);

      if (0 == mimeType.indexOf("application/x-shockwave-flash")) {
        isFlash = true;
        break;
      }
    }

    return isFlash;
  }
};
