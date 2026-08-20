# Gig Marketplace

A MERN stack local gig marketplace application.

## Structure

```
gig-marketplace/
├── frontend/
├── backend/
├── .gitignore
└── README.md
```

## Backend

The backend is a Node.js/Express.js API with MongoDB.

### Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `JWT_EXPIRES_IN` - JWT expiration time
- `NODE_ENV` - Environment (development/production)

### API Endpoints

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout user

### User Roles

- `worker` - Can find and apply for jobs
- `employer` - Can create jobs and hire workers