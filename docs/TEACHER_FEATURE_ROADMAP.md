# Class Management System: Teacher One-Stop-Shop Roadmap

> **Vision**: Transform the app into a complete, daily command center for teachers where every classroom task, administrative duty, and instructional preparation can be handled in one place without juggling multiple tabs, spreadsheets, or paper binders.

---

## 1. Current App Foundation (Existing Capabilities)

The app already features a solid architectural baseline:
- **Class Management**: Class schedules, room assignments, color palettes, academic year, pin & archive.
- **Roster & Student Management**: Enrolled student tracking, status badges, profile avatars.
- **Activities & Assessments**: Activity manager with scoring metrics, quiz & assignment configuration.
- **Daily Attendance**: Dedicated attendance monitor sheet with date selection and statuses.
- **Grades & Computations**: Weighted grading table with automated average computation.
- **Documents Drive**: Cloud file management, folder hierarchies, drag/upload, file previewers.
- **Student Dashboard**: Student portal view for classes and assessments.
- **Security & Tech Stack**: React 19, Vite, Tailwind CSS v4, Radix/Base UI components, Firebase Firestore & Storage.

---

## 2. Recommended Feature Modules & Services

### Module 1: In-Class Live Toolkit (Daily Classroom Dynamics)
*Immediate, real-time tools for teachers actively running a class.*
- **Interactive Seating Chart**:
  - Drag-and-drop grid of classroom desks matching the room's physical layout.
  - Direct attendance taking by clicking student desks (Present, Absent, Late, Excused).
  - Color-coding for quick visual grouping (e.g., peer tutors, separate chatty students).
- **Classroom Utilities Bar**:
  - **Random Student Picker / Wheel Spinner**: Fair, visual cold-calling for recitations.
  - **Group Generator**: One-click team generator (random, balanced by gender, or mixed academic performance).
  - **Classroom Timer & Stopwatch**: Fullscreen countdown for quizzes, board work, and presentations.
  - **Classroom Noise / Volume Meter**: Microphone-based visual noise indicator to encourage quiet focus during seatwork.
- **Behavior & Participation Tracker**:
  - Point award system (merits for active participation, teamwork, helpfulness; demerit notes for infractions).

---

### Module 2: Instructional Planning & Curriculum Suite
*Centralizing lesson preparation and curriculum alignment.*
- **Lesson Plan & Unit Builder**:
  - Structured daily/weekly lesson plan creator with standard templates (Objectives, Materials, Motivation, Lesson Proper, Evaluation, Assignment).
  - Direct linking to uploaded Drive documents, worksheets, and created activities.
- **Interactive Timetable & Period Schedule**:
  - Today's agenda showing current active class, time remaining, room number, and next period.
- **Curriculum / Syllabus Progress Tracker**:
  - Checklist of learning competencies or curriculum chapters covered vs. remaining for the grading period.

---

### Module 3: Smart Assessment & Rubrics Engine
*Streamlining grading and formal report generation.*
- **Interactive Rubric Creator**:
  - Grid builder (Criteria × Performance Levels with weights) for essays, oral recitations, presentations, and laboratory tasks.
  - One-click rubric scoring: clicking performance cells automatically tallies scores into the gradebook.
- **Official Report Card & Grade Sheet Generator**:
  - One-click PDF/Excel export formatted for institutional standards (e.g., Quarterly Report Cards, Master Grade Sheets, DepEd School Forms like SF2 / SF9 where applicable).
- **Grading Formula & Transmutation Customizer**:
  - Configurable weight distributions (e.g., Written Work 30%, Performance Tasks 50%, Quarterly Assessment 20%) and custom grade transmutation tables.

---

### Module 4: Student Insights & Early Warning Radar
*Proactive intervention for at-risk learners.*
- **"At-Risk" Student Radar**:
  - Automated flags for students with consecutive absences, missing activities, or declining grade trajectories.
- **360° Comprehensive Student Profile**:
  - Longitudinal view: complete attendance history, behavior log, medical/special needs notes, parent contact information, and grade trends.
- **One-Click Parent-Teacher Conference Progress Card**:
  - Clean, printable single-page PDF student progress summary with personalized teacher notes.

---

### Module 5: Parent & Student Communication Hub
*Structured communication without leaking personal phone numbers or chat accounts.*
- **Class Notice Board & Announcements**:
  - Broadcast announcements, exam reminders, syllabus changes, and holiday schedules.
- **Parent Meeting & Incident Logbook**:
  - Confidential log of parent-teacher conferences, guidance referrals, and behavioral incidents with timestamps and follow-up status.
- **Automated Alerts (SMS / Email)**:
  - Instant notifications for absences, low score alerts, and school announcements.

---

### Module 6: AI Co-Pilot for Teachers
*Eliminating repetitive administrative busywork.*
- **AI Lesson Plan Drafter**:
  - Generates structured 5E or traditional lesson plans based on subject, grade level, and topic.
- **AI Quiz & Worksheet Generator**:
  - Generates multiple-choice, identification, or essay questions directly from uploaded PDF lecture slides or topic outlines.
- **AI Report Card Comment Assistant**:
  - Generates personalized, constructive, and empathetic report card feedback based on student scores and attendance.

---

### Module 7: Teacher Personal Desk & Offline Reliability
- **Sticky Notes & Quick Tasks**:
  - Pinned to-do items, reminders to submit grades, print materials, or follow up with specific students.
- **Full Offline Sync (PWA / IndexedDB)**:
  - Seamless offline capability allowing teachers to record grades and attendance with zero Wi-Fi, auto-syncing once connected.

---

## 3. Recommended Phased Rollout

1. **Phase 1 (Quick Wins - Daily Class Utilities)**:
   - Random Student Picker, Classroom Timer & Group Generator.
   - Quick Class Notes / To-Do Sticky Board on Teacher Dashboard.
2. **Phase 2 (Visual Seating Chart & Fast Attendance)**:
   - Drag-and-drop seating chart with one-tap attendance sync.
3. **Phase 3 (Rubric Builder & Assessment Enhancements)**:
   - Interactive rubrics for scoring performance tasks directly into the gradebook.
4. **Phase 4 (Lesson Planning & Curriculum Hub)**:
   - Lesson Plan creator linked to existing Documents and Activities.
5. **Phase 5 (Reporting & Analytics Radar)**:
   - Early warning alerts for at-risk students and one-click printable parent progress cards.
6. **Phase 6 (AI Assistant Integration)**:
   - AI Quiz, Rubric, and Lesson Plan generators.

---

## 4. Key Questions to Decide Upon Return

1. **Target Education Level**:
   - Primary/Elementary vs. Junior/Senior High vs. Higher Education/College? (Influences whether features prioritize seating charts & parent alerts or syllabi & rubrics).
2. **Curriculum / Institutional Standards**:
   - Are there specific official form formats or grading systems needed (e.g., Philippine DepEd SF2/SF9, US K-12, or custom GPA)?
3. **First Focus Feature**:
   - Which module do you want to implement first when ready to build?
