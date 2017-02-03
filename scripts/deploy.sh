#!/bin/bash

echo $1

rsync -r --delete-after --quiet $TRAVIS_BUILD_DIR $1:$2

#ssh $1 << 'ENDSSH'
#deploy-adept.sh
#ENDSSH