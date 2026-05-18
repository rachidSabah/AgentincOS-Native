import PyPDF2
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def extract_text(pdf_path, output_path):
    with open(pdf_path, 'rb') as file, open(output_path, 'w', encoding='utf-8') as out:
        reader = PyPDF2.PdfReader(file)
        num_pages = len(reader.pages)
        out.write(f"Total pages: {num_pages}\n")
        for i in range(num_pages):
            page = reader.pages[i]
            text = page.extract_text()
            out.write(f"--- Page {i+1} ---\n")
            if text:
                out.write(text + "\n")
            else:
                out.write("[No text found on this page]\n")

if __name__ == "__main__":
    extract_text("22 modules.pdf", "pdf_text.txt")
