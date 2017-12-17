#!/bin/bash

docker run --name mongo-lookup-one-database -d -p 27017:27017 mongo

while ! docker exec -it mongo-lookup-one-database mongo --eval "db.version()" > /dev/null 2>&1;
do sleep 0.1;
done
