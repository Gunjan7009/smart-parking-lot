# Smart Parking Lot API

A Node.js and Express backend for managing a smart parking lot. The API allocates compatible parking spots, records vehicle entry and exit, calculates parking fees, and reports current availability. MongoDB and Mongoose are used for persistence.

## Features

- Allocate an available spot that supports the vehicle's type.
- Support `MOTORCYCLE`, `CAR`, and `BUS`.
- Record vehicle entry and exit times using parking tickets.
- Calculate fees based on vehicle type and parking duration.
- Prevent a vehicle from having multiple active parking tickets.
- Use MongoDB transactions for entry and checkout operations.
- Handle concurrent entry and checkout attempts.
- Return parking availability totals, grouped by vehicle type and floor.
- Validate request data and return consistent error responses.
- Include unit, controller, integration, and concurrency tests.

## Tech Stack

- Node.js
- Express
- MongoDB
- Mongoose
- Jest
- Supertest

## Project Structure

```text
smart-parking-lot/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── constants/
│   │   └── vehicleTypes.js
│   ├── controllers/
│   │   ├── parkingController.js
│   │   └── parkingSpotController.js
│   ├── middlewares/
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── ParkingSpot.js
│   │   └── ParkingTicket.js
│   ├── routes/
│   │   ├── parkingRoutes.js
│   │   └── parkingSpotRoutes.js
│   └── services/
│       ├── FeeCalculator.js
│       └── ParkingService.js
├── tests/
│   ├── app.test.js
│   ├── concurrency.setup.js
│   ├── controllers/
│   ├── services/
│   ├── helpers/
│   └── integration/
├── jest.integration.config.js
├── .env.example
├── package.json
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a guide. Set the MongoDB connection strings required by `src/config/db.js` and the integration-test helper.

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
MONGO_TEST_URI=mongodb+srv://<username>:<password>@<cluster>/smart_parking_lot_test
PORT=3000
```

Use a separate database for integration tests. The test helper is designed to reject a database other than `smart_parking_lot_test`. Confirm that these variable names match your actual `.env.example`, `src/config/db.js`, and `tests/helpers/testDb.js`.

### 3. Start the server

Use the start script configured in `package.json`. For example:

```bash
npm start
```

The health-check endpoint is:

```http
GET /
```

Example response (confirm the message matches `src/app.js`):

```json
{
  "message": "Smart Parking Lot API is running"
}
```

## API Endpoints

The examples below assume the server is running locally on port `3000`.

### Parking Spots

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/spots` | Create a parking spot |
| `GET` | `/api/spots` | List parking spots; supports optional filters |

#### Create a Parking Spot

`POST /api/spots`

Request body:

```json
{
  "spotId": "F1-CAR-01",
  "floorNumber": 1,
  "supportedVehicleType": "CAR"
}
```

Supported vehicle types are `MOTORCYCLE`, `CAR`, and `BUS`. The floor number must be a positive integer.

Success response (`201 Created`):

```json
{
  "message": "Parking spot created successfully",
  "parkingSpot": {
    "spotId": "F1-CAR-01",
    "floorNumber": 1,
    "supportedVehicleType": "CAR",
    "isOccupied": false,
    "vehicleNumberPlate": null
  }
}
```

The actual MongoDB document may also include `_id` and timestamp fields. Verify the response shape against the controller implementation.

#### List Parking Spots

`GET /api/spots`

Optional query parameters:

| Parameter | Allowed values | Description |
|---|---|---|
| `floorNumber` | Positive integer | Filter by floor |
| `vehicleType` | `MOTORCYCLE`, `CAR`, `BUS` | Filter by supported vehicle type |
| `status` | `available`, `occupied` | Filter by occupancy |

Examples:

```http
GET /api/spots?floorNumber=1
GET /api/spots?vehicleType=CAR
GET /api/spots?status=available
GET /api/spots?floorNumber=1&vehicleType=CAR&status=available
```

Success response (`200 OK`):

```json
{
  "count": 1,
  "parkingSpots": [
    {
      "spotId": "F1-CAR-01",
      "floorNumber": 1,
      "supportedVehicleType": "CAR",
      "isOccupied": false,
      "vehicleNumberPlate": null
    }
  ]
}
```

The actual response may also include MongoDB `_id` and timestamp fields.

### Vehicle Parking

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/parking/entry` | Park a vehicle and create an active ticket |
| `POST` | `/api/parking/exit` | Check out a vehicle using its ticket |
| `GET` | `/api/parking/availability` | Get current availability totals |

#### Vehicle Entry

`POST /api/parking/entry`

Request body:

```json
{
  "vehicleNumberPlate": "MP09AB1234",
  "vehicleType": "CAR"
}
```

Success response (`201 Created`):

```json
{
  "message": "Vehicle parked successfully",
  "ticket": {
    "ticketId": "<generated-ticket-id>",
    "vehicleNumberPlate": "MP09AB1234",
    "vehicleType": "CAR",
    "spotId": "F1-CAR-01",
    "floorNumber": 1,
    "status": "ACTIVE"
  }
}
```

#### Vehicle Checkout

`POST /api/parking/exit`

Request body:

```json
{
  "ticketId": "<ticket-id-from-entry>"
}
```

Success response (`200 OK`):

```json
{
  "message": "Vehicle checked out successfully",
  "ticket": {
    "ticketId": "<ticket-id>",
    "status": "COMPLETED",
    "exitTime": "<checkout-timestamp>",
    "fee": 40
  },
  "fee": 40
}
```

The fee above is an example. The actual fee depends on vehicle type and parking duration.

#### Parking Availability

`GET /api/parking/availability`

Success response (`200 OK`):

```json
{
  "totalSpots": 10,
  "occupiedSpots": 4,
  "availableSpots": 6,
  "byVehicleType": [
    {
      "vehicleType": "CAR",
      "totalSpots": 6,
      "occupiedSpots": 3,
      "availableSpots": 3
    }
  ],
  "byFloor": [
    {
      "floorNumber": 1,
      "totalSpots": 5,
      "occupiedSpots": 2,
      "availableSpots": 3
    }
  ]
}
```

These values are illustrative; returned totals depend on the database contents.

## Parking and Fee Rules

- A vehicle type must match a spot's `supportedVehicleType`.
- Spot allocation prefers the lowest floor number, then the spot ID.
- Vehicle number plates are trimmed and converted to uppercase.
- A vehicle cannot have more than one active ticket at a time.
- A completed ticket cannot be used for checkout again.
- Entry and checkout update the ticket and spot within MongoDB transactions.
- Fees are calculated by `FeeCalculator.js`.

Current fee rates:

| Vehicle Type | Rate |
|---|---:|
| `MOTORCYCLE` | ₹20 per hour |
| `CAR` | ₹40 per hour |
| `BUS` | ₹100 per hour |

Partial hours are rounded up, with a minimum charge of one hour. The current implementation has no grace period or daily fee cap.

## Data Models and Database Safeguards

### ParkingSpot

Stores the spot ID, floor number, supported vehicle type, occupancy state, and the vehicle number plate when occupied.

Important constraints and indexes include:

- Unique `spotId`.
- Required floor number and supported vehicle type.
- A compound index on vehicle type, occupancy, floor, and spot ID to support allocation queries.

### ParkingTicket

Stores the ticket ID, vehicle plate and type, allocated spot, floor, entry and exit times, fee, and status.

Important constraints and indexes include:

- Unique `ticketId`.
- A partial unique index on `vehicleNumberPlate` for `ACTIVE` tickets, preventing more than one active ticket per normalized plate.

Ensure the indexes exist in the actual MongoDB database for these safeguards to apply. Verify index creation when setting up the project.

## Error Responses

The API uses HTTP status codes to communicate failures.

| Status | Meaning | Example |
|---|---|---|
| `400 Bad Request` | Missing or invalid input | Invalid vehicle type |
| `404 Not Found` | Resource or active ticket not found | Active parking ticket not found |
| `409 Conflict` | Request conflicts with current state | Vehicle already parked or no compatible spot available |
| `500 Internal Server Error` | Unexpected server failure | Database query fails unexpectedly |
| `503 Service Unavailable` | Recognized transient transaction failure | Temporary transaction failure |

Expected application errors include a message explaining the problem. Unexpected server errors return a generic message so internal database details are not exposed.

Example `409 Conflict` response:

```json
{
  "message": "Vehicle is already parked"
}
```

Example unexpected `500 Internal Server Error` response:

```json
{
  "message": "Internal server error"
}
```

Unknown routes return `404`:

```json
{
  "message": "Route not found"
}
```

Exact messages and response shapes should be confirmed against the current controllers and error middleware.

## Testing

Run the unit and controller tests:

```bash
npm test
```

Run the integration tests, including concurrency scenarios:

```bash
npm run test:integration
```

The standard test command excludes integration tests. Integration tests use a dedicated test database; configure `MONGO_TEST_URI` as required by `tests/helpers/testDb.js`.

The test suite covers:

- Fee calculation.
- Input validation.
- Vehicle entry and checkout behavior.
- Parking availability.
- Controller success and error responses.
- Concurrent attempts to allocate the same spot.
- Concurrent entry for the same vehicle.
- Concurrent checkout of the same ticket.

## Design Decisions

- **Single Responsibility Principle:** Controllers handle HTTP requests and responses, services coordinate parking business logic, models define persisted data, and the fee calculator handles fee rules.
- **DRY:** Vehicle types are maintained in a shared constants file.
- **Atomic updates:** `findOneAndUpdate` reserves an available spot with a single conditional database operation.
- **Transactions:** Entry and checkout group related spot and ticket updates so a failed operation can be rolled back.
- **Database constraints:** Unique and partial unique indexes provide additional protection against duplicate IDs and active tickets.
- **Simple fee calculation:** A rate lookup is sufficient while all vehicle types use the same hourly calculation rule; a strategy hierarchy is unnecessary for the current requirements.

## Author

**Gunjan Dixit**
