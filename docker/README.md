
# **The Highcharts Export server docker image**

We provide our clients with docker image for export server, with the ability to set up their own server simply and fast.

## **What is Docker**

Docker is the world's leading software containerization platform. Docker containers wrap a piece of software in a complete filesystem that contains everything needed to run: code, runtime, system tools, system libraries – anything that can be installed on a server. This guarantees that the software will always run the same, regardless of its environment.

### **Installation**

You need to instal docker engine in your local machine or your server first.  For installation details, can be seen from here.

[https://docs.docker.com/engine/installation/](https://docs.docker.com/engine/installation/)

## **Building from source**

To build from source you need to clone the git repo and run docker build:

```
  git clone https://github.com/highcharts/highcharts-export-server.git
  docker build -t highcharts-export-server:<TAG> .
```

Please make sure that uncomment those lines regarding downloading highcharts.js before you run "docker build". Otherwise, docker image won't work. 


## **Running**

To simply run the container:

```
 docker run -p 8080:8080 --rm -it highcharts-export-server:<TAG>
```
You can then browse to http://<DOCKER_HOST>:8080 to view the live export-server. To find your DOCKER_HOST use the docker inspect to get the IP address.

## **Custiomize export-server**

### Choose Highcharts JS version

Within Dockerfile, you can declare the specific version of highcharts you gonna use and specific js modules as well.  
For licensing reasons, it's recommended to use the highcharts compiled files from code.highcharts.com/[highcharts-version-you-use]/
and when you use them, you acknowledge that you own highcharts license.

In Dockerfile,  find these lines and config the specific modules you gonna include docker container or not.
```
ENV HIGHCHARTS_VERSION 4.2.5

RUN wget http://code.highcharts.com/$HIGHCHARTS_VERSION/highcharts.js \
&&  wget http://code.highcharts.com/stock/$HIGHCHARTS_VERSION/highstock.js \
&&  wget http://code.highcharts.com/maps/$HIGHCHARTS_VERSION/highmaps.js
```



### Add Fonts

You can find more fonts online and place them in this location /fonts/usr/share/fonts  
Note that you have to be responsible of authorization of using some fonts

### Build your own docker image to Dockerhub

Build docker image
```
        $ docker build -t <DOCKER_HUB>/highcharts-export-prod:424 .
```

Run it
```
        $ docker run -p 8080:8080 --rm -it  <DOCKER_HUB>/highcharts-export-prod:424
```
