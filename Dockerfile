FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy the entire project
COPY backend backend
COPY frontend frontend

# Build the backend (which also builds the frontend via frontend-maven-plugin)
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/backend/target/pos-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
