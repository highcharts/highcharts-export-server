FROM java:8


# INSTALL MAVEN

RUN apt-get update && apt-get install -y maven
#RUN ln -s /usr/share/maven/bin/mvn /usr/bin/maven



# INSTALL THE HIGHCHARTS-EXPORT MODULE IN  LOCAL MAVEN REPOSITORY

COPY ../java /java

# DOWNLOAD HIGHCHARTS JAVASCRIPT.
# FOR LICENSING REASONS, IT'S RECOMMENDED TO USE THE HIGHCHARTS COMPILED FILES FROM code.highcharts.com/[highcharts-version-you-use]/
# AND WHEN YOU USE THEM, YOU ACKNOWLEDGE THAT YOU OWN HIGHCHARTS LICENSE

ENV HIGHCHARTS_VERSION 4.2.5

# RUN wget http://code.highcharts.com/$HIGHCHARTS_VERSION/highcharts.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/highcharts－more.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/modules/data.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/modules/drilldown.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/modules/funnel.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/modules/heatmap.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/modules/treemap.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/highcharts-3d.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/modules/no-data-to-display.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/modules/solid-gauge.js \
# &&  wget http://code.highcharts.com/$HIGHCHARTS_VERSION/modules/broken-axis.js \
# &&  wget http://code.highcharts.com/stock/$HIGHCHARTS_VERSION/highstock.js \
# &&  wget http://code.highcharts.com/maps/$HIGHCHARTS_VERSION/highmaps.js \
# &&  wget http://code.highcharts.com/maps/$HIGHCHARTS_VERSION/modules/treemap.js



# COPY THE HIGHCHARTS FILES MANUALLY TO THE PHANTOMJS LOCATION.

RUN mv *.js /java/highcharts-export/highcharts-export-convert/src/main/resources/phantomjs

# BUILD MAVEN MODULE

RUN cd /java/highcharts-export/   \
	&& mvn install

# BUILDING A HIGHCHARTS-EXPORT-SERVER.WAR FILE

RUN cd /java/highcharts-export/highcharts-export-web/  \
&&  mvn clean package


# Install Tomcat

ENV CATALINA_HOME /usr/local/tomcat
ENV PATH $CATALINA_HOME/bin:$PATH
RUN mkdir -p "$CATALINA_HOME"
WORKDIR $CATALINA_HOME


# see https://www.apache.org/dist/tomcat/tomcat-8/KEYS
RUN gpg --keyserver pool.sks-keyservers.net --recv-keys \
	05AB33110949707C93A279E3D3EFE6B686867BA6 \
	07E48665A34DCAFAE522E5E6266191C37C037D42 \
	47309207D818FFD8DCD3F83F1931D684307A10A5 \
	541FBE7D8F78B25E055DDEE13C370389288584E7 \
	61B832AC2F1C5A90F0F9B00A1C506407564C17A3 \
	79F7026C690BAA50B92CD8B66A3AD3F4F22C4FED \
	9BA44C2621385CB966EBA586F72C284D731FABEE \
	A27677289986DB50844682F8ACB77FC2E86E29AC \
	A9C5DF4D22E99998D9875A5110C01C5A2F6059E7 \
	DCFD35E0BF8CA7344752DE8B6FB21E8933C60243 \
	F3A04C595DB5B6A5F1ECA43E3B7BBB100D811BBE \
	F7DA48BB64BCB84ECBA7EE6935CD23C10D498E23

ENV TOMCAT_MAJOR 8
ENV TOMCAT_VERSION 8.5.3
ENV TOMCAT_TGZ_URL https://www.apache.org/dist/tomcat/tomcat-$TOMCAT_MAJOR/v$TOMCAT_VERSION/bin/apache-tomcat-$TOMCAT_VERSION.tar.gz

# unpack tomcat
RUN set -x \
	&& curl -fSL "$TOMCAT_TGZ_URL" -o tomcat.tar.gz \
	&& curl -fSL "$TOMCAT_TGZ_URL.asc" -o tomcat.tar.gz.asc \
	&& gpg --verify tomcat.tar.gz.asc \
	&& tar -xvf tomcat.tar.gz --strip-components=1 \
	&& rm bin/*.bat \
	&& rm tomcat.tar.gz*

# copy server.xml
COPY server.xml /usr/local/tomcat/conf/

# set permissions to run tomcat as non root user
RUN cd $CATALINA_HOME \
		&& rm -Rf webapps/manager webapps/examples webapps/docs webapps/host-manager webapps/ROOT

# Add phantomjs binary

COPY phantomjs /usr/local/bin/
RUN chmod +x /usr/local/bin/phantomjs

# Add fonts, remember ADD will auto-extract
# FOR LICENSING REASONS,GET FONTS THOSE YOU HAVE AUTHORISATION TO USE AND PLACE HERE

COPY ./fonts/ /
RUN chmod -R 777 /usr/share/fonts

# copy in the web application
RUN cp /java/highcharts-export/highcharts-export-web/target/highcharts-export-web.war /usr/local/tomcat/webapps/ROOT.war

EXPOSE 8080

CMD ["catalina.sh", "run"]
