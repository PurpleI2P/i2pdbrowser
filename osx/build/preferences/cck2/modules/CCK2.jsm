const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

var EXPORTED_SYMBOLS = ["CCK2"];

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PlacesUtils.jsm");
try {
  Cu.import("resource://gre/modules/Timer.jsm");  
} catch (ex) {
  Cu.import("resource://cck2/Timer.jsm");  
}
Cu.import("resource://cck2/Preferences.jsm");
Cu.import("resource://cck2/CTPPermissions.jsm");
Cu.import("resource:///modules/distribution.js");

XPCOMUtils.defineLazyServiceGetter(this, "bmsvc",
    "@mozilla.org/browser/nav-bookmarks-service;1", "nsINavBookmarksService");
XPCOMUtils.defineLazyServiceGetter(this, "annos",
    "@mozilla.org/browser/annotation-service;1", "nsIAnnotationService");
XPCOMUtils.defineLazyServiceGetter(this, "override",
    "@mozilla.org/security/certoverride;1", "nsICertOverrideService");
XPCOMUtils.defineLazyServiceGetter(this, "uuid",
    "@mozilla.org/uuid-generator;1", "nsIUUIDGenerator");

Cu.importGlobalProperties(["XMLHttpRequest"]);

/* Hack to work around bug that AutoConfig is loaded in the wrong charset */
/* Not used for Firefox 44 and above (see CCK2.init) */
let fixupUTF8 = function(str) {
  if (!str) {
    return null;
  }
  var out, i, len, c;
  var char2, char3;

  out = "";
  len = str.length;
  i = 0;
  while(i < len) {
    c = str.charCodeAt(i++);
    switch(c >> 4)
    {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += str.charAt(i-1);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = str.charCodeAt(i++);
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = str.charCodeAt(i++);
        char3 = str.charCodeAt(i++);
        out += String.fromCharCode(((c & 0x0F) << 12) | ((char2 & 0x3F) << 6) | ((char3 & 0x3F) << 0));
        break;
    }
  }

  return out;
};

/* Crazy hack to work around distribution.ini bug */
/* Basically if the distribution can't be parsed,  make it null */
let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
             getService(Ci.nsIProperties);
let iniFile = dirSvc.get("XREAppDist", Ci.nsIFile);
iniFile.leafName = "distribution";
iniFile.append("distribution.ini");
if (iniFile.exists()) {
  try {
    let ini = Cc["@mozilla.org/xpcom/ini-parser-factory;1"].
                 getService(Ci.nsIINIParserFactory).
                 createINIParser(iniFile);
  } catch (e) {
    DistributionCustomizer.prototype.__defineGetter__("_iniFile", function() { return null;});
  }
}

var networkPrefMapping = {
  proxyType: "network.proxy.type",
  proxyHTTP: "network.proxy.http",
  proxyHTTPPort: "network.proxy.http_port",
  proxySSL: "network.proxy.ssl",
  proxySSLPort: "network.proxy.ssl_port",
  proxyFTP: "network.proxy.ftp",
  proxyFTPPort: "network.proxy.ftp_port",
  proxySOCKS: "network.proxy.socks",
  proxySOCKSPort: "network.proxy.socks_port",
  proxySocksVersion: "network.proxy.socks_version",
  proxyNone: "network.proxy.no_proxies_on",
  proxyAutoConfig: "network.proxy.autoconfig_url",
  shareAllProxies: "network.proxy.share_proxy_settings",
  proxySOCKSRemoteDNS: "network.proxy.socks_remote_dns",
  proxyAutologin: "signon.autologin.proxy"
}


function alert(string) {
  Services.prompt.alert(Services.wm.getMostRecentWindow("navigator:browser"), "", string);
} 

var gBundlePrefFiles = [];

var CCK2 = {
  configs: {},
  firstrun: false,
  upgrade: false,
  installedVersion: null,
  initialized: false,
  aboutFactories: [],
  init: function(config, a, b) {
    if (a == b) {
      /* See bugzilla 1193625/1137799 */
      fixupUTF8 = function(str) { return str };
    }
    // Bring back default profiles for >= FF46
    if (Services.vc.compare(Services.appinfo.version, "46") >= 0) {
      // If it is a new profile
      if (!Preferences.isSet("browser.startup.homepage_override.mstone")) {
        var defaultProfileDir = Services.dirsvc.get("GreD", Ci.nsIFile);
        defaultProfileDir.append("defaults");
        defaultProfileDir.append("profile");
        if (defaultProfileDir.exists()) {
          var profileDir = Services.dirsvc.get("ProfD", Ci.nsIFile);
          try {
            copyDir(defaultProfileDir, profileDir);
          } catch(e) {
            Components.utils.reportError("Error copying default profile directory: "  + e);
          }
        }
      }
    }
    try {
      for (var id in this.configs) {
        if (id == config.id) {
          // We've already processed this config
          return;
        }
      }
      if (!config) {
        // Try to get config from default preference. If it is there, default
        // preference always wins
        var configJSON = Preferences.defaults.get("extensions.cck2.config");
        if (!configJSON) {
          configJSON = Preferences.defaults.get("extensions.cck2.config");
        }
        if (!configJSON) {
          // Try something else. Grou policy?
        }
        try {
          config = JSON.parse(configJSON);
        } catch (ex) {
          return;
        }
      }
  
      if (!config)
        return;
      if (!config.id) {
        alert("Missing ID in config");
      }
      config.firstrun = Preferences.get("extensions.cck2." + config.id + ".firstrun", true);
      Preferences.set("extensions.cck2." + config.id + ".firstrun", false);
      if (!config.firstrun) {
        config.installedVersion = Preferences.get("extensions.cck2." + config.id + ".installedVersion");
        config.upgrade = (config.installedVersion != config.version);
      }
      Preferences.set("extensions.cck2." + config.id + ".installedVersion", config.version);
      Preferences.lock("distribution.id", config.id);
      Preferences.lock("distribution.version", config.version + " (CCK2)");
//      Preferences.lock("distribution.about", String(config.id + " - " + config.version + " (CCK2)"));

      if (config.removeDefaultSearchEngines) {
        Services.io.getProtocolHandler("resource").QueryInterface(Components.interfaces.nsIResProtocolHandler)
                                                  .setSubstitution("search-plugins", null);
      }
      if (config.noAddonCompatibilityCheck) {
        Preferences.reset("extensions.lastAppVersion");
      }
      if (config.preferences) {
        for (var i in config.preferences) {
          // For plugin.disable_full_page_plugin_for_types, there is
          // a default user value (application/pdf).
          // Because of this, setting the default value doesn't work.
          // So if a user is trying to set the default value, we set
          // the user value instead.
          // But we only do that if it's set to application/pdf
          // or not set (startup), or it's a CCK2 upgrade or first install
          // As a side note, at Firefox install, application/pdf is added
          // to the pref no matter what
          if (i == "plugin.disable_full_page_plugin_for_types") {
            if (!config.preferences[i].userset &&
                !config.preferences[i].locked &&
                !config.preferences[i].clear) {
              if (Preferences.get(i) == "application/pdf" ||
                  !Preferences.get(i) || // firstrun
                  config.upgrade ||
                  config.firstrun) {
                Preferences.set(i, config.preferences[i].value);
                continue;
              }
            }
          }
          // Workaround bug where this pref is coming is as a string from import
          if (i == "toolkit.telemetry.prompted") {
            config.preferences[i].value = parseInt(config.preferences[i].value);
          }
          if (config.preferences[i].locked) {
            Preferences.lock(i, config.preferences[i].value);
          } else if (config.preferences[i].userset) {
            Preferences.set(i, config.preferences[i].value);
          } else if (config.preferences[i].clear) {
            Preferences.reset(i);
          } else {
            if (i == "browser.startup.homepage" ||
                i == "gecko.handlerService.defaultHandlersVersion" ||
                i == "browser.menu.showCharacterEncoding" ||
                i == "intl.accept_languages" ||
                i.indexOf("browser.search.defaultenginename") == 0 ||
                i.indexOf("browser.search.order") == 0 ||
                i.indexOf("browser.contentHandlers.types") == 0 ||
                i.indexOf("gecko.handlerService.schemes") == 0) {
              // If it's a complex preference, we need to set it differently
              Preferences.defaults.set(i, "data:text/plain," + i + "=" + config.preferences[i].value);
            } else {
              Preferences.defaults.set(i, config.preferences[i].value);
            }
          }
        }
      }
      if (config.registry && "@mozilla.org/windows-registry-key;1" in Cc) {
        for (var i in config.registry) {
          addRegistryKey(config.registry[i].rootkey,
                         config.registry[i].key,
                         config.registry[i].name,
                         config.registry[i].value,
                         config.registry[i].type);
        }
      }
      if (config.permissions) {
        for (var i in config.permissions) {
          for (var j in config.permissions[i]) {
            if (i.indexOf("http") == 0) {
              Services.perms.add(NetUtil.newURI(i), j, config.permissions[i][j]);
            } else {
              var domain = i.replace(/^\*\./g, '');
              Services.perms.add(NetUtil.newURI("http://" + domain), j, config.permissions[i][j]);
              Services.perms.add(NetUtil.newURI("https://" + domain), j, config.permissions[i][j]);
            }
            if (j == "plugins") {
              var plugins = Cc["@mozilla.org/plugin/host;1"].getService(Ci.nsIPluginHost).getPluginTags({});
              for (var k=0; k < plugins.length; k++) {
                if (i.indexOf("http") == 0) {
                  Services.perms.add(NetUtil.newURI(i), "plugin:" + CTP.getPluginPermissionFromTag(plugins[k]), config.permissions[i][j]);
                  Services.perms.add(NetUtil.newURI(i), "plugin-vulnerable:" + CTP.getPluginPermissionFromTag(plugins[k]), config.permissions[i][j]);
                } else {
                  var domain = i.replace(/^\*\./g, '');
                  Services.perms.add(NetUtil.newURI("http://" + domain), "plugin:" + CTP.getPluginPermissionFromTag(plugins[k]), config.permissions[i][j]);
                  Services.perms.add(NetUtil.newURI("http://" + domain), "plugin-vulnerable:" + CTP.getPluginPermissionFromTag(plugins[k]), config.permissions[i][j]);
                  Services.perms.add(NetUtil.newURI("https://" + domain), "plugin:" + CTP.getPluginPermissionFromTag(plugins[k]), config.permissions[i][j]);
                  Services.perms.add(NetUtil.newURI("https://" + domain), "plugin-vulnerable:" + CTP.getPluginPermissionFromTag(plugins[k]), config.permissions[i][j]);
                }
              }
            }
          }
          if (Object.keys(config.permissions[i]).length === 0) {
            let perms = Services.perms.enumerator;
            while (perms.hasMoreElements()) {
              let perm = perms.getNext();
              try {
                // Firefox 41 and below
                if (perm.host == i) {
                  Services.perms.remove(perm.host, perm.type);
                }
              } catch(e) {
                if (i.indexOf("http") == 0) {
                  if (perm.matchesURI(NetUtil.newURI(i), false)) {
                    perm.remove(NetUtil.newURI(i), perm.type);
                  }
                } else {
                  var domain = i.replace(/^\*\./g, '');
                  if (perm.matchesURI(NetUtil.newURI("http://" + domain), false)) {
                    perm.remove(NetUtil.newURI("http://" + domain), perm.type);
                  }
                  if (perm.matchesURI(NetUtil.newURI("https://" + i), false)) {
                    perm.remove(NetUtil.newURI("https://" + domain), perm.type);
                  }
                }
              }
            }
          }
        }
      }
      if (config.disablePrivateBrowsing) {
        Preferences.lock("browser.taskbar.lists.tasks.enabled", false);
        Preferences.lock("browser.privatebrowsing.autostart", false);
        var aboutPrivateBrowsing = {};
        aboutPrivateBrowsing.classID = Components.ID(uuid.generateUUID().toString());
        aboutPrivateBrowsing.factory = disableAbout(aboutPrivateBrowsing.classID,
                                                "Disable about:privatebrowsing - CCK",
                                                "privatebrowsing");
        CCK2.aboutFactories.push(aboutPrivateBrowsing);
      }
      if (config.noGetAddons) {
        Preferences.lock("extensions.getAddons.showPane", false);
      }
      if (config.noAddons) {
        Preferences.lock("xpinstall.enabled", false);
      }
      if (config.disablePDFjs) {
        Preferences.lock("pdfjs.disabled", true);
      }
      if (config.disableHello) {
        Preferences.lock("loop.enabled", false);
      }
      if (config.disablePocket) {
        Preferences.lock("browser.pocket.enabled", false);
        Preferences.lock("extensions.pocket.enabled", false);
        Preferences.lock("browser.newtabpage.activity-stream.feeds.section.topstories", false);
      }
      if (config.disableHeartbeat) {
        Preferences.lock("browser.selfsupport.url", "");
      }
      if (config.disableInContentPrefs) {
        Preferences.lock("browser.preferences.inContent", false);
      }
      if (config.disableSync) {
        var aboutAccounts = {};
        aboutAccounts.classID = Components.ID(uuid.generateUUID().toString());
        aboutAccounts.factory = disableAbout(aboutAccounts.classID,
                                                "Disable about:accounts - CCK",
                                                "accounts");
        CCK2.aboutFactories.push(aboutAccounts);
        var aboutSyncLog = {};
        aboutSyncLog.classID = Components.ID(uuid.generateUUID().toString());
        aboutSyncLog.factory = disableAbout(aboutSyncLog.classID,
                                                "Disable about:sync-log - CCK",
                                                "sync-log");
        CCK2.aboutFactories.push(aboutSyncLog);
        var aboutSyncProgress = {};
        aboutSyncProgress.classID = Components.ID(uuid.generateUUID().toString());
        aboutSyncProgress.factory = disableAbout(aboutSyncProgress.classID,
                                                "Disable about:sync-progress - CCK",
                                                "sync-progress");
        CCK2.aboutFactories.push(aboutSyncProgress);
        var aboutSyncTabs = {};
        aboutSyncTabs.classID = Components.ID(uuid.generateUUID().toString());
        aboutSyncTabs.factory = disableAbout(aboutSyncTabs.classID,
                                                "Disable about:sync-tabs - CCK",
                                                "sync-tabs");
        CCK2.aboutFactories.push(aboutSyncTabs);
        Preferences.lock("browser.syncPromoViewsLeftMap", JSON.stringify({bookmarks:0, passwords:0, addons:0}));
        Preferences.lock("browser.newtabpage.activity-stream.migrationExpired", true);
        Preferences.lock("identity.fxaccounts.enabled", false);
      }
      var disableAboutConfigFactory = null;
      if (config.disableAboutConfig) {
        var aboutConfig = {};
        aboutConfig.classID = Components.ID(uuid.generateUUID().toString());
        aboutConfig.factory = disableAbout(aboutConfig.classID,
                                                "Disable about:config - CCK",
                                                "config");
        CCK2.aboutFactories.push(aboutConfig);
      }
      if (config.disableAboutProfiles) {
        var aboutProfiles = {};
        aboutProfiles.classID = Components.ID(uuid.generateUUID().toString());
        aboutProfiles.factory = disableAbout(aboutProfiles.classID,
                                                "Disable about:profiles - CCK",
                                                "profiles");
        CCK2.aboutFactories.push(aboutProfiles);
      }
      if (config.disableAboutSupport) {
        var aboutSupport = {};
        aboutSupport.classID = Components.ID(uuid.generateUUID().toString());
        aboutSupport.factory = disableAbout(aboutSupport.classID,
                                                "Disable about:support - CCK",
                                                "support");
        CCK2.aboutFactories.push(aboutSupport);
      }
      if (config.disableAddonsManager) {
        var aboutAddons = {};
        aboutAddons.classID = Components.ID(uuid.generateUUID().toString());
        aboutAddons.factory = disableAbout(aboutAddons.classID,
                                                "Disable about:addons - CCK",
                                                "addons");
        CCK2.aboutFactories.push(aboutAddons);
      }

      if (config.alwaysDefaultBrowser) {
        var shellSvc = Cc["@mozilla.org/browser/shell-service;1"].getService(Ci.nsIShellService);
        if (shellSvc) {
          try {
            var isDefault = shellSvc.isDefaultBrowser(true, false);
            if (!isDefault) {
              shellSvc.setDefaultBrowser(true, false);
            }
          } catch (e) {
            // setDefaultBrowser errors on Yosemite, so we're just ignoring the error.
            // See Bugzilla bug #1063529
          }
        }
      }
      if (config.dontCheckDefaultBrowser) {
        Preferences.lock("browser.shell.checkDefaultBrowser", false);
      }
      if (config.dontUseDownloadDir) {
        Preferences.lock("browser.download.useDownloadDir", false);
      }
      if (config.disableFormFill) {
        Preferences.lock("browser.formfill.enable", false);
      }
      if (config.removeSmartBookmarks) {
        Preferences.lock("browser.places.smartBookmarksVersion", -1);
      }
      if (config.disableCrashReporter) {
        Preferences.lock("toolkit.crashreporter.enabled", false);
        Preferences.lock("browser.crashReports.unsubmittedCheck.autoSubmit", false);
        try {
          Cc["@mozilla.org/toolkit/crash-reporter;1"].
            getService(Ci.nsICrashReporter).submitReports = false;
        } catch (e) {
          // There seem to be cases where the crash reporter isn't defined
        }
        var aboutCrashes = {};
        aboutCrashes.classID = Components.ID(uuid.generateUUID().toString());
        aboutCrashes.factory = disableAbout(aboutCrashes.classID,
                                                "Disable about:crashes - CCK",
                                                "crashes");
        CCK2.aboutFactories.push(aboutCrashes);
      }
      if (config.disableTelemetry) {
        Preferences.lock("toolkit.telemetry.enabled", false);
        Preferences.lock("toolkit.telemetry.prompted", 999);
        Preferences.lock("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
        var aboutTelemetry = {};
        aboutTelemetry.classID = Components.ID(uuid.generateUUID().toString());
        aboutTelemetry.factory = disableAbout(aboutTelemetry.classID,
                                                "Disable about:telemetry - CCK",
                                                "telemetry");
        CCK2.aboutFactories.push(aboutTelemetry);
      }
      if (config.removeDeveloperTools) {
        Preferences.lock("devtools.scratchpad.enabled", false);
        Preferences.lock("devtools.responsiveUI.enabled", false);
        Preferences.lock("devtools.toolbar.enabled", false);
        Preferences.lock("devtools.styleeditor.enabled", false);
        Preferences.lock("devtools.debugger.enabled", false);
        Preferences.lock("devtools.profiler.enabled", false);
        Preferences.lock("devtools.errorconsole.enabled", false);
        Preferences.lock("devtools.inspector.enabled", false);
      }
      if (config.homePage && !config.lockHomePage) {
        Preferences.defaults.set("browser.startup.homepage", "data:text/plain,browser.startup.homepage=" + config.homePage);
        /* If you have a distribution.ini, browser.startup.homepage gets wiped out */
        /* We need to save it */
        if (!Preferences.isSet("browser.startup.homepage")) {
          Preferences.set("browser.startup.homepage", config.homePage);
        }
      }
      if (config.lockHomePage) {
        if (config.homePage) {
          Preferences.lock("browser.startup.homepage", config.homePage);
        } else {
          Preferences.lock("browser.startup.homepage");
        }
        Preferences.lock("pref.browser.homepage.disable_button.current_page", true);
        Preferences.lock("pref.browser.homepage.disable_button.bookmark_page", true);
        Preferences.lock("pref.browser.homepage.disable_button.restore_default", true);
      }
      if (config.noWelcomePage) {
        Preferences.lock("startup.homepage_welcome_url", "");
        Preferences.lock("startup.homepage_welcome_url.additional", "");
        Preferences.lock("browser.usedOnWindows10", true);

      } else if (config.welcomePage) {
        Preferences.lock("startup.homepage_welcome_url", config.welcomePage);
      }
      if (config.noUpgradePage) {
        Preferences.lock("browser.startup.homepage_override.mstone", "ignore");
      } else if (config.upgradePage) {
        Preferences.lock("startup.homepage_override_url", config.upgradePage);
      }
      if (config.dontShowRights) {
        Preferences.lock("browser.rights.override", true);
        var rightsVersion = Preferences.get("browser.rights.version");
        Preferences.lock("browser.rights." + rightsVersion + ".shown", true);
      }
      if (config.dontRememberPasswords) {
        Preferences.lock("signon.rememberSignons", false);
      }
      if (config.disableFirefoxHealthReport) {
        Preferences.lock("datareporting.healthreport.uploadEnabled", false);
        var aboutHealthReport = {};
        aboutHealthReport.classID = Components.ID(uuid.generateUUID().toString());
        aboutHealthReport.factory = disableAbout(aboutHealthReport.classID,
                                                "Disable about:healthreport - CCK",
                                                "healthreport");
        CCK2.aboutFactories.push(aboutHealthReport);
      }
      if (config.disableFirefoxHealthReportUpload) {
        Preferences.lock("datareporting.healthreport.uploadEnabled", false);
      }
      if (config.disableResetFirefox) {
        try {
          Cu.import("resource:///modules/UITour.jsm");
          UITour.origOnPageEvent = UITour.onPageEvent;
          UITour.onPageEvent = function(a, b) {
            var aEvent = b;
            if (!aEvent) {
              aEvent = a;
            }
            if (aEvent.detail.action == "resetFirefox") {
              Services.prompt.alert(null, "CCK2", "This has been disabled by your administrator");
              return;
            }
            UITour.origOnPageEvent(a, b);
          }
          Preferences.lock("browser.disableResetPrompt ", true);
        } catch (e) {}
      }
      if (config.disableFirefoxUpdates) {
        Preferences.lock("app.update.auto", false);
        Preferences.lock("app.update.enabled", false);
      }
      if (config.network) {
        for (var i in networkPrefMapping) {
          if (i in config.network) {
            Preferences.defaults.set(networkPrefMapping[i], config.network[i]);
          }
          if (config.network.locked) {
            Preferences.lock(networkPrefMapping[i]);
          }
        }
      }
      if (config.removeSnippets) {
        Preferences.lock("browser.newtabpage.activity-stream.disableSnippets", true);
      }
      // Fixup bad strings
      if ("helpMenu" in config) {
        if ("label" in config.helpMenu) {
          config.helpMenu.label = fixupUTF8(config.helpMenu.label);
        }
        if ("accesskey" in config.helpMenu) {
          config.helpMenu.accesskey = fixupUTF8(config.helpMenu.accesskey);
        }
      }
      if ("titlemodifier" in config) {
        config.titlemodifier = fixupUTF8(config.titlemodifier);
      }
      if ("defaultSearchEngine" in config) {
        config.defaultSearchEngine = fixupUTF8(config.defaultSearchEngine);
      }
      this.configs[config.id] = config;
    } catch (e) {
      errorCritical(e);
    }
  },
  getConfigs: function() {
    return this.configs;
  },
  observe: function observe(subject, topic, data) {
    switch (topic) {
      case "distribution-customization-complete":
        for (var id in this.configs) {
          var config = this.configs[id];
          // Due to bug 947838, we have to reinitialize default preferences
          {
            var iniFile = Services.dirsvc.get("XREAppDist", Ci.nsIFile);
            iniFile.leafName = "distribution";
            iniFile.append("distribution.ini");
            if (iniFile.exists()) {
              if (config.preferences) {
                for (var i in config.preferences) {
                  // Workaround bug where this pref is coming is as a string from import
                  if (i == "toolkit.telemetry.prompted") {
                     config.preferences[i].value = parseInt(config.preferences[i].value);
                  }
                  if (!("locked" in config.preferences[i]) &&
                      !("userset" in config.preferences[i]) &&
                      !("clear" in config.preferences[i])) {
                    if (Preferences.defaults.has(i)) {
                      try {
                        // If it's a complex preference, we need to set it differently
                        Services.prefs.getComplexValue(i, Ci.nsIPrefLocalizedString).data;
                        Preferences.defaults.set(i, "data:text/plain," + i + "=" + config.preferences[i].value);
                      } catch (ex) {
                        Preferences.defaults.set(i, config.preferences[i].value);
                      }
                    } else {
                      Preferences.defaults.set(i, config.preferences[i].value);
                    }
                  }
                }
              }
            }
            if (config.homePage && !config.lockHomePage) {
              Preferences.defaults.set("browser.startup.homepage", "data:text/plain,browser.startup.homepage=" + config.homePage);
              /* If you have a distribution.ini, we changed browser.startup.homepage */
              /* Put it back */
              if (Preferences.get("browser.startup.homepage") == config.homePage) {
                Preferences.reset("browser.startup.homepage");
              }
            }
            if (config.network) {
              for (var i in networkPrefMapping) {
                if (i in config.network) {
                  Preferences.defaults.set(networkPrefMapping[i], config.network[i]);
                }
              }
            }
          }
          // Try to install devices every time just in case get added after install
          if ("certs" in config && "devices" in config.certs) {
            let pkcs11;
            try {
              pkcs11 = Components.classes["@mozilla.org/security/pkcs11;1"].getService(Ci.nsIPKCS11);
            } catch (e) {
              pkcs11 = Components.classes["@mozilla.org/security/pkcs11moduledb;1"].getService(Ci.nsIPKCS11ModuleDB);
            }
            for (var i=0; i < config.certs.devices.length; i++) {
              var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
              try {
                file.initWithPath(config.certs.devices[i].path);
                if (file.exists()) {
                  pkcs11.addModule(config.certs.devices[i].name, config.certs.devices[i].path, 0, 0);
                }
              } catch(e) {
                // Ignore path errors in case we are on different OSes
              }
            }
          }
          if (!config.firstrun && config.installedVersion == config.version) {
            continue;
          }
          if (config.removeSmartBookmarks) {
            var smartBookmarks = annos.getItemsWithAnnotation("Places/SmartBookmark", {});
            for (var i = 0; i < smartBookmarks.length; i++) {
              try {
                bmsvc.removeItem(smartBookmarks[i]);
              } catch (ex) {}
            }
          }
          let syncBookmarks = false;
          if ("getIdForItemAt" in bmsvc) {
            syncBookmarks = true;
          }
          if (config.removeDefaultBookmarks) {
            if (syncBookmarks) {
              var firefoxFolder = bmsvc.getIdForItemAt(bmsvc.bookmarksMenuFolder, 3);
              if ((firefoxFolder != -1) && (bmsvc.getItemType(firefoxFolder) == bmsvc.TYPE_FOLDER)) {
                var aboutMozilla = bmsvc.getIdForItemAt(firefoxFolder, 3);
                if (aboutMozilla != -1 &&
                    bmsvc.getItemType(aboutMozilla) == bmsvc.TYPE_BOOKMARK &&
                    /https?:\/\/www.mozilla.(com|org)\/.*\/about/.test(bmsvc.getBookmarkURI(aboutMozilla).spec)) {
                  bmsvc.removeItem(firefoxFolder);
                }
              }
              var userAgentLocale = Preferences.defaults.get("general.useragent.locale");
              var gettingStartedURL = "https://www.mozilla.org/" + userAgentLocale + "/firefox/central/";
              var bookmarks = bmsvc.getBookmarkIdsForURI(NetUtil.newURI("https://www.mozilla.org/" + userAgentLocale + "/firefox/central/"));
              if (bookmarks.length == 0) {
                bookmarks = bmsvc.getBookmarkIdsForURI(NetUtil.newURI("http://www.mozilla.com/" + userAgentLocale + "/firefox/central/"));
              }
              if (bookmarks.length > 0) {
                bmsvc.removeItem(bookmarks[0])
              }
              var bookmarks = bmsvc.getBookmarkIdsForURI(NetUtil.newURI("https://www.mozilla.org/" + userAgentLocale + "/about/"));
              if (bookmarks.length == 0) {
                bookmarks = bmsvc.getBookmarkIdsForURI(NetUtil.newURI("http://www.mozilla.com/" + userAgentLocale + "/about/"));
              }
              if (bookmarks.length > 0) {
                var mozillaFolder = bmsvc.getFolderIdForItem(bookmarks[0]);
                if (mozillaFolder != -1) {
                  var mozillaFolderIndex = bmsvc.getItemIndex(mozillaFolder);
                  var mozillaFolderParent = bmsvc.getFolderIdForItem(mozillaFolder);
                  bmsvc.removeItem(mozillaFolder);
                  if (config.removeSmartBookmarks) {
                    var separator = bmsvc.getIdForItemAt(mozillaFolderParent, mozillaFolderIndex-1);
                    if (separator != -1) {
                      bmsvc.removeItem(separator);
                    }
                  }
                }
              }

            } else {
              removeDefaultBookmarks();
            }
          }

          // If we detect an old CCK Wizard, remove it's bookmarks
          var bookmarksToRemove = [];
          if ("extension" in config) {
            var oldCCKVersion = Preferences.get("extensions." + config.extension.id + ".version", null);
            if (oldCCKVersion) {
              Preferences.reset("extensions." + config.extension.id + ".version");
              bookmarksToRemove = bookmarksToRemove.concat(annos.getItemsWithAnnotation(config.extension.id + "/" + oldCCKVersion, {}));
            }
          }
          if (config.installedVersion != config.version) {
            bookmarksToRemove = bookmarksToRemove.concat(annos.getItemsWithAnnotation(config.id + "/" + config.installedVersion, {}));
            bookmarksToRemove = bookmarksToRemove.concat(annos.getItemsWithAnnotation(config.installedVersion + "/" + config.installedVersion, {}));
          }
          // Just in case, remove bookmarks for this version too
          bookmarksToRemove = bookmarksToRemove.concat(annos.getItemsWithAnnotation(config.id + "/" + config.version, {}));
          if (syncBookmarks) {
            let bmFolders = [];
            for (var i = 0; i < bookmarksToRemove.length; i++) {
              try {
                var itemType = bmsvc.getItemType(bookmarksToRemove[i]);
                if (itemType == bmsvc.TYPE_FOLDER) {
                  bmFolders.push(bookmarksToRemove[i]);
                } else {
                  bmsvc.removeItem(bookmarksToRemove[i]);
                }
              } catch (e) {
                Components.utils.reportError(e);
              }
            }
            if (bmFolders.length > 0) {
              // Only remove folders if they are empty
              for (var i = 0; i < bmFolders.length; i++) {
                try {
                  var bmID = bmsvc.getIdForItemAt(bmFolders[i], 0);
                  if (bmID == -1) {
                    bmsvc.removeItem(bmFolders[i]);
                  } else {
                    var newTitle = bmsvc.getItemTitle(bmFolders[i]) + " (" + (oldCCKVersion || config.installedVersion) + ")";
                    bmsvc.setItemTitle(bmFolders[i], newTitle);
                  }
                } catch (e) {
                  bmsvc.removeItem(bmFolders[i]);
                }
              }
            }
          } else {
            removeOldBookmarks(bookmarksToRemove, oldCCKVersion || config.installedVersion);
          }
          if (config.bookmarks) {
            if (config.bookmarks.toolbar) {
              if (syncBookmarks) {
                addBookmarksSync(config.bookmarks.toolbar, bmsvc.toolbarFolder, config.id + "/" + config.version, config.removeDuplicateBookmarkNames);
              } else {
                addBookmarks(config.bookmarks.toolbar, PlacesUtils.bookmarks.toolbarGuid, config.id + "/" + config.version, config.removeDuplicateBookmarkNames);
              }
            }
            if (config.bookmarks.menu) {
              if (syncBookmarks) {
                addBookmarksSync(config.bookmarks.menu, bmsvc.bookmarksMenuFolder, config.id + "/" + config.version, config.removeDuplicateBookmarkNames);
              } else {
                addBookmarks(config.bookmarks.menu, PlacesUtils.bookmarks.menuGuid, config.id + "/" + config.version, config.removeDuplicateBookmarkNames);
              }
            }
          }
          if (config.searchplugins || config.defaultSearchEngine) {
            searchInitRun(function() {
              if (Array.isArray(config.searchplugins)) {
                for (var i=0; i < config.searchplugins.length; i++) {
                  Services.search.addEngine(config.searchplugins[i], Ci.nsISearchEngine.DATA_XML, null, false, {
                    onSuccess: function (engine) {
                      if (engine.name == config.defaultSearchEngine) {
                        Services.search.currentEngine = engine;
                      }
                    },
                    onError: function (errorCode) {
                      Components.utils.reportError("Engine install error: " + errorCode);
                      // Ignore errors
                    }
                  });
                }
              } else {
                for (let enginename in config.searchplugins) {
                  var engine = Services.search.getEngineByName(enginename);
                  if (engine) {
                    Services.search.removeEngine(engine);
                  }
                  Services.search.addEngine(config.searchplugins[enginename], Ci.nsISearchEngine.DATA_XML, null, false, {
                    onSuccess: function (engine) {
                      if (engine.name == config.defaultSearchEngine) {
                        Services.search.currentEngine = engine;
                      }
                    },
                    onError: function (errorCode) {
                      Components.utils.reportError("Engine install error: " + errorCode);
                    }
                  });
                }
              }

              var defaultSearchEngine = Services.search.getEngineByName(config.defaultSearchEngine);
              if (defaultSearchEngine) {
                Services.search.currentEngine = defaultSearchEngine;
              }
            });
          }
          if (config.disableSearchEngineInstall) {
            try {
              Cu.import("resource:///modules/ContentLinkHandler.jsm");
              ContentLinkHandler.origOnLinkAdded = ContentLinkHandler.onLinkAdded;
              ContentLinkHandler.onLinkAdded = function(event, chromeGlobal) {
                if (event.originalTarget.rel == "search") {
                  return;
                }
                ContentLinkHandler.origOnLinkAdded(event, chromeGlobal);
              };
            } catch (e) {
              // Just in case we are pre Firefox 31
            }
          }
        }
        break;
      case "browser-ui-startup-complete":
        var disableWebApps = false;
        for (var id in this.configs) {
          var config = this.configs[id];
          if (config.disableWebApps) {
            disableWebApps = true;
            break;
          }
        }
        if (!disableWebApps) {
          return;
        }
        try {
          Cu.import("resource://gre/modules/WebappManager.jsm");
        } catch (e) {
          try {
            Cu.import("resource:///modules/WebappManager.jsm");
          } catch (e) {}
        }
        try {
          WebappManager.doInstall = function() {
            var win = Services.wm.getMostRecentWindow("navigator:browser");
            var gBrowser = win.gBrowser;
            var gNavigatorBundle = win.gNavigatorBundle
            messageString = gNavigatorBundle.getString("xpinstallDisabledMessageLocked");;
            var options = {
              timeout: Date.now() + 30000
            };
            win.PopupNotifications.show(gBrowser.selectedBrowser, "xpinstall-disabled",
                                        messageString, "addons-notification-icon",
                                        null, null, options);
          };
        } catch(e) {
          // Web Apps was removed
        }
        break;
      case "final-ui-startup":
        for (var id in this.configs) {
          var config = this.configs[id];
          // Delay loading unnecessary modules
          // We should do this on a timeout
          loadModules(config);
          if (!config.firstrun && config.installedVersion == config.version) {
            return;
          }
          if ("certs" in config) {
            if ("override" in config.certs) {
              for (var i=0; i < config.certs.override.length; i++) {
                var xhr = new XMLHttpRequest();
                try {
                  xhr.open("GET", "https://" + config.certs.override[i]);
                  xhr.channel.notificationCallbacks = SSLExceptions;
                  xhr.send(null);
                } catch (ex) {}
              }
            }
            var certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(Ci.nsIX509CertDB);
            var certdb2 = certdb;
            try {
              certdb2 = Cc["@mozilla.org/security/x509certdb;1"].getService(Ci.nsIX509CertDB2);
            } catch (e) {}
            if (config.certs.ca) {
              for (var i=0; i < config.certs.ca.length; i++) {
                var certTrust;
                if (config.certs.ca[i].trust){
                  certTrust = config.certs.ca[i].trust
                } else {
                  certTrust = ",,";
                }
                if (config.certs.ca[i].url) {
                  try {
                    download(config.certs.ca[i].url, function(file, extraParams) {
                      var istream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
                      istream.init(file, -1, -1, false);
                      var bstream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
                      bstream.setInputStream(istream);
                      var cert = bstream.readBytes(bstream.available());
                      bstream.close();
                      istream.close();
                      if (/-----BEGIN CERTIFICATE-----/.test(cert)) {
                        certdb2.addCertFromBase64(fixupCert(cert), extraParams.trust, "");
                      } else {
                        certdb.addCert(cert, extraParams.trust, "");
                      }
                    }, errorCritical, {trust: certTrust});
                  } catch (e) {
                    errorCritical("Unable to install " + config.certs.ca[i].url + " - " + e);
                  }
                } else if (config.certs.ca[i].cert) {
                  certdb2.addCertFromBase64(fixupCert(config.certs.ca[i].cert), certTrust, "");
                }
              }
            }
            if (config.certs.server) {
              for (var i=0; i < config.certs.server.length; i++) {
                try {
                  download(config.certs.server[i], function(file) {
                    try {
                      certdb.importCertsFromFile(null, file, Ci.nsIX509Cert.SERVER_CERT);
                    } catch(e) {
                      // API removed in bugzilla #1064402 (FF47)
                    }
                  }, errorCritical);
                } catch (e) {
                  errorCritical("Unable to install " + config.certs.server[i] + " - " + e);
                }
              }
            }
          }
          if (config.persona) {
            var temp = {};
            Components.utils.import("resource://gre/modules/LightweightThemeManager.jsm", temp);
            temp.LightweightThemeManager.currentTheme = config.persona;
          }
          if (config.addons) {
            Cu.import("resource://gre/modules/AddonManager.jsm");
            var numAddonsInstalled = 0;
            var numAddons = config.addons.length;
            let listener = {
              onInstallEnded: function(install, addon) {
                if (addon.isActive) {
                  // restartless add-on, so we don't need to restart
                  numAddons--;
                } else {
                  numAddonsInstalled++;
                }
                if (numAddonsInstalled > 0 &&
                    numAddonsInstalled == numAddons) {
                  Services.startup.quit(Services.startup.eRestart | Services.startup.eAttemptQuit);
                }
              }
            }
            for (var i=0; i < config.addons.length; i++) {
              try {
                AddonManager.getInstallForURL(config.addons[i], function(addonInstall) {
                  addonInstall.addListener(listener);
                  addonInstall.install();
                }, "application/x-xpinstall");
              } catch (e) {
                try {
                  AddonManager.getInstallForURL(config.addons[i], "application/x-xpinstall").then(addonInstall => {
                    addonInstall.addListener(listener);
                    addonInstall.install();
                  });
                } catch (e) {
                  errorCriticial(e);
                }
              }
            }
          }
        }
        break;
      case "load-extension-defaults":
        if (gBundlePrefFiles.length > 0) {
          // Create a temporary scope so the pref function works
          var temp = {};
          temp.pref = function(a, b) {
            Preferences.defaults.set(a, b);
          }
          gBundlePrefFiles.forEach(function(prefFile) {
            Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                      .getService(Components.interfaces.mozIJSSubScriptLoader)
                      .loadSubScript(prefFile, temp);
          });
        }
        break;
      case "quit-application":
        var registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
        for (var i=0; i < CCK2.aboutFactories.length; i++)
          registrar.unregisterFactory(CCK2.aboutFactories[i].classID, CCK2.aboutFactories[i].factory);
        break;
    }
  }
}

async function removeDefaultBookmarks() {
  var firefoxFolder = await PlacesUtils.bookmarks.fetch({
    parentGuid: PlacesUtils.bookmarks.menuGuid,
    index: 0});
  if (firefoxFolder && firefoxFolder.type == PlacesUtils.bookmarks.TYPE_FOLDER) {
    await PlacesUtils.bookmarks.remove(firefoxFolder);
  }
  var userAgentLocale = Preferences.defaults.get("general.useragent.locale");
  if (!userAgentLocale) {
    userAgentLocale = Services.locale.getRequestedLocales()[0];
  }
  var userAgentLocale = "en-US";
  var gettingStartedURL = "https://www.mozilla.org/" + userAgentLocale + "/firefox/central/";
  let bookmarks = [];
  await PlacesUtils.bookmarks.fetch({url: gettingStartedURL}, b => bookmarks.push(b));
  for (let bookmark of bookmarks) {
    await PlacesUtils.bookmarks.remove(bookmark);
  }
}

async function removeOldBookmarks(oldBookmarks, oldVersion) {
  let bmFolders = [];
  for (var i = 0; i < oldBookmarks.length; i++) {
    try {
      let guid = await PlacesUtils.promiseItemGuid(oldBookmarks[i]);
      let bookmark = await PlacesUtils.bookmarks.fetch(guid);
      if (bookmark.type == PlacesUtils.bookmarks.TYPE_FOLDER) {
        bmFolders.push(bookmark);
      } else {
        await PlacesUtils.bookmarks.remove(bookmark);
      }
    } catch (ex) {
      Components.utils.reportError(ex);
    }
  }
  if (bmFolders.length > 0) {
    // Only remove folders if they are empty
    for (var i = 0; i < bmFolders.length; i++) {
      let bookmarks = [];
      await PlacesUtils.bookmarks.fetch({parentGuid: bmFolders[i].guid, index: 0}, b => bookmarks.push(b));
      if (bookmarks.length == 0) {
        await PlacesUtils.bookmarks.remove(bmFolders[i]);
      } else {
        PlacesUtils.bookmarks.update({guid: bmFolders[i].guid,
                                     title: `${bmFolders[i].title} (${oldVersion})`});
      }
    }
  }
}

function loadModules(config) {
  let globalMM = Cc["@mozilla.org/globalmessagemanager;1"].getService();
  globalMM.addMessageListener("cck2:get-configs", function(message) {
    return CCK2.configs;
  });
  globalMM.addMessageListener("cck2:open-url", function(message) {
    var win = Services.wm.getMostRecentWindow("navigator:browser");
    if (win) {
      win.openUILinkIn(message.data.url, message.data.where);
    }
  });
  Cu.import("resource://cck2/CCK2AboutDialogOverlay.jsm");
  Cu.import("resource://cck2/CCK2AboutAddonsOverlay.jsm");
  Cu.import("resource://cck2/CCK2PreferencesOverlay.jsm");
  globalMM.loadFrameScript("resource://cck2/CCK2Framescript.js", true);
  globalMM.loadFrameScript("resource://cck2/CCK2AboutHomeFramescript.js", true);
  globalMM.loadFrameScript("resource://cck2/CAPSCheckLoadURIFramescript.js", true);
  globalMM.loadFrameScript("resource://cck2/CAPSClipboardFramescript.js", true);
  Cu.import("resource://cck2/CCK2AboutSupportOverlay.jsm");
  Cu.import("resource://cck2/CCK2BrowserOverlay.jsm");
  Cu.import("resource://cck2/CCK2FileBlock.jsm");
}

function addRegistryKey(RootKey, Key, Name, NameValue, Type) {
  const nsIWindowsRegKey = Ci.nsIWindowsRegKey;
  var key = null;

  try {
    key = Cc["@mozilla.org/windows-registry-key;1"]
                .createInstance(nsIWindowsRegKey);
    var rootKey;
    switch (RootKey) {
      case "HKEY_CLASSES_ROOT":
        rootKey = nsIWindowsRegKey.ROOT_KEY_CLASSES_ROOT;
        break;
      case "HKEY_CURRENT_USER":
        rootKey = nsIWindowsRegKey.ROOT_KEY_CURRENT_USER;
        break;
      default:
        rootKey = nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE;
        break;
    }

    key.create(rootKey, Key, nsIWindowsRegKey.ACCESS_WRITE);

    switch (Type) {
      case "REG_DWORD":
        key.writeIntValue(Name, NameValue);
        break;
      case "REG_QWORD":
        key.writeInt64Value(Name, NameValue);
        break;
      case "REG_BINARY":
        key.writeBinaryValue(Name, NameValue);
        break;
      case "REG_SZ":
      default:
        key.writeStringValue(Name, NameValue);
        break;
    }
    key.close();
  } catch (ex) {
    /* This could fail if you don't have the right authority on Windows */
    if (key) {
      key.close();
    }
  }
}

function addBookmarksSync(bookmarks, destination, annotation, removeDuplicateBookmarkNames) {
  for (var i =0; i < bookmarks.length; i++) {
    if (bookmarks[i].folder) {
      var newFolderId = bmsvc.createFolder(destination, fixupUTF8(bookmarks[i].name), bmsvc.DEFAULT_INDEX);
      annos.setItemAnnotation(newFolderId, annotation, "true", 0, annos.EXPIRE_NEVER);
      addBookmarksSync(bookmarks[i].folder, newFolderId, annotation, removeDuplicateBookmarkNames);
    } else if (bookmarks[i].type == "separator") {
      var separatorId = bmsvc.insertSeparator(destination, bmsvc.DEFAULT_INDEX);
      annos.setItemAnnotation(separatorId, annotation, "true", 0, annos.EXPIRE_NEVER);
    } else {
      try {
        var uri = NetUtil.newURI(bookmarks[i].location);
        var title = fixupUTF8(bookmarks[i].name);
        var bookmarkIds = bmsvc.getBookmarkIdsForURI(uri, {}, {});
        if (bookmarkIds.length > 0) {
          // Remove duplicate bookmarks
          for (var j=0; j < bookmarkIds.length; j++) {
            // Unfortunately there's no way to generically
            // check for any annotation, so we assume it is ours.
            // We at least check if the destination is the same
            let folderID = bmsvc.getFolderIdForItem(bookmarkIds[j]);
            if (bmsvc.getItemTitle(bookmarkIds[j]) == title &&
                destination == folderID) {
              bmsvc.removeItem(bookmarkIds[j]);
            }
          }
        }
        if (removeDuplicateBookmarkNames) {
          // This is hideous. There's no way to get the number of children
          // in a folder, so we do a loop to get a quick count so we can
          // work backwards.
          let numItems = 0;
          do {
            let bmId = bmsvc.getIdForItemAt(destination, numItems);
            if (bmId == -1) {
              break;
            }
            numItems++;
          } while (numItems < 50) // Failsafe just in case we somehow end up in a loop
          for (var k=numItems; k > 0; k--) {
            let bmId = bmsvc.getIdForItemAt(destination, k-1);
            if (bmId == -1) { // Shouldn't happen
              break;
            }
            if (bmsvc.getItemTitle(bmId) == title) {
              bmsvc.removeItem(bmId);
            }
          }
        }
        var newBookmarkId = bmsvc.insertBookmark(destination, uri, bmsvc.DEFAULT_INDEX, title);
        annos.setItemAnnotation(newBookmarkId, annotation, "true", 0, annos.EXPIRE_NEVER);
      } catch(e) {
        Components.utils.reportError(e);
      }
    }
  }
}

let BOOKMARK_GUID_PREFIX = "CCKB-";
let FOLDER_GUID_PREFIX = "CCKF-";
let SEPARATOR_GUID_PREFIX = "CCKS-";

function generateGuidWithPrefix(prefix) {
  // Generates a random GUID and replace its beginning with the given
  // prefix. We do this instead of just prepending the prefix to keep
  // the correct character length.
  return prefix + PlacesUtils.history.makeGuid().substring(prefix.length);
}

async function addBookmarks(bookmarks, parentGuid, annotation, removeDuplicateBookmarkNames) {
  for (var i =0; i < bookmarks.length; i++) {
    if (bookmarks[i].folder) {
      let guid = generateGuidWithPrefix(FOLDER_GUID_PREFIX);
      await PlacesUtils.bookmarks.insert({
        type: PlacesUtils.bookmarks.TYPE_FOLDER,
        title: fixupUTF8(bookmarks[i].name),
        guid,
        parentGuid
      });
      let newFolderId = await PlacesUtils.promiseItemId(guid);
      annos.setItemAnnotation(newFolderId, annotation, "true", 0, annos.EXPIRE_NEVER);
      addBookmarks(bookmarks[i].folder, guid, annotation, removeDuplicateBookmarkNames);
    } else if (bookmarks[i].type == "separator") {
      let guid = generateGuidWithPrefix(SEPARATOR_GUID_PREFIX);
      await PlacesUtils.bookmarks.insert({
        type: PlacesUtils.bookmarks.TYPE_SEPARATOR,
        guid,
        parentGuid
      });
      let newSeparatorId = await PlacesUtils.promiseItemId(guid);
      annos.setItemAnnotation(newSeparatorId, annotation, "true", 0, annos.EXPIRE_NEVER);
    } else {
      try {
        var title = fixupUTF8(bookmarks[i].name);
        let bookmarksArray = [];
        await PlacesUtils.bookmarks.fetch({url: bookmarks[i].location}, b => bookmarksArray.push(b));
        for (let bookmark of bookmarksArray) {
          // Unfortunately there's no way to generically
          // check for any annotation, so we assume it is ours.
          // We at least check if the destination is the same
          if (bookmark.title == title &&
            bookmark.parentGuid == parentGuid) {
          }
          await PlacesUtils.bookmarks.remove(bookmark);
        }
        if (removeDuplicateBookmarkNames) {
          try {
            await PlacesUtils.bookmarks.fetch({parentGuid}, b => bookmarksArray.push(b));
            for (var k=bookmarksArray.length; k > 0; k--) {
              if (bookmarks[i].title == title) {
                await PlacesUtils.bookmarks.remove(bookmarksArray[i]);
              }
            }
          } catch(e) {
            // Bad index errors in some cases
          }
        }
        let guid = generateGuidWithPrefix(BOOKMARK_GUID_PREFIX);
        await PlacesUtils.bookmarks.insert({
          url: bookmarks[i].location,
          title: fixupUTF8(bookmarks[i].name),
          guid,
          parentGuid
        });
        let newBookmarkId = await PlacesUtils.promiseItemId(guid);
        annos.setItemAnnotation(newBookmarkId, annotation, "true", 0, annos.EXPIRE_NEVER);
      } catch(e) {
        Components.utils.reportError(e);
      }
    }
  }
}

function errorCritical(e) {
  var stack = e.stack;
  if (!stack) {
    stack = Error().stack;
  }
  Components.utils.reportError("CCK2: " + e + "\n\n" + stack);
}

/**
 * If the search service is not available, passing function
 * to search service init
 */
function searchInitRun(func)
{
  if (Services.search.init && !Services.search.isInitialized)
    Services.search.init(func);
  else
    func();
}

/**
 * Remove all extraneous info from a certificates. addCertFromBase64 requires
 * just the cert with no whitespace or anything.
 *
 * @param {String} certificate text
 * @returns {String} certificate text cleaned up
 */
function fixupCert(cert) {
  var beginCert = "-----BEGIN CERTIFICATE-----";
  var endCert = "-----END CERTIFICATE-----";

  cert = cert.replace(/[\r\n]/g, "");
  var begin = cert.indexOf(beginCert);
  var end = cert.indexOf(endCert);
  return cert.substring(begin + beginCert.length, end);
}

/**
 * Download the given URL to the user's download directory
 *
 * @param {String} URL of the file
 * @param {function} Function to call on success - called with nsIFile
 * @param {String} Function to call on failure
 * @param {Object} extraParams passed to callback
 * @returns {nsIFile} Downloaded file
 */
function download(url, successCallback, errorCallback, extraParams) {
  var uri = Services.io.newURI(url, null, null);

  var channel = Services.io.newChannelFromURI(uri);

  var downloader = Cc["@mozilla.org/network/downloader;1"].createInstance(Ci.nsIDownloader);
  var listener = {
    onDownloadComplete: function(downloader, request, ctxt, status, result) {
      if (Components.isSuccessCode(status)) {
        result.QueryInterface(Ci.nsIFile);
        if (result.exists() && result.fileSize > 0) {
          successCallback(result, extraParams);
          return;
        }
      }
      errorCallback(new Error("Download failed (" + status + " for " + url));
    }
  }
  downloader.init(listener, null);
  channel.asyncOpen(downloader, null);
}

/**
 * Used to allow the overriding of certificates
 */
var SSLExceptions = {
  getInterface: function(uuid) {
    return this.QueryInterface(uuid);
  },
  QueryInterface: function(uuid) {
    if (uuid.equals(Ci.nsIBadCertListener2) ||
        uuid.equals(Ci.nsISupports))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  notifyCertProblem: function (socketInfo, status, targetSite) {
    status.QueryInterface(Ci.nsISSLStatus);

    let flags = 0;

    if (status.isUntrusted)
      flags |= override.ERROR_UNTRUSTED;
    if (status.isDomainMismatch)
      flags |= override.ERROR_MISMATCH;
    if (status.isNotValidAtThisTime)
      flags |= override.ERROR_TIME;

    var hostInfo = targetSite.split(":");

    override.rememberValidityOverride(
      hostInfo[0],
      hostInfo[1],
      status.serverCert,
      flags,
      false);
    return true; // Don't show error UI
  }
};

var gAboutXHTML = '' +
'<html xmlns="http://www.w3.org/1999/xhtml">' +
'  <head>' +
'    <title></title>' +
'    <link rel="stylesheet" href="chrome://global/skin/netError.css" type="text/css" media="all" />' +
'    <link rel="icon" type="image/png" id="favicon" href="chrome://global/skin/icons/warning-16.png" />' +
'  </head>' +
'  <body dir="ltr">' +
'    <div id="errorPageContainer">' +
'      <div id="errorTitle">' +
'        <h1 id="errorTitleText">%s</h1>' +
'      </div>' +
'      <div id="errorLongContent">' +
'        <div id="errorShortDesc">' +
'          <p id="errorShortDescText">Access to %s has been disabled by your administrator.</p>' +
'        </div>' +
'      </div>' +
'    </div>' +
'  </body>' +
'  <script>' +
'    document.title = document.location.href;' +
'    document.getElementById("errorTitleText").textContent = document.title;' +
'    document.getElementById("errorShortDescText").textContent = document.getElementById("errorShortDescText").textContent.replace("%s", document.title);' +
'  </script>' +
'</html>' +
'';

/**
 * Register a component that replaces an about page
 *
 * @param {String} The ClassID of the class being registered.
 * @param {String} The name of the class being registered.
 * @param {String} The type of about to be disabled (config/addons/privatebrowsing)
 * @returns {Object} The factory to be used to unregister
 */
function disableAbout(aClass, aClassName, aboutType) {
  var gAbout = {
    newChannel : function (aURI, aLoadInfo) {
      var url = "data:text/html," + gAboutXHTML;
      var channel = Services.io.newChannelFromURIWithLoadInfo(NetUtil.newURI(url), aLoadInfo);
      channel.originalURI = aURI;
      return channel;
    },
    getURIFlags : function getURIFlags(aURI) {
      return Ci.nsIAboutModule.HIDE_FROM_ABOUTABOUT;
    },

    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

    createInstance: function(outer, iid) {
       return this.QueryInterface(iid);
    },
  };

  var registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
  registrar.registerFactory(aClass, aClassName, "@mozilla.org/network/protocol/about;1?what=" + aboutType, gAbout);
  return gAbout;
}

var documentObserver = {
  observe: function observe(subject, topic, data) {
    if (subject instanceof Ci.nsIDOMWindow) {
      var win = subject.QueryInterface(Components.interfaces.nsIDOMWindow);
      if (topic == "chrome-document-global-created" ||
          (topic == "content-document-global-created" && win.document.documentURIObject.scheme == "about")) {
        win.addEventListener("load", function onLoad(event) {
          win.removeEventListener("load", onLoad, false);
          var doc = event.target;
          var configs = CCK2.getConfigs();
          for (var id in configs) {
            var config = configs[id];
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
        }, false);
      }
    }
  }
}

function copyDir(aOriginal, aDestination) {
  var enumerator = aOriginal.directoryEntries;
  while (enumerator.hasMoreElements()) {
    var file = enumerator.getNext().QueryInterface(Components.interfaces.nsIFile);
    if (file.isDirectory()) {
      var subdir = aDestination.clone();
      subdir.append(file.leafName);
      subdir.create(Ci.nsIFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
      copyDir(file, subdir);
    } else {
      file.copyTo(aDestination, null);
    }
  }
}

function loadBundleDirs() {
  var cck2BundleDir = Services.dirsvc.get("GreD", Ci.nsIFile);
  cck2BundleDir.append("cck2");
  cck2BundleDir.append("bundles");
  if (!cck2BundleDir.exists() || !cck2BundleDir.isDirectory()) {
    return;
  }
  var enumerator = cck2BundleDir.directoryEntries;
  while (enumerator.hasMoreElements()) {
    var file = enumerator.getNext().QueryInterface(Ci.nsIFile);
    var dirName = file.leafName;
    file.append("chrome.manifest");
    Components.manager.QueryInterface(Ci.nsIComponentRegistrar).autoRegister(file);    
    file.leafName = "defaults";
    file.append("preferences");
    if (!file.exists() || !file.isDirectory()) {
      continue;
    }
    // In order to load prefs, we have to use a chrome URL.
    // Create a resource that maps to the prefs directory.
    var prefAlias = Services.io.newFileURI(file);
    var resource = Services.io.getProtocolHandler("resource")
                           .QueryInterface(Ci.nsIResProtocolHandler);
    resource.setSubstitution(dirName + "_prefs", prefAlias);
    var prefEnumerator = file.directoryEntries;
    while (prefEnumerator.hasMoreElements()) {
      var prefFile = prefEnumerator.getNext().QueryInterface(Ci.nsIFile);
      gBundlePrefFiles.push("resource://" + dirName + "_prefs/" + prefFile.leafName);
    }
  }
}

Services.obs.addObserver(CCK2, "distribution-customization-complete", false);
Services.obs.addObserver(CCK2, "final-ui-startup", false);
Services.obs.addObserver(CCK2, "browser-ui-startup-complete", false);
Services.obs.addObserver(documentObserver, "chrome-document-global-created", false);  
Services.obs.addObserver(documentObserver, "content-document-global-created", false);  
Services.obs.addObserver(CCK2, "load-extension-defaults", false);
try {
  loadBundleDirs()
} catch (e) {
  Components.utils.reportError(e);
}
