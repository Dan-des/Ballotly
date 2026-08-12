# Student Voting Portal (Next.js, Node.js/Express, MongoDB, n8n)

A full-stack application built for university students to vote on how academic results should be published: **Traditional Notice Board** or **Private Digital Portal**.

## Quick Start Guide

### 1. Start Backend Server
```bash
cd /Users/macbookair/Desktop/student-voting-portal/server
npm start
```
*(Listening on http://localhost:5001 - includes automatic in-memory MongoDB fallback if local MongoDB service is inactive)*

### 2. Start Frontend App
```bash
cd /Users/macbookair/Desktop/student-voting-portal/client
npm run dev
```
*(Listening on http://localhost:3000)*

---

## Testing & Verification

### Run Automated Backend Test Suite
```bash
cd /Users/macbookair/Desktop/student-voting-portal/server
npm test
```

### Check Frontend TypeScript Compilation
```bash
cd /Users/macbookair/Desktop/student-voting-portal/client
npx tsc --noEmit
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/vote` | Submits a new vote. Checks duplicate `studentId`. Triggers n8n webhook asynchronously. |
| `GET` | `/api/stats` | Returns total vote count and choice breakdown percentages. |
| `GET` | `/api/health` | Health check endpoint returning database connectivity status. |
