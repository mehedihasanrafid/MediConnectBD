# MediConnect BD

The backend is a standalone Node.js project inside [MediConnectBDbackend](MediConnectBDbackend/README.md). All backend source, configuration, dependencies, documentation, and local Redis files are contained there.

```text
MediConnectBD/
├── MediConnectBDbackend/   Complete backend project
└── README.md
```

A separate frontend folder can be added beside the backend later. This outer folder keeps the existing Git repository; no nested Git repository is required.

Run backend commands from its own folder:

```bash
cd /home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend
npm run dev
```

MySQL and Redis must be running. See the [backend setup guide](MediConnectBDbackend/docs/LOCAL_DEVELOPMENT.md). Docker is not required.
