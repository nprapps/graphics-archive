module.exports = {
  isMobile: window.matchMedia("(max-width: 500px)"),
  isMedium: window.matchMedia("(max-width: 620px)"),
  isDesktop: window.matchMedia("(min-width: 730px)")
};