# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Download dependencies first (leverages Docker cache)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy code and build
COPY src ./src
RUN mvn clean package -DskipTests -B && rm -f target/*.original

# Stage 2: Minimal Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8765
ENTRYPOINT ["java", "-jar", "app.jar"]