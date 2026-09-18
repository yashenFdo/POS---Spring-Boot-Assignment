# POS Order & Inventory System

This is a concurrency-safe Point-of-Sale (POS) backend and a React frontend demo designed to handle concurrent load without overselling.

## Tech Stack
- **Backend:** Java 21, Spring Boot 3, Maven, Spring Data JPA, Hibernate
- **Database:** MySQL 8
- **Validation:** Jakarta Bean Validation
- **Testing:** JUnit 5, Testcontainers (real MySQL)
- **Frontend:** React (Vite)
- **Deployment:** Railway

## Local Setup

### Prerequisites
- Java 21
- Node.js (for frontend dev if needed, though Maven builds it automatically)
- Docker (required for Testcontainers to run tests)
- MySQL 8 (if running locally outside of tests)

### Running the application locally
1. Ensure MySQL is running and set the environment variables if your credentials are different from `root`/`root`. For example, in PowerShell:
   ```powershell
   $env:SPRING_DATASOURCE_USERNAME="your_username"
   $env:SPRING_DATASOURCE_PASSWORD="your_password"
   ```
2. Run the application from the `backend` directory:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
3. The frontend is built and copied during the Maven package phase, but for local frontend dev, you can use:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### API Docs
- Swagger UI is available at `http://localhost:8080/swagger-ui.html`

## Testing & Concurrency Guarantee

### Running Tests
To run the integration and concurrency tests, make sure Docker is running on your machine:
```bash
cd backend
./mvnw test
```

### The Concurrency Guarantee
The `CheckoutService` uses pessimistic locking via `@Lock(LockModeType.PESSIMISTIC_WRITE)` on the `Product` entity during the checkout phase. This guarantees that multiple concurrent requests trying to checkout the same item will be queued up at the database row level. If the stock drops below the requested quantity, a `409 Conflict` (InvalidStateException) is returned.

The test `testConcurrentCheckout_NoOverselling` in `ConcurrencyTest.java` demonstrates this by firing 50 concurrent checkout requests for a product with a stock of 5. The test asserts that exactly 5 succeed and exactly 45 fail, with the product stock ending exactly at 0.

## Order State Machine
```
PENDING   → RESERVED   (checkout initiated, stock locked)
RESERVED  → PAID       (mock payment succeeds)
RESERVED  → FAILED     (mock payment fails → stock released immediately)
RESERVED  → EXPIRED    (5 min elapse without payment, OR payment times out → stock released)
PENDING   → CANCELLED  (user cancels before checkout)
RESERVED  → CANCELLED  (user cancels during reservation → stock released)
```
*Note: Once PAID, an order is terminal in this section.*

## Deployment
This project is configured to deploy to Railway using the included multi-stage `Dockerfile`.
1. Provision a MySQL database plugin on Railway.
2. Link the repository to a Railway project.
3. Configure the env vars: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`.
4. The deployment will build the React app, package it into the Spring Boot JAR, and serve it on port `8080`.
