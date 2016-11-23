#!/bin/bash
max=12
for i in `seq 1 $max`
do
    curl -H "Content-Type: application/json" -X POST -d @edgeCases/$i.json 127.0.0.1:3003
done
