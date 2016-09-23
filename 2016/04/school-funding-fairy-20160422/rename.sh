#!/bin/bash

# Rename stupid photoshop export names
# assets/orig/houses_0059_Frame 4.jpg
for i in assets/orig/*.jpg ; do
    PATH_ROOT="${i/_[0-9]*/}"
    if (( ${#i} == 35 )) ; then
        NUM_IDX=`expr ${#i} - 6`
        FILE_END=${i:$NUM_IDX}
    elif (( ${#i} == 34 )) ; then
        NUM_IDX=`expr ${#i} - 5`
        FILE_END="0"${i:$NUM_IDX}
    fi
    mv "$i" "$PATH_ROOT-$FILE_END"
done
