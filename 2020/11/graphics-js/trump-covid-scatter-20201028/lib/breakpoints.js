module.exports = {
  isMobile: window.matchMedia("(max-width: 500px)"),
  isDesktop: window.matchMedia("(min-width: 501px)"),
  isLarge: window.matchMedia("(min-width: 900px)")
};