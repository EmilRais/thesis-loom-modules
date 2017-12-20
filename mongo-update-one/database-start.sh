#!/bin/bash

docker run --name mongo-update-database -d -p 27017:27017 mongo --smallfiles

while ! docker exec -it mongo-update-database mongo --eval "db.version()" > /dev/null 2>&1;
do sleep 0.1;
done
