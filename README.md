# Parking Codes Demo App

A lightweight, fast web app for distributing monthly parking codes to residents.

## Features

- **Resident Dashboard**: View and manage monthly parking codes
- **Admin Interface**: Comprehensive management tools for residents, codes, and access tracking
- **Access Tracking**: Monitor which residents have accessed their codes
- **Audit Logging**: Complete audit trail of all system changes
- **Mobile-First Design**: Optimized for mobile devices with clean, modern UI

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, SQLite
- **Authentication**: JWT-based with role-based access control

## Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend server on http://localhost:3001
   - Frontend dev server on http://localhost:3000

## Demo Credentials

### Resident Login
- **Email**: john.smith@email.com
- **Unit**: W101

### Admin Login
- **Email**: admin@example.com
- **Password**: admin123

## Demo Scenarios

### 1. Resident Journey
1. Login as john.smith@email.com / W101
2. View assigned parking codes (3 codes pre-seeded: 2 assigned, 1 used)
3. Mark a code as used
4. See the updated status

### 2. Admin Journey
1. Login as admin@example.com / admin123
2. **Dashboard**: View monthly statistics for current month
3. **Residents**: Manage resident accounts
   - Add a new resident
   - Edit existing resident information
4. **Codes**: Upload code pools and assign codes
   - Create a sample CSV with codes like: FL123AB, NK456CD, etc.
   - Upload for current month
   - Assign codes to residents (enforces 4-per-month limit)
5. **Access**: Monitor which residents have accessed their codes
6. **Audit**: View complete audit trail of all changes

### 3. Monthly Rollover
1. In Admin Dashboard → Codes
2. Click "Trigger Rollover" to expire unassigned codes from previous month
3. View updated statistics in Dashboard

## System Architecture

### Database Schema
- **residents**: User account information
- **admins**: Admin account information  
- **parking_codes**: Code pool with status tracking
- **audit_logs**: Complete audit trail
- **access_logs**: Resident access tracking

### API Endpoints

#### Authentication
- `POST /auth/resident/login` - Resident login
- `POST /auth/admin/login` - Admin login

#### Resident
- `GET /resident/codes` - Get monthly codes
- `POST /resident/codes/:id/use` - Mark code as used

#### Admin
- `GET /admin/residents` - List residents
- `POST /admin/residents` - Create resident
- `PATCH /admin/residents/:id` - Update resident
- `DELETE /admin/residents/:id` - Delete resident
- `POST /admin/codes/upload` - Upload code pool
- `POST /admin/codes/assign` - Assign codes to resident
- `GET /admin/dashboard` - Monthly statistics
- `GET /admin/audit` - Audit logs
- `GET /admin/access/summary` - Access tracking

## Business Rules

- **4 codes per resident per month maximum**
- **Codes expire on monthly rollover**
- **All admin actions are audited**
- **Access tracking for resident engagement**
- **Unique code format: 6-8 alphanumeric characters**

## File Upload Format

For code uploads, use CSV or Excel files with codes in the first column:
```
FL493JL
NK582MX
QR759ZY
BH183KD
```

## Development

### Project Structure
```
├── client/          # React frontend
├── server/          # Node.js backend
├── package.json     # Root scripts
└── README.md
```

### Available Scripts
- `npm run dev` - Start both servers
- `npm run build` - Build frontend for production
- `npm run start` - Start production server

## Security Features

- JWT authentication with role-based access
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- Input validation and sanitization
- Audit logging for all admin actions

## Production Deployment

1. Build the frontend: `npm run build`
2. Set environment variables:
   - `JWT_SECRET` - Strong secret key
   - `NODE_ENV=production`
3. Use a production database (PostgreSQL/MySQL)
4. Configure reverse proxy (nginx)
5. Enable HTTPS

## Support

For issues or questions, check the audit logs in the admin interface for debugging information.