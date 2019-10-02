module.exports = {
  isSidebar: window.matchMedia("(max-width: 300px)"),
  isMobile: window.matchMedia("(max-width: 500px)"),
  isDesktop: window.matchMedia("(min-width: 501px)")
};