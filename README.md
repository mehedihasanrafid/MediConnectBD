# MediConnect BD

Full-stack healthcare platform for Bangladesh supporting doctor discovery, real-time slot holds, chamber & video consultations, SSLCommerz online payments, family member bookings, rescheduling, medical report uploads, digital prescriptions (with PDF download & verification), and role-based dashboards (`PATIENT`, `DOCTOR`, `ADMIN`).

```text
MediConnectBD/
├── MediConnectBDbackend/   Express 5 + TypeORM + MySQL 8 + Redis/BullMQ backend & worker
├── frontend/               React 19 + TypeScript + Vite SPA frontend
├── docker-compose.yml      One-command full-stack container orchestration
└── package.json            Workspace-level convenience scripts
```

## One-Command Startup

### Option A — Docker Compose (New Machine)
```bash
docker compose up --build
```
Starts MySQL 8, Redis 7, runs all database migrations and demo seeds, starts the Backend API (`http://localhost:4000`), Background Worker, and Frontend (`http://localhost:5173`).

### Option B — Local Development
```bash
npm start
```
Starts local Redis (`127.0.0.1:6379`), Backend API (`http://localhost:4000` with Swagger UI at `http://localhost:4000/api-docs/`), BullMQ Worker, and Vite Frontend (`http://localhost:5173`).

## Demo Accounts (Password: `#king123`)
- **Patient:** `patient.demo@mediconnect.example`
- **Approved Doctor 1:** `doctor.demo@mediconnect.example`
- **Approved Doctor 2:** `dr.farhana@mediconnect.example`
- **Admin:** `admin.demo@mediconnect.example`
