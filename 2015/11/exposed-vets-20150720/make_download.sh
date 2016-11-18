#!/bin/bash

in2csv --sheet data exposed-vets-20150720.xlsx > data.csv
python clean_download.py
zip -r download.zip download
