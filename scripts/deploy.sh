#!/bin/bash

echo $DEPLOY_DIR

rsync -r --delete-after --quiet $TRAVIS_BUILD_DIR $SSH_PATH:$DEPLOY_DIR

ssh $SSH_PATH << 'ENDSSH'
deploy-adept.sh
ENDSSH