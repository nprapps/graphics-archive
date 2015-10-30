#!/bin/bash

date
source /etc/environment
cd `dirname "$0"`
python sp2.py
s3cmd put --add-header="Cache-Control:max-age=300" --acl-public current.csv price.json s3://apps.npr.org/dailygraphics/graphics/pm-short/
s3cmd put --add-header="Cache-Control:max-age=300" --acl-public current.csv price.json s3://stage-apps.npr.org/dailygraphics/graphics/pm-short/
