#!/bin/bash
max=10
for i in `seq 2 $max`
do
    curl -H "Content-Type: application/json" -X POST -d @edgeCases/11.json 127.0.0.1:3003
done
