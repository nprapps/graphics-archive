best-tv-movies-20211220
========================

This project shows capsule reviews of NPR critics' favorite television shows and movies from 2021. Users are able to filter based on genre and network.

Resizing images
---------------

The original images live in [this Google Drive folder](https://drive.google.com/drive/u/1/folders/1f3YGWB4Vyo1Sim6nxHrblMMAcRfveXnM). Use this script to resize them:

```
for f in *.jpg; do convert $f -quality 75 -resize 800x800\> -strip -sampling-factor 4:2:0 -define jpeg:dct-method=float -interlace Plane resized/$f; done
```

Images are stored in the `synced` folder. Run this command to sync them to your local machine:

```
node cli sync best-tv-movies-20211220
```

Deep linking
------------

You can add a `genre` or `network` parameter to the parent URL to preset one or both filters.

Genres:

* Action: https://www.npr.org/1065119898?genre=action
* Animation: https://www.npr.org/1065119898?genre=animation
* Comedy: https://www.npr.org/1065119898?genre=comedy
* Crime: https://www.npr.org/1065119898?genre=crime
* Documentary: https://www.npr.org/1065119898?genre=documentary
* Drama: https://www.npr.org/1065119898?genre=drama
* Fantasy: https://www.npr.org/1065119898?genre=fantasy
* International: https://www.npr.org/1065119898?genre=international
* LGBTQ+: https://www.npr.org/1065119898?genre=lgbtq
* Music and Musicals: https://www.npr.org/1065119898?genre=music-and-musicals
* Period piece: https://www.npr.org/1065119898?genre=period-piece
* Theater adaptation: https://www.npr.org/1065119898?genre=theater-adaptation
* Western: https://www.npr.org/1065119898?genre=western

Where:

* Apple TV+: https://www.npr.org/1065119898?network=apple-tv
* Disney+: https://www.npr.org/1065119898?network=disney
* FX: https://www.npr.org/1065119898?network=fx
* HBO Max: https://www.npr.org/1065119898?network=hbo-max
* Hulu: https://www.npr.org/1065119898?network=hulu
* In theaters: https://www.npr.org/1065119898?network=in-theaters
* Netflix: https://www.npr.org/1065119898?network=netflix
* Prime Video: https://www.npr.org/1065119898?network=prime-video
* Showtime: https://www.npr.org/1065119898?network=showtime
