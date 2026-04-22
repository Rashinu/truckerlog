# Full Stack Developer Assessment Plan

## Project Overview
This project is a **truck trip planner + ELD log generator** built with **Django (backend)** and **React (frontend)**.

The app should accept trip details as input and produce:
- a mapped route with stops/rest suggestions
- generated driver daily log sheets (ELD-style output)

## Assessment Requirements

### Tech Stack
- Frontend: React
- Backend: Django

### Deliverables
- Live hosted version
- GitHub repository
- 3–5 minute Loom walkthrough video

### Time Constraint
- Maximum 4 days
- Maximum 16 work hours

### Reward
- $100 bonus upon successful completion

---

## Core Inputs
- Current location
- Pickup location
- Dropoff location
- Current cycle used (hours)

---

## Core Outputs

### 1. Route Map
- route path
- major stops
- fueling stops
- required rest breaks

### 2. ELD / Daily Log Sheets
- driving time calculation
- duty status tracking
- break planning
- multi-day log generation
- visual log sheet rendering

---

## Assumptions
- Property-carrying driver
- 70 hours / 8 days cycle
- No adverse conditions
- Fuel every 1000 miles
- 1 hour pickup + 1 hour dropoff

---

## Suggested Architecture

### Frontend
- React
- Tailwind CSS
- Axios / Fetch
- Mapbox / Leaflet

### Backend
- Django
- Django REST Framework
- HOS logic service layer

---

## API Design

POST /api/trip-plan

Request:
{
  "current_location": "Dallas, TX",
  "pickup_location": "Oklahoma City, OK",
  "dropoff_location": "Nashville, TN",
  "current_cycle_used_hours": 24
}

Response:
{
  "route": {},
  "daily_logs": []
}

---

## HOS Logic
- 11-hour driving limit
- 14-hour window
- 30-min break after 8h driving
- 70h / 8-day cycle

---

## Execution Plan

Day 1: Setup + form  
Day 2: Map integration  
Day 3: HOS logic  
Day 4: Logs + deploy + video  

---

## Risk Areas
- HOS logic correctness
- multi-day logs
- visual rendering

---

## Goal
Build a working MVP with clean UI and correct logic.
