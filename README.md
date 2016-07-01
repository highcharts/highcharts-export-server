
# **The Highcharts Export server docker image**

We provide our clients with docker image for export server, with the ability to set up their own server simply and fast.

## **What is Docker**

Docker is the world's leading software containerization platform. Docker containers wrap a piece of software in a complete filesystem that contains everything needed to run: code, runtime, system tools, system libraries – anything that can be installed on a server. This guarantees that the software will always run the same, regardless of its environment.

## **Installation **

You need to instal docker engine in your local machine or your server first.  For installation details, can be seen from here.

[https://docs.docker.com/engine/installation/](https://docs.docker.com/engine/installation/)

## **Building from source**

To build from source you need to clone the git repo and run docker build:

```
  git clone https://github.com/highcharts/highcharts-export-server.git
  docker build -t highcharts-export-server:<TAG> .
```

## **Pulling from Docker Hub**

Pull the image from docker hub rather than downloading the git repo. This prevents you having to build the image on every docker host:

```
  docker pull highcharts/highcharts-export-server:<TAG>
```

## **Running**

To simply run the container:

```
 docker run -p 8080:8080 --rm -it highcharts/highcharts-export-server:<TAG>
```
You can then browse to http://<DOCKER_HOST>:8080 to view the live export-server. To find your DOCKER_HOST use the docker inspect to get the IP address.

## **Using a custom highcharts-export-web.war file**


1. Build package export server by following the official tutorial here

[http://www.highcharts.com/docs/export-module/setting-up-the-server](http://www.highcharts.com/docs/export-module/setting-up-the-server)

2. Copy packaged web application to Docker folder
```
    $ cp highcharts-export-web/target/highcharts-export-web.war ~/docker/highcharts-export-prod/export-highcharts-com.war
```
3. Edit the Dockerfile and rename the war file to correspond with the new name


4. Build docker image and test export server in Docker

```
         Build docker image
        $ docker build -t <DOCKER_HUB>/highcharts-export-prod:424 .
         Run it
        $ docker run -p 8080:8080 --rm -it  <DOCKER_HUB>/highcharts-export-prod:424
```

## **Using a custom highcharts-export-web.war file**
