# TechQuiz - Technical Quiz & Assessment Platform

TechQuiz is a modern, responsive, and secure Technical Quiz Platform. It features role-based dashboards (Student & Admin), an automatic scoring engine, an interactive exam interface, visual standings analytics, proctoring security, and bulk spreadsheet importing.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Tailwind CSS, HTML5, JavaScript (bundled via Vite)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose ODM)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs password hashing
- **Reporting:** Client-side PDF generation (`jspdf` & `jspdf-autotable`) and Excel exports (`xlsx`)

---

## 📂 Project Structure

```text
E:\website\
├── backend\                # Express API server
│   ├── config\             # DB connection configuration
│   ├── middleware\         # JWT auth guards
│   ├── models\             # Mongoose schemas (User, Quiz, Attempt)
│   ├── routes\             # API endpoints (Auth, Quiz, User, Admin)
│   ├── seeder.js           # DB Seeder script
│   └── server.js           # Server entry point
└── frontend\               # React client
    ├── src\
    │   ├── components\     # Reusable layout blocks (Navbar, Route Guards)
    │   ├── context\        # Global Contexts (Toast notification context)
    │   ├── pages\          # Home, Logins, Student/Admin dashboards, Session
    │   ├── App.jsx         # App routes mapping
    │   └── main.jsx        # Main React entrypoint
    ├── tailwind.config.js  # Tailwind settings
    └── index.html          # HTML header and Google Fonts link
```

---

## ⚙️ Pre-requisites & Setup

Before running, ensure you have:
1. **Node.js** (v18.0.0 or higher) installed.
2. **MongoDB** instance running locally (`mongodb://localhost:27017`) or a **MongoDB Atlas** connection string.

### 1. Backend Configuration

1. Open `backend/.env` file.
2. If you are using MongoDB Atlas or a custom port, update the connection URI:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=techquiz_secure_jwt_secret_key_2026
   ```

### 2. Seed Database
Run the seeder to populate the database with default assessments and users:
```bash
cd backend
npm run seed
```

*Note: Ensure your MongoDB server is running before executing the seeder.*

### 3. Run Backend Server
Start the development server (runs on `http://localhost:5000`):
```bash
npm run dev
```

---

## 💻 Frontend Configuration & Launch

The React application is managed via Vite and proxies all `/api` requests to the backend server.

### 1. Install & Build
```bash
cd ../frontend
npm install
```

### 2. Launch Dev Server
Start the local client:
```bash
npm run dev
```
Open your browser and navigate to the address displayed in the terminal (typically `http://localhost:5173`).

---

## 🔑 Default Login Credentials

After seeding, you can log in using these preset credentials:

### Student Account
- **Email:** `student@techquiz.com`
- **Password:** `student123`
- **Department:** Computer Science

### Admin Account
- **Email:** `admin@techquiz.com`
- **Password:** `admin123`

---

## 🔒 Security & Proctoring Features
- **Answer Key Security:** The server strips correct answers from questions before sending them to students. Evaluation is performed purely server-side upon submission.
- **Proctoring Warnings:** Tab switches or losing focus on the browser window increments security warnings. The test is auto-submitted on the 3rd violation.
- **Right-Click Blocked:** Disables context menu within the quiz session.
- **State Recovery (Auto-save):** Current progress is save-locked in `localStorage` keyed with the student and quiz ID. Expiration timers are checked against server timestamps to prevent clock manipulation.
