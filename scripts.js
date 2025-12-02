//  Global state
let allCourses = [];
let selectedCourseId = null;

// Course class for requirement 3
class Course {
    constructor(courseObj = {}) {
        // Use optional chaining & defaults so missing fields don't crash anything
        this.id = courseObj.id ?? "Unknown ID";
        this.title = courseObj.title ?? "Untitled Course";
        this.department = courseObj.department ?? "Unknown Department";
        this.level = isFinite(courseObj.level) ? Number(courseObj.level) : "N/A";
        this.credits = isFinite(courseObj.credits) ? Number(courseObj.credits) : "N/A";
        this.instructor = courseObj.instructor || null;
        this.description = courseObj.description || "No description available.";
        this.semester = courseObj.semester || "Unknown Semester";

        // Fields to match the project spec wording
        this.postedTime = this.semester;
        this.type = this.department;
        this.skill = courseObj.skill || "None listed";
        this.detail = this.description;
    }

    get displayInstructor() {
        return this.instructor || "TBA";
    }

    // A short summary string (useful for debugging or logging)
    getSummary() {
        return `${this.id}: ${this.title} (${this.department}, level ${this.level})`;
    }

    // Normalize semester / posted time for sorting
    getNormalizedSemester() {
        const semesters = { Winter: 1, Spring: 2, Summer: 3, Fall: 4 };

        if (!this.postedTime || typeof this.postedTime !== "string") {
            return { year: 0, index: 0 };
        }

        const [term, yearStr] = this.postedTime.split(" ");
        return {
            year: parseInt(yearStr) || 0,
            index: semesters[term] ?? 0
        };
    }

    // Build an HTML snippet for the details panel
    getDetailHTML() {
        return `
            <h2>${this.id}</h2>
            <p><strong>Title:</strong> ${this.title}</p>
            <p><strong>Department:</strong> ${this.department}</p>
            <p><strong>Level:</strong> ${this.level}</p>
            <p><strong>Credits:</strong> ${this.credits}</p>
            <p><strong>Instructor:</strong> ${this.displayInstructor}</p>
            <p><strong>Semester / Posted Time:</strong> ${this.postedTime}</p>
            <p><strong>Skill:</strong> ${this.skill}</p>
            <p style="margin-top: 10px;"><strong>Details:</strong><br>${this.detail}</p>
        `;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");

    fileInput.addEventListener("change", handleFileChange);

    // Re-render whenever filters / sort change
    ["filterDepartment", "filterLevel", "filterCredits", "filterInstructor", "sortBy"]
        .forEach((id) => {
            document.getElementById(id).addEventListener("change", () => {
                safeApplyFiltersAndRender();
            });
        });
});

/* FILE LOADING & TOP-LEVEL ERROR HANDLING */

function handleFileChange(event) {
    const file = event.target.files[0];
    const fileNameEl = document.getElementById("fileName");

    if (!file) {
        return;
    }

    fileNameEl.textContent = file.name;

    if (!file.name.toLowerCase().endsWith(".json")) {
        showError("Invalid file type. Please select a .json file.");
        clearCourses();
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const raw = e.target.result;

            if (!raw || raw.trim().length === 0) {
                throw new Error("Empty file");
            }

            let data = JSON.parse(raw);

            if (!Array.isArray(data)) {
                throw new Error("JSON root is not an array of courses.");
            }

            const warnings = [];
            const validCourses = [];

            data.forEach((item, index) => {
                const { isValid, message } = validateRawCourse(item);

                if (!isValid) {
                    // Skip bad entries but keep going
                    warnings.push(`Entry ${index + 1}: ${message}`);
                    return;
                }

                try {
                    const course = new Course(item);
                    validCourses.push(course);
                } catch (err) {
                    warnings.push(
                        `Entry ${index + 1}: Error creating Course object (${err.message}).`
                    );
                }
            });

            if (validCourses.length === 0) {
                showError(
                    "No valid courses found in this file. Please check the JSON format."
                );
                clearCourses();
                return;
            }

            allCourses = validCourses;
            hideError();

            if (warnings.length > 0) {
                // Show a friendly message but don't block the app
                showError(
                    `Loaded ${validCourses.length} course(s). ` +
                    `Skipped ${warnings.length} invalid entr${warnings.length === 1 ? "y" : "ies"}.`
                );
                console.warn("Course data warnings:\n" + warnings.join("\n"));
            }

            initFilterOptions(allCourses);
            selectedCourseId = null;
            safeApplyFiltersAndRender();
        } catch (err) {
            console.error(err);
            showError("Invalid JSON file format. Please make sure it is valid course data.");
            clearCourses();
        }
    };

    reader.onerror = () => {
        showError("Error reading file. Please try again.");
        clearCourses();
    };

    reader.readAsText(file);
}

// Validate one item from the JSON array
function validateRawCourse(item) {
    if (typeof item !== "object" || item === null) {
        return { isValid: false, message: "Item is not a valid object." };
    }

    if (!item.id && !item.title) {
        return {
            isValid: false,
            message: "Missing both 'id' and 'title'. At least one is required."
        };
    }

    // If fields exist but are wrong type, we still accept them (class uses defaults),
    // log warnings if you want to be extra strict.

    return { isValid: true, message: "" };
}

function showError(msg) {
    const el = document.getElementById("errorMessage");
    el.textContent = msg;
}

function hideError() {
    const el = document.getElementById("errorMessage");
    el.textContent = "";
}

function clearCourses() {
    allCourses = [];
    selectedCourseId = null;
    renderCourseList([]);
    renderCourseDetails(null);
}

/* FILTER OPTIONS (DEPARTMENT, LEVEL, ETC.) */

function initFilterOptions(courses) {
    populateSelectFromSet(
        "filterDepartment",
        courses.map((c) => c.department)
    );
    populateSelectFromSet(
        "filterLevel",
        courses.map((c) => c.level)
    );
    populateSelectFromSet(
        "filterCredits",
        courses.map((c) => c.credits)
    );
    populateSelectFromSet(
        "filterInstructor",
        courses
            .map((c) => c.instructor)
            .filter((v) => v !== null && v !== undefined && v !== "")
    );
}

/**
 * Rebuilds a <select> with an "All" option plus unique sorted values.
 * Safely ignores weird / empty values.
 */
function populateSelectFromSet(selectId, values) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value; // try to keep previous value
    select.innerHTML = "";

    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "All";
    select.appendChild(allOpt);

    const uniqueValues = Array.from(
        new Set(
            values
                .filter((v) => v !== undefined && v !== null && v !== "" && v !== "N/A")
                .map(String)
        )
    ).sort((a, b) => a.localeCompare(b));

    uniqueValues.forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
    });

    if (currentValue && uniqueValues.includes(currentValue)) {
        select.value = currentValue;
    }
}

/* FILTER + SORT + SAFE RENDERING */

function safeApplyFiltersAndRender() {
    try {
        applyFiltersAndRender();
    } catch (err) {
        console.error("Rendering error:", err);
        showError("Something went wrong while updating the view, but the page is still usable.");
    }
}

function applyFiltersAndRender() {
    const filtered = filterCourses(allCourses);
    const sorted = sortCourses(filtered);

    // Ensure something is selected
    if (!sorted.find((c) => c.id === selectedCourseId)) {
        selectedCourseId = sorted.length > 0 ? sorted[0].id : null;
    }

    renderCourseList(sorted);

    const selected =
        sorted.find((c) => c.id === selectedCourseId) || sorted[0] || null;
    renderCourseDetails(selected);
}

function filterCourses(courses) {
    const depVal = document.getElementById("filterDepartment").value;
    const levelVal = document.getElementById("filterLevel").value;
    const creditsVal = document.getElementById("filterCredits").value;
    const instrVal = document.getElementById("filterInstructor").value;

    return courses.filter((c) => {
        const depOk = depVal === "" || c.department === depVal;
        const levelOk = levelVal === "" || String(c.level) === levelVal;
        const creditsOk = creditsVal === "" || String(c.credits) === creditsVal;
        const instrOk = instrVal === "" || c.displayInstructor === instrVal;
        return depOk && levelOk && creditsOk && instrOk;
    });
}

function sortCourses(courses) {
    const sortVal = document.getElementById("sortBy").value;
    const arr = [...courses];

    const compareString = (a, b) => String(a).localeCompare(String(b));

    const compareSemester = (aSem, bSem) => {
        const a = parseSemester(aSem);
        const b = parseSemester(bSem);
        if (a.year !== b.year) return a.year - b.year;
        return a.termIndex - b.termIndex;
    };

    switch (sortVal) {
        case "id-asc":
            arr.sort((a, b) => compareString(a.id, b.id));
            break;
        case "id-desc":
            arr.sort((a, b) => compareString(b.id, a.id));
            break;
        case "title-asc":
            arr.sort((a, b) => compareString(a.title, b.title));
            break;
        case "title-desc":
            arr.sort((a, b) => compareString(b.title, a.title));
            break;
        case "sem-earliest":
            arr.sort((a, b) => compareSemester(a.semester, b.semester));
            break;
        case "sem-latest":
            arr.sort((a, b) => compareSemester(b.semester, a.semester));
            break;
        case "none":
        default:
            // leave as-is
            break;
    }

    return arr;
}

// Converts "Fall 2025" etc into something sortable
function parseSemester(semStr) {
    if (!semStr || typeof semStr !== "string") {
        return { year: 0, termIndex: 0 };
    }
    const [term, yearStr] = semStr.split(" ");
    const year = parseInt(yearStr, 10) || 0;
    const order = { Winter: 1, Spring: 2, Summer: 3, Fall: 4 };
    const termIndex = order[term] ?? 0;
    return { year, termIndex };
}

/* RENDERING LIST + DETAILS */

function renderCourseList(courses) {
    const listEl = document.getElementById("courseList");
    if (!listEl) return;

    listEl.innerHTML = "";

    if (!courses.length) {
        const p = document.createElement("p");
        p.className = "placeholder-text";
        p.textContent = "No courses to display. Try loading a JSON file or changing filters.";
        listEl.appendChild(p);
        return;
    }

    courses.forEach((course) => {
        const row = document.createElement("div");
        row.className = "course-row";
        row.textContent = course.id;

        if (course.id === selectedCourseId) {
            row.classList.add("selected");
        }

        row.addEventListener("click", () => {
            selectedCourseId = course.id;
            renderCourseList(courses); // refresh highlight
            renderCourseDetails(course);
        });

        listEl.appendChild(row);
    });
}

function renderCourseDetails(course) {
    const detailsEl = document.getElementById("courseDetails");
    if (!detailsEl) return;

    detailsEl.innerHTML = "";

    if (!course) {
        const p = document.createElement("p");
        p.className = "placeholder-text";
        p.textContent = "Select a course from the list to see its details here.";
        detailsEl.appendChild(p);
        return;
    }

    // Use the class method so formatting is encapsulated in Course
    detailsEl.innerHTML = course.getDetailHTML();
}
