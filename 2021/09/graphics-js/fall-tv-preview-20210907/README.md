fall-tv-preview-20210907
========================

This project shows capsule reviews of fall television shows and streamable movies. Users are able to filter based on genre and network.

Resizing images
---------------

The original images live in [this Google Drive folder](https://drive.google.com/drive/u/1/folders/1f3YGWB4Vyo1Sim6nxHrblMMAcRfveXnM). Use this script to resize them:

```
for f in *.jpg; do convert $f -quality 75 -resize 800x800\> -strip -sampling-factor 4:2:0 -define jpeg:dct-method=float -interlace Plane resized/$f; done
```

Images are stored in the `synced` folder. Run this command to sync them to your local machine:

```
node cli sync fall-tv-preview-20210907
```

Deep linking
------------

You can add a `genre` or `network` parameter to the parent URL to preset one or both filters.

Genres:

* Action: https://www.npr.org/1035011524?genre=action
* Animation: https://www.npr.org/1035011524?genre=animation
* Biography and Documentary: https://www.npr.org/1035011524?genre=biography-and-documentary
* Comedy: https://www.npr.org/1035011524?genre=comedy
* Crime: https://www.npr.org/1035011524?genre=crime
* Drama: https://www.npr.org/1035011524?genre=drama
* History: https://www.npr.org/1035011524?genre=history
* Kid-Friendly: https://www.npr.org/1035011524?genre=kid-friendly
* Music and Musicals: https://www.npr.org/1035011524?genre=music-and-musicals
* Science Fiction: https://www.npr.org/1035011524?genre=science-fiction
* Sports: https://www.npr.org/1035011524?genre=sports
* Western: https://www.npr.org/1035011524?genre=western

Network:
* ABC: https://www.npr.org/1035011524?network=abc
* Amazon Prime: https://www.npr.org/1035011524?network=amazon-prime
* Apple TV+: https://www.npr.org/1035011524?network=apple-tv
* Disney+: https://www.npr.org/1035011524?network=disney
* FX: https://www.npr.org/1035011524?network=fx
* HBO Max: https://www.npr.org/1035011524?network=hbo-max
* Hulu: https://www.npr.org/1035011524?network=hulu
* NBC: https://www.npr.org/1035011524?network=nbc
* Netflix: https://www.npr.org/1035011524?network=netflix
* PBS: https://www.npr.org/1035011524?network=pbs
* Showtime: https://www.npr.org/1035011524?network=showtime
