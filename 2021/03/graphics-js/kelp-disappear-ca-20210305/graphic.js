var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { classify } = require("./lib/helpers");

var imageIndex = 1;
var bannerImage;

var imgToId = {'wide_2008':'g-ai0-0',
               'small_2008':'g-ai1-0',
               'wide_2019':'g-ai2-0',
               'small_2019':'g-ai3-0'}



var picPathsWide = ['img/_ai2html-map-wide_2008.jpg','img/_ai2html-map-wide_2019.jpg'];
var picPathsSmall = ['img/_ai2html-map-small_2008.jpg','img/_ai2html-map-small_2019.jpg'];
var textPaths = [window.LABELS.label_2008,window.LABELS.label_2019]

function startInterval() {
 setInterval(displayNextImage, 2700);
}

function displayNextImage() {
  if (isMobile.matches){
    bannerImage_small.src = picPathsSmall[imageIndex];

    if (imageIndex == 0){
      textSmall.innerHTML = `<p class="g-aiPstyle0">${textPaths[imageIndex]}</p>`
      imageIndex++;
    }

    else {
      textSmall.innerHTML = `<p style="color:black !important; font-style:normal" class="g-aiPstyle0">${textPaths[imageIndex]}</p>`
      imageIndex = 0;
    } 
  }

  else {
    bannerImage_wide.src = picPathsWide[imageIndex];

    if (imageIndex == 0){
      textWide.innerHTML = `<p class="g-aiPstyle0">${textPaths[imageIndex]}</p>`
      imageIndex++;
    }

    else {
      textWide.innerHTML = `<p style="color:black !important; font-style:normal" class="g-aiPstyle0">${textPaths[imageIndex]}</p>`
      imageIndex = 0;
    } 
  }

}

var onWindowLoaded = function() {
  pym.then(child => {
      child.sendHeight();

      bannerImage_small = document.getElementById(imgToId['small_2008'])
      bannerImage_wide = document.getElementById(imgToId['wide_2008'])
      //bannerImage_wide_2019 = document.getElementById(imgToId['wide_2019'])
      //bannerImage_small_2019 = document.getElementById(imgToId['small_2019'])

      //bannerImage = document.getElementById('g-ai0-0');
      textWide = document.getElementById('g-ai0-1')
      textSmall = document.getElementById('g-ai1-1')
      startInterval();

      window.addEventListener("resize", () => child.sendHeight());
  });
}



// wait for images to load
window.onload = onWindowLoaded;


