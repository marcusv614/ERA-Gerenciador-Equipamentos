FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp clean package

FROM eclipse-temurin:21-jre-jammy
RUN groupadd --system era && useradd --system --gid era --no-create-home era
WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar
ENV TZ=America/Manaus
ENV JAVA_TOOL_OPTIONS="-Duser.timezone=America/Manaus"
USER era
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
