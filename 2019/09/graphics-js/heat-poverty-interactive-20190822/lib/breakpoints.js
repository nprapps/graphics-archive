module.exports = {
  isMobile: window.matchMedia("(max-width: 500px)"),
  isTablet: window.matchMedia("(max-width: 750px) && (min-width: 750px)"),
  isDesktop: window.matchMedia("(min-width: 501px)")
};