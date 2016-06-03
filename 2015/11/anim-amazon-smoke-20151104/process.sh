#!/bin/bash

montage -border 0 -geometry 1000x -tile 4x -quality 80% assets/frames/*.jpg assets/burning-1000.jpg
montage -border 0 -geometry 600x -tile 4x -quality 70% assets/frames/*.jpg assets/burning-600.jpg
montage -border 0 -geometry 375x -tile 4x -quality 60% assets/frames/*.jpg assets/burning-375.jpg
