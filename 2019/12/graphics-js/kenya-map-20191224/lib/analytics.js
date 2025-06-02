/*
 * Module for tracking standardized analytics.
 */

var { getParameterByName, urlToLocation } = require("./helpers");
var DataConsent = require("./dataConsent");

var ANALYTICS = (function () {
  var googleAnalyticsAlreadyInitialized = false;

  /*
   * Google Analytics
   */
  var DIMENSION_PARENT_URL = "dimension1";
  var DIMENSION_PARENT_HOSTNAME = "dimension2";
  var DIMENSION_PARENT_INITIAL_WIDTH = "dimension3";

  var setupGoogle = function () {
    var gtagID = window.GOOGLE_ANALYTICS_ID;

    // Bail early if opted out of Performance and Analytics consent groups
    if (!DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS))
      return;

    var script = document.createElement("script");

    script.src = "https://www.googletagmanager.com/gtag/js?id=" + gtagID;

    script.async = true;

    var script_embed = document.createElement("script");

    script_embed.innerHTML =
      "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '" +
      gtagID +
      "', { 'send_page_view': false });";
    document.head.append(script, script_embed);

    // By default Google tracks the query string, but we want to ignore it.
    var here = new URL(window.location);

    // Custom dimensions & metrics
    var parentUrl = here.searchParams.has("parentUrl")
      ? new URL(here.searchParams.get("parentUrl"))
      : "";
    var parentHostname = "";

    if (parentUrl) {
      parentHostname = parentUrl.hostname;
    }

    var initialWidth = here.searchParams.get("initialWidth") || "";

    var customData = {};
    customData["dimension1"] = parentUrl;
    customData["dimension2"] = parentHostname;
    customData["dimension3"] = initialWidth;

    // Track pageview
    gtag("event", "page_view", customData);
    googleAnalyticsAlreadyInitialized = true;
  };

  /*
   * Event tracking.
   */
  var trackEvent = function (eventName, label, value) {
    // Bail early if opted out of Performance and Analytics consent groups
    if (!DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS))
      return;

    var eventData = {
      eventCategory: document.title,
      eventAction: eventName,
    };

    if (label) {
      eventData["eventLabel"] = label;
    }

    if (value) {
      eventData["eventValue"] = value;
    }

    // Track details about the parent with each event
    var parentUrl = getParameterByName("parentUrl") || "";
    var parentHostname = "";
    if (parentUrl) {
      parentHostname = urlToLocation(parentUrl).hostname;
    }
    eventData[DIMENSION_PARENT_URL] = parentUrl;
    eventData[DIMENSION_PARENT_HOSTNAME] = parentHostname;

    gtag("event", "dailygraphics", eventData);
  };

  setupGoogle();

  // Listen for DataConsentChanged event
  document.addEventListener("npr:DataConsentChanged", () => {
    // Bail early if GA's already been set up
    if (googleAnalyticsAlreadyInitialized) return;

    // When a user opts into performance and analytics cookies, initialize GA
    if (DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS)) {
      setupGoogle();
    }
  });

  // listen for Data Consent overlay being closed on NPR.org
  window.addEventListener("message", event => {
    console.log(event);
    const origin = /.*npr\.org.*/g;
    if (event.data == "Data consent updated" && origin.test(event.origin)) {
      OneTrust.Close();
      setupGoogle();
    }
  });

  return {
    trackEvent: trackEvent,
  };
})();

module.exports = ANALYTICS;
