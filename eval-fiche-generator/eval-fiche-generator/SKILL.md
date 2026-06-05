---
name: eval-fiche-generator
description: Generates "Fiche de description" (Contrôle Continu, Pratique, Sommatif) and MCQ exams in Word format from training module PDF documents using Python and python-docx. Use this skill when asked to create evaluation sheets or exams based on module descriptions and Word templates.
---

# Evaluation Fiche Generator

This skill automates the creation of professional evaluation sheets and Multiple Choice Question (MCQ) exams in Word format, based on PDF module descriptions.

## Workflow

1. **Extract Information**: Read the provided PDF containing module descriptions to extract module IDs, titles, durations, objectives, and specific evaluation criteria.
2. **Setup Environment**: Ensure `python-docx` is installed in the workspace (`pip install python-docx`).
3. **Generate Evaluation Sheets**: 
   - Use the template provided in `assets/Fiche de description d.docx`.
   - For a given module, generate three distinct files: Contrôle Continu, Contrôle Pratique, and Contrôle Sommatif.
   - Distinctly tailor the description, conditions, and criteria fields for each type of evaluation in perfect French.
4. **Generate MCQ Exams**:
   - Generate a 20-question MCQ exam and its corresponding answer key (Correction).
   - Use the logo provided in `assets/logo.png` for the header.
   - Include the required header fields (Infohas attached, Student Name, Module number, Nature of Examination, Date).

## Bundled Resources

### Scripts
- `scripts/generate_fiches.py`: Python script template for filling out the evaluation sheets.
- `scripts/generate_mcq.py`: Python script template for creating MCQ exams with custom headers.

### Assets
- `assets/Fiche de description d.docx`: The Word template used for all evaluation sheets.
- `assets/logo.png`: The Infohas logo used for exam headers.
