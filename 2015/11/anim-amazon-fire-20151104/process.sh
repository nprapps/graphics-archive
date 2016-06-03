#!/bin/bash

montage -border 0 -geometry 1000x -tile 6x -quality 80% assets/frames/*.jpg assets/flames-1000.jpg
montage -border 0 -geometry 600x -tile 6x -quality 70% assets/frames/*.jpg assets/flames-600.jpg
montage -border 0 -geometry 375x -tile 6x -quality 60% assets/frames/*.jpg assets/flames-375.jpg
