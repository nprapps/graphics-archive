#!/bin/bash

COUNT=`ls -l assets/frames/*.jpg | wc -l`

montage -border 0 -geometry 1000x -tile $COUNT'x' -quality 80% assets/frames/*.jpg assets/filmstrip-1000.jpg
montage -border 0 -geometry 600x -tile $COUNT'x' -quality 70% assets/frames/*.jpg assets/filmstrip-600.jpg
montage -border 0 -geometry 375x -tile $COUNT'x' -quality 60% assets/frames/*.jpg assets/filmstrip-375.jpg
