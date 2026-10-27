# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache wget
WORKDIR /app

# Copy all jars from target and rename the main jar to app.jar
COPY --from=build /app/target/*.jar ./
RUN mv $(ls *.jar | grep -v original | head -n 1) app.jar

EXPOSE 8761
ENTRYPOINT ["java", "-jar", "app.jar"]