FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
COPY src src
RUN ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S spring \
    && adduser -S spring -G spring
WORKDIR /app
COPY --from=build --chown=spring:spring /workspace/target/electromarket-0.0.1-SNAPSHOT.jar /app/app.jar
COPY --chown=spring:spring healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh
USER spring

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD ["/app/healthcheck.sh"]
ENTRYPOINT ["sh", "-c", "exec java -XX:MaxRAMPercentage=75 -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
