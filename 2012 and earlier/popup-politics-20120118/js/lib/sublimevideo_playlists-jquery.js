/** http://docs.sublimevideo.net/playlists **/
/** jQuery version **/

var SublimeVideo = SublimeVideo || {};

$(document).ready(function() {
  // Automatically instantiate all the playlists in the page
  $('.interactive').each(function() { SublimeVideo[$(this).attr('id')] = new InteractiveThumbnailsHandler($(this).attr('id')); });
});

var InteractiveThumbnailsHandler = function(interactiveWrapperId){
  this.interactiveWrapperId = interactiveWrapperId;

//  this.videosCount = $("#" + this.interactiveWrapperId + " .video_wrap").size();
  this.videosCount = $("#" + this.interactiveWrapperId + " .video_wrap").length;

  var matches = $("#" + this.interactiveWrapperId + " video").attr("id").match(/^video(\d+)$/);
  this.firstVideoIndex = parseInt(matches[1], 10);

  this.setupObservers();

  this.loadDemo();
};

$.extend(InteractiveThumbnailsHandler.prototype, {
  setupObservers: function() {
    var that = this;

    $("#"+ this.interactiveWrapperId + " li").each(function() {
      $(this).click(function(event) {
        event.preventDefault();

        if (!$(this).hasClass("active")) {
          that.clickOnThumbnail($(this).attr("id"));
        }
      });
    });
  },
  loadDemo: function() {
    // Only if not the first time here
    if (this.activeVideoId) this.reset();

    this.activeVideoId = "video" + this.firstVideoIndex;

    // Show first video
    this.showActiveVideo();
  },
  reset: function() {
    // Hide the current active video
    $("#" + this.interactiveWrapperId + " .video_wrap.active").removeClass("active");

    // Get current active video and unprepare it
    // we could have called sublimevideo.unprepare() without any arguments, but this is faster
    sublimevideo.unprepare(this.activeVideoId);

    // Deselect its thumbnail
    this.deselectThumbnail(this.activeVideoId);
  },
  clickOnThumbnail: function(thumbnailId) {
    // Basically undo all the stuff and bring it back to the point before js kicked in
    this.reset();

    // Set the new active video
    this.activeVideoId = thumbnailId.replace(/^thumbnail_/, "");

    // And show the video
    this.showActiveVideo();

    // And finally, prepare and play it
    sublimevideo.prepareAndPlay(this.activeVideoId);
  },
  selectThumbnail: function(videoId) {
    $("#thumbnail_" + videoId).addClass("active");
  },
  deselectThumbnail: function(videoId) {
    $("#thumbnail_" + videoId).removeClass("active");
  },
  showActiveVideo: function() {
    // Select its thumbnail
    this.selectThumbnail(this.activeVideoId);

    // Show it
    $("#" + this.activeVideoId).parent().addClass("active");
  },
  handleAutoNext: function(endedVideoId) {
    var nextId = parseInt(endedVideoId.replace(/^video/, ""), 10) + 1;
    if (nextId > 1 && nextId < this.firstVideoIndex + this.videosCount) {
      this.clickOnThumbnail("thumbnail_video" + nextId);
    }
  }
});

sublimevideo.ready(function() {
  sublimevideo.onEnd(function(sv) {
    var matches = sv.element.id.match(/^video(\d+)$/);
    if (matches != undefined) {
      var playlistId = $(sv.element).parents('.interactive').attr("id");
      if (parseInt(matches[1], 10) <= SublimeVideo[playlistId].firstVideoIndex + SublimeVideo[playlistId].videosCount) {
        SublimeVideo[playlistId].handleAutoNext(sv.element.id);
      }
    }
  });
});
