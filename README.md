# Simon-sequence
This is a test for the project simon says sequence

## How to view the example chart locally

1. Open a terminal and change to this folder:

	cd "c:\Users\olivi\OneDrive\Desktop\stadio Folder\WDA262-Matthew-Olivier-25301851\SimonSaysClassic\Simon-Sequence-Improved"

2. Start a simple HTTP server (Python 3):

```bash
python -m http.server 8000
```

3. Open your browser and go to:

http://localhost:8000/example_chart.html

Notes:
- Browsers block `fetch`/AJAX for local `file://` pages; serving over HTTP fixes that.
- The `example_chart.html` loads `survey_responses_transposed.csv` and plots averages for numeric questions (Q11–Q20).
