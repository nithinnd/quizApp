# Quiz App: Microservices on Docker and Kubernetes

A quiz platform built as Spring Boot microservices behind an API gateway, with a React (Vite) frontend and PostgreSQL. The project focuses on the DevOps side: containerizing every service, orchestrating the stack with Docker Compose and Kubernetes (Minikube), and building it automatically with GitHub Actions.

## Architecture

```
                         ┌────────────────────┐
   Browser ───────────►  │  React (nginx) :80 │
                         └─────────┬──────────┘
                                   │ REST
                         ┌─────────▼──────────┐
                         │ API Gateway :8765  │
                         └─────────┬──────────┘
              discovers services via │
                         ┌─────────▼──────────┐
                         │ Eureka Registry    │
                         │       :8761        │
                         └─────────┬──────────┘
        ┌──────────────────┬───────┴───────────┐
┌───────▼───────┐ ┌────────▼────────┐ ┌────────▼────────┐
│ auth-service  │ │ question-service│ │  quiz-service   │
│     :8082     │ │      :8080      │ │      :8081      │
└───────┬───────┘ └────────┬────────┘ └────────┬────────┘
        └──────────────────┼───────────────────┘
                   ┌───────▼────────┐
                   │ PostgreSQL     │
                   │     :5432      │
                   └────────────────┘
```

| Service | Port | Role |
|---|---|---|
| `service-registory` | 8761 | Eureka service registry |
| `Api-Gateway` | 8765 | Single entry point; routes to services via Eureka |
| `auth-Service` | 8082 | Registration and login |
| `question-service` | 8080 | Question bank by difficulty |
| `quiz-service` | 8081 | Quiz creation, submission, history, scheduled quizzes |
| `quiz-frontend` | 80 | React (Vite) UI served by nginx |
| `postgres` | 5432 | Shared database |

## Features

- User registration and login, with `ROLE_USER` and `ROLE_ADMIN` roles
- Question bank organized by difficulty (Easy / Medium / Hard), with add and delete
- Create and take quizzes, submit answers, and view quiz history
- Scheduled quizzes that users can see and take when available

## Tech stack

Java 17 / 21, Spring Boot, Spring Cloud (Eureka, Gateway), PostgreSQL, React + Vite, Docker (multi-stage builds), Docker Compose, Kubernetes (Minikube), GitHub Actions.

## Run with Docker Compose

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Gateway: http://localhost:8765
- Eureka dashboard: http://localhost:8761

On a fresh volume, `db-init/00-schema.sql` creates the tables and `db-init/seed.sql` loads sample questions, quizzes, and users. These scripts only run on an empty volume; to re-seed, run `docker-compose down -v` first.

**Demo accounts** (seeded, placeholder credentials for local use only):

| Username | Password | Role |
|---|---|---|
| `testuser` | `password123` | `ROLE_USER` |
| `admin` | `password123` | `ROLE_ADMIN` |

## Run on Kubernetes (Minikube)

```bash
minikube start --cpus=4 --memory=6144
eval $(minikube docker-env)          # PowerShell: minikube docker-env | Invoke-Expression
```

Build the images into Minikube's Docker daemon (the manifests use `imagePullPolicy: Never`):

```bash
docker build -t quizapp/service-registory:latest ./service-registory
docker build -t quizapp/auth-service:latest ./auth-Service
docker build -t quizapp/question-service:latest ./question-service
docker build -t quizapp/quiz-service:latest ./quiz-service
docker build -t quizapp/api-gateway:latest ./Api-Gateway
docker build -t quizapp/frontend:latest ./quiz-frontend
```

Deploy in stages, since starting every JVM at once starves a small node of CPU:

```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/service-registory.yaml     # wait until 1/1
kubectl apply -f k8s/auth-service.yaml -f k8s/question-service.yaml -f k8s/quiz-service.yaml
kubectl apply -f k8s/api-gateway.yaml -f k8s/frontend.yaml
```

Seed the database (the tables are created by Hibernate on first connect):

```bash
cat db-init/seed.sql | kubectl exec -i deploy/postgres -- psql -U quizuser -d quizdb -1 -v ON_ERROR_STOP=1 -f -
```

Open the app with port-forwards (two terminals):

```bash
kubectl port-forward svc/api-gateway 8765:8765
kubectl port-forward svc/frontend 3000:80
```

Then visit http://localhost:3000. The frontend image bakes in `VITE_API_URL=http://localhost:8765`, which is why the gateway is forwarded to that port.

## CI

A GitHub Actions workflow (`.github/workflows/ci.yml`) builds all six service images in parallel on every push and pull request, confirming each Dockerfile builds on a clean Linux runner.

## Notes from building it

**Slow JVM startup caused Kubernetes crash loops.** Pods restarted repeatedly with exit code 137. Pod events showed liveness probes failing with `connection refused`, and the container lifespan (about 100 seconds) matched the probe timing: a 40 second delay, three failed checks at 10 second intervals, then the 30 second termination grace period. The apps were still booting when the kubelet killed them. Adding a `startupProbe` (up to 300 seconds to start) before liveness checks begin fixed it. A related slip: the gateway's probes were still pointing at Eureka's port 8761, which showed up as `connection refused` against the wrong port in the pod events.

**Seed scripts ran before the tables existed.** Postgres runs `docker-entrypoint-initdb.d` scripts at first start, but Hibernate creates tables later, when services connect. The seed failed with `relation "users" does not exist`. Fixed by adding `00-schema.sql`, which creates the tables first (init scripts run in alphabetical order).

**Hardcoded config broke containers.** `localhost` datasource and Eureka URLs don't resolve between containers. Config now uses `${ENV_VAR:default}` placeholders so Compose and Kubernetes inject the right values while local runs still work.

**Docker build copied the wrong jar.** Spring Boot leaves a `.jar.original` next to the executable jar, so a `*.jar` wildcard could copy the wrong file. The build stage now removes the `.original` file.

**A nested `.git` folder hid a whole service from the repo.** Git stored `quiz-service` as an empty submodule pointer, so CI had no Dockerfile to build. Removing the nested `.git` and re-adding the folder fixed it.

## Planned

- Push images to AWS ECR from the pipeline
- Terraform-provisioned AWS infrastructure (VPC, EKS, RDS)
- Spring Boot Actuator health endpoints for real health checks
- Prometheus and Grafana dashboards and alerting
- Kubernetes Secrets in place of plain-text demo credentials
- Flyway migrations in place of Hibernate `ddl-auto` and init scripts