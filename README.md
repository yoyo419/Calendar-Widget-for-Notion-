# Calendar Widget for Notion

A lightweight web-based **time blocking calendar** that can also be embedded in Notion as a widget.

This project is primarily a small standalone website for planning tasks and deadlines with a visual time grid.
It supports task scheduling, deadline tracking, and completion status, making it suitable for daily planning and productivity workflows.

While the project can be embedded in Notion, it is designed first as a **simple web app** that runs directly in the browser.

---

## Features

* Time-blocking style weekly planner
* Multiple tasks in the same time slot
* Task categories with custom colors
* Deadline highlighting
* Countdown to the next deadline
* Mark tasks as resolved (completed tasks turn gray)
* Fixed recurring schedules
* Works entirely in the browser (no backend required)

---

## Project Structure

```
index.html     Main UI layout
script.js      Scheduling logic and interactions
style.css      Visual layout and styling
```

---

## Running the Project

This project is a static website.
Simply open `index.html` in a browser.

```
open index.html
```

Or host it using any static hosting service such as:

* GitHub Pages
* Vercel
* Netlify

---

## Using in Notion

After deploying the site, you can embed it into Notion using an **Embed block**.

Example workflow:

1. Deploy the project (e.g., GitHub Pages).
2. Copy the site URL.
3. In Notion, type `/embed`.
4. Paste the URL.

The calendar will then function as a **Notion widget**.

---

## Future Improvements

Possible future improvements include:

* persistent storage (localStorage / cloud sync)
* drag-and-drop improvements
* mobile layout optimization
* export/import schedules
* recurring task rules

---

## License
This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

---

## Author

Chen, Wen-You
t66263105@gmail.com
