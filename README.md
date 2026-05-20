# ATS Resume Analyzer Dashboard

<div align="center">

## AI-Powered Applicant Tracking System (ATS)

A modern full-stack ATS platform for automated resume analysis, candidate management, recruiter workflows, and asynchronous resume processing.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react)
![Redis](https://img.shields.io/badge/Redis-Queue-red?logo=redis)
![Celery](https://img.shields.io/badge/Celery-Async-green?logo=celery)
![SQLite](https://img.shields.io/badge/SQLite-Database-blue?logo=sqlite)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)

</div>

---

# 📌 Overview

The ATS Resume Analyzer Dashboard is a full-stack Applicant Tracking System prototype designed to automate resume ingestion, asynchronous analysis, recruiter workflows, and candidate feedback.

The platform enables recruiters and administrators to:
- Upload and analyze resumes
- Manage job profiles and candidates
- View recruiter dashboards and analytics
- Track applicant scores and rankings
- Process resume analysis asynchronously using task queues

The system architecture combines a React frontend with a Flask backend, Redis queue management, Celery workers, and SQLite database persistence.

---

# 🚀 Features

## 📄 Resume Management
- Single resume upload
- Batch resume upload
- Resume parsing & analysis
- ATS scoring system
- Candidate profile generation

## 👥 User & Candidate Management
- Candidate registration/login
- Recruiter dashboard
- Admin dashboard
- Role-based access control

## ⚡ Asynchronous Processing
- Background resume analysis using Celery
- Redis message broker integration
- Queue-based processing system

## 📊 Dashboard & Analytics
- Resume statistics
- Candidate analytics
- Recruitment insights
- Protected routes & authenticated dashboards

## 🔒 Security
- Password hashing
- Session authentication
- HttpOnly cookies
- CORS protection
- Secure API handling

---

# 🏗️ System Architecture

```text
┌────────────────────┐
│   React Frontend   │
│    (Vite SPA)      │
└─────────┬──────────┘
          │ API Requests
          ▼
┌────────────────────┐
│    Flask Backend   │
│   RESTful APIs     │
└─────────┬──────────┘
          │
 ┌────────┴─────────┐
 ▼                  ▼
SQLite DB       Redis Queue
                     │
                     ▼
              Celery Workers
           (Resume Analysis)
