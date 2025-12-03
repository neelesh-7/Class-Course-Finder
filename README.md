# Course Explorer 📚

An interactive **Course Explorer** web app that loads course data from a JSON file and lets users filter and sort courses right in the browser.

## 🔍 Overview

This project involves importing course data from a JSON file, then implementing filtering and sorting functionality on a webpage to help users explore different courses. The interface supports interactive data exploration by:

- Filtering by course attributes (department, level, credits, instructor)
- Sorting course listings by ID, title, or semester
- Displaying detailed information for a selected course

It provides practical experience with **JSON data**, **JavaScript array methods**, and **DOM manipulation**.

---

## 🧰 Tech Stack

- **HTML5** for structure (`index.html`)
- **CSS3** for layout and styling (`styles.css`)
- **Vanilla JavaScript (ES6+)** for logic and interactivity (`scripts.js`)
- **JSON** for sample data (`courses.json`)

---

## ✨ Features

### 1. JSON File Loading

- Users select a `.json` file via a file input.
- The app validates:
  - File type (must be `.json`)
  - JSON format (must be an array of course objects)
- Invalid entries are skipped with friendly error messages instead of crashing the app.

### 2. Course Filters

The app dynamically builds filters based on the loaded data:

- **Department**
- **Level**
- **Credits**
- **Instructor**

Each filter is populated from unique values in the JSON file, and users can combine filters to narrow down the course list.

### 3. Sorting Options

Sorting is done entirely client-side using JavaScript array methods:

- **ID (A–Z / Z–A)**
- **Title (A–Z / Z–A)**
- **Semester: Earliest first / Latest first**

Semesters like `Fall 2025` are normalized into sortable values (term + year) before comparison.

### 4. Interactive Course List & Details

- Left panel: clickable list of course IDs
- Right panel: detailed view of the selected course, including:
  - ID, Title, Department, Level, Credits
  - Instructor
  - Semester / Posted Time
  - Skill (if provided)
  - Description / Details
