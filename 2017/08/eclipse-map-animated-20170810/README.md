# Live/interactive eclipse map

### Important variables

**Eclipse day start time**

The variable that holds all of this together is `dayStartTime`. This is the epoch timestamp for 12:00:00 a.m. GMT on Aug. 21 (the day of the eclipse).

You'll notice the `graphic.js` [includes this code](https://github.com/nprapps/graphics/blob/21e800b1979a673101b97db224f41d6c90062328/eclipse-map-animated-20170810/js/graphic.js#L68):
	
	var dayStartTime = ECLIPSE_DAY_START;
		
Instead of a number, it's referring to a global var in another file. I did this just to be super super safe and not accidentally paste over the actual time. If for some reason you need to access that global var, it's in the [base.js](https://github.com/nprapps/graphics/blob/21e800b1979a673101b97db224f41d6c90062328/eclipse-map-animated-20170810/js/base.js#L22) file.

**Start and end times**

The variable `timeExtent` includes the starting and ending times, in _milliseconds past dayStartTime_, of the eclipse shapes that we want to show. These also should not need to change; they come from NASA's data and refer to the minutes when the eclipse enters and leaves the U.S.


### How to test

You can spoof a live event by changing the `dayStartTime` (as long as you absolutely, definitely, 100% never push fake values to production!) Here's how you can figure that out:

1. Visit [epochconverter.com](https://www.epochconverter.com/) and use the "Human date to timestamp" tool to get the current (or your desired) epoch time. **Note: You MUST set the seconds to 0 for this to work!**
2. Take the start or end time from `timeExtent` and divide it by 1000 to get the start/end time in seconds.
3. Subtract that value from your epoch timestamp.
4. Set `dayStartTime` to equal this test value.


### Different modes

The graphic uses one codebase to display different modes of the graphic. The modes:

- `liveblog` - lives on the live blog. Live updating, includes interactivity.
- `story` - lives on a story page. Same functionality as `liveblog` mode.
- `homepage` - lives on the homepage. Live updating, includes interactivity.

You can test these modes locally by editing the [custom parent.html file](https://github.com/nprapps/graphics/blob/21e800b1979a673101b97db224f41d6c90062328/eclipse-map-animated-20170810/parent.html#L189) and changing the pym `data-child-src` to include this URL parameter: `?env=YOUR_CHOSEN_MODE`

In the weird case that something strange happens that makes you want to turn off all interactivity, you can edit [this line](https://github.com/nprapps/graphics/blob/master/eclipse-map-animated-20170810/js/graphic.js#L551) in `graphic.js` to include all three modes or just remove the code nested in that if statement entirely.


### Updating things

Just like with all our graphics, pushing to production should just update this. The liveblog might take a minute to reflect changes, but it should automatically pull new changes.


### Other info

- [Launch doc for eclipse coverage](https://docs.google.com/document/d/1Yr9kdm1ziwG_VriyygNvQxWKYn_vHz8wHNHimMe76vo/edit)
- [Seamus page for standalone map](http://www.npr.org/templates/story/story.php?storyId=544244965&live=1)
- [Google drive with graphic promo assets](https://drive.google.com/drive/folders/0B0NS0lEYILl4eko2all2dTF1NVk)
