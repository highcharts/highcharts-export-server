How to Build, Test and Deploy export server 

1. Push changes from highcharts.com repository to export.highcharts.com repository
    a. Add routine here
2. Build package export server 
    a. []
2. Copy packaged webapplication to Docker folder
    $ cp highcharts-export-web/target/highcharts-export-web.war ~/docker/highcharts-export-prod/export-highcharts-com.war
3. [Optional] Build docker image and test export server in Docker
    a. Start Virtual machine (MAC os x)
        $ docker-machine start default
    b. Hook up the terminal with docker 
        $ docker-machine env default
        $ eval "$(docker-machine env default)"
    c. Build docker image 
        $ docker build -t gvaartjes/highcharts-export-prod:4.1.10.v3 .
    d.  Run it
        $ docker run -p 8080:8080 --rm -it gvaartjes/highcharts-export-prod:424

4. Goto docker folder for export server and zip the files
    $ zip export.highcharts.com.290920151519.zip Dockerfile export-highcharts-com.war fonts-exp-server-28052015.tar.gz phantomjs Dockerrun.aws.json

    Deploy manually in webconsole on AWS
        a. New environment -> create web server
        b. selct a platform -> Docker, environment type single instance
        c. Application Version -> upload zip file export.highcharts.com.290920151519.zip
        d. Environment information -> environment name = use pattern -> export-server-[date][time]
        e. Additional Resources -> Skip
        f. Configuration Details -> c1.medium, hsoftawskey.pem, instanceprofile: elasticbeanstalk, email adress: your-email 
        g. Environment Tags -> skip
        h. Permissions -> Skip
5. ** Or **  Deploy with eb commandoline tools
    a. docker login
    b. docker push gvaartjes/highcharts-export-prod:4.2.4
 
    c. ONLY FOR FIRST TIME, if you don't have a git  repo here to push 
        I. git init repo
        II. git add . (all files)
        III. eb init
    d. change the docker-image name to the latest on docker hub, if it has changed.
    c. eb deploy
    
FINISJED!!
    


    
