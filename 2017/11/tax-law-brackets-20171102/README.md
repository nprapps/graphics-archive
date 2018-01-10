tax-law-brackets-20171102
=========================

This graphic uses a modified version of the dailygraphics stacked column chart template.

Because, on deadline, correctly placing the annotation labels became too challenging, I took a more "expedient" approach:

- The column charts themselves were generated in code based on parameters set in the spreadsheet.

- Then I used [SVG Crowbar 2](https://nytimes.github.io/svg-crowbar/) to extract the column charts as separate SVGs.

- I opened the SVGs in Illustrator and made my annotations there. Then I exported the resulting charts as PNGs.

### How to update these charts

1. Run `fab assets.sync:tax-law-brackets-20171102` to get the Illustrator files for this project out of the assets rig. There are separate files for the married and single charts in the `assets/private/` folder.

2. Switch to the code-generated version of the chart, uncommenting the commented-out bits in `graphic.js` in the `onWindowLoaded` function.

3. Open the graphic spreadsheet and update the `bracket-$x-label` and `bracket_$x_rate` columns as needed. You shouldn't need to touch the `bracket_$x` columns (with the gray background) unless brackets are added or removed from one of the proposals.

4. Use SVG Crowbar 2 to extract SVGs of each chart.

5. Open the Illustrator files, sub in the new bar charts, and update the annotations as needed. Make sure to carry over some of the text appearance settings (such as the bolding and faint shadow on the bracket percentages). Select all the objects on the canvas and use the `Object > Make Pixel Perfect` feature to try to align everything to the pixel grid. Export the finished images as a PNGs at 200%, saving over the existing files in the `assets/` folder.

6. Go back into `graphic.js` and re-comment-out the sections that were commented out before, so that the code behaves as if this is a static graphic, not a code-based graphic (and doesn't run `formatData()` or set up `pymChild` with a `render()` callback).

7. The `assets.sync` function should run when you redeploy the graphic, but for peace of mind, manually run `fab assets.sync:tax-law-brackets-20171102` and upload the image and Illustrator files you updated.
