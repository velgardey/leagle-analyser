import os
import fitz  # PyMuPDF
import google.generativeai as genai

# ============ STEP 1: Configure Gemini API ============
genai.configure(api_key=os.getenv("GEMINI_API_KEY")) # Set your key as an environment variable
model = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")

# ============ STEP 2: PDF Text Extraction ============
def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

# ============ STEP 3: Sliding Window Chunking ============
def sliding_window_chunks(text, max_chars=6000, overlap=1000):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunk = text[start:end]
        if chunk.strip():  # Avoid empty chunks
            chunks.append(chunk)
        if start >= end:
            break  # Prevent infinite loop
        start += max_chars - overlap
    return chunks

# ============ STEP 4: Clean AI Output ============
def clean_response(text):
    lines = text.strip().split("\n")
    unwanted_phrases = ["okay", "here's", "this excerpt", "clause by clause", "please note", "it is important"]
    return "\n".join(
        line for line in lines if not any(p.lower() in line.lower() for p in unwanted_phrases)
    ).strip()

# ============ STEP 5: Analyze Individual Chunk ============
def analyze_chunk(chunk, context=None):
    prompt = f"""
You are a legal analyst. Analyze the following portion of a legal contract.

{"Context from earlier:\n" + context if context else ""}
Text:
\"\"\"{chunk}\"\"\"

Extract and list the following with bullet points:
- Parties involved (if any)
- Key obligations and responsibilities
- Termination clauses (if present)
- Legal risks, ambiguities, or red flags
"""
    try:
        response = model.generate_content(prompt)
        return clean_response(response.text)
    except Exception as e:
        return f"Error analyzing chunk (length {len(chunk)}): {str(e)}"

# ============ STEP 6: Full Document and Clause-Based Summarization ============
def summarize_contract(pdf_path):
    print("[*] Extracting text from PDF...")
    full_text = extract_text_from_pdf(pdf_path)

    allow_full_summary = len(full_text) <= 30000
    full_doc_summary = ""

    if allow_full_summary:
        try:
            print("[*] Generating full-document summary...")
            full_summary_prompt = f"""
You are a senior legal analyst. The following is a complete legal contract:

\"\"\"{full_text}\"\"\"

Generate a well-structured summary with clear section headings and bullet points:
- Parties Involved
- Key Clauses and Obligations
- Termination and Renewal Terms
- Legal Risks or Concerns
- Ambiguous or Unclear Language
"""
            full_doc_summary = clean_response(model.generate_content(full_summary_prompt).text.strip())
        except Exception as e:
            full_doc_summary = f"Failed to generate full summary: {str(e)}"
    else:
        full_doc_summary = "For lengthy contracts, clause-by-clause analysis has been prioritized for better accuracy and insight. A consolidated summary has also been generated based on this detailed review."

    # Clause-wise analysis
    print("[*] Creating sliding-window chunks...")
    chunks = sliding_window_chunks(full_text)
    print(f"[*] Analyzing {len(chunks)} chunks with Gemini...\n")

    chunk_summaries = []
    prev_context = ""

    for i, chunk in enumerate(chunks):
        print(f"[+] Processing Chunk {i+1}/{len(chunks)}")
        summary = analyze_chunk(chunk, context=prev_context)
        chunk_summaries.append(f"[Clause {i+1}]\n{summary}")
        prev_context = summary

    # Combine all chunk summaries
    combined_analysis = "\n\n".join(chunk_summaries)

    # Decide whether to generate consolidated summary based on full summary success
    generate_consolidated_summary = (not allow_full_summary) or ("Failed to generate" in full_doc_summary)
    final_summary_source = full_doc_summary if not generate_consolidated_summary else ""

    if generate_consolidated_summary:
        print("[*] Generating full summary from clause-by-clause analysis...")
        final_prompt = f"""
You are a senior legal advisor. Below is a clause-by-clause analysis of a contract:

\"\"\"{combined_analysis}\"\"\"

Using this information, create a structured and comprehensive summary with bullet points under these sections:
- Parties Involved
- Key Responsibilities & Obligations
- Termination and Renewal Conditions
- Legal Risks or Unclear Clauses
- Suggestions for Legal Review
"""
        try:
            final_summary_source = clean_response(model.generate_content(final_prompt).text.strip())
        except Exception as e:
            final_summary_source = f"Failed to generate clause-based summary: {str(e)}"

    # Final output
    sections = ["========== CONTRACT SUMMARY ==========",
                "Sections:"]

    if allow_full_summary and "Failed to generate" not in full_doc_summary:
        sections.append("- Full Document Summary")
        sections.append("- Clause-by-Clause Analysis")
        # Do NOT include Consolidated Summary here to avoid duplication
        sections.append("\n========== FULL DOCUMENT SUMMARY ==========")
        sections.append(full_doc_summary)
    else:
        sections.append("- Clause-by-Clause Analysis")
        sections.append("- Consolidated Summary\n")
        final_summary_source = (
            "For lengthy contracts, clause-by-clause analysis has been prioritized for better accuracy and insight. "
            "A consolidated summary has been generated based on this detailed review.\n\n"
            + final_summary_source
        )

    sections.append("========== CLAUSE-BY-CLAUSE SUMMARY ==========")
    sections.append(combined_analysis)

    if generate_consolidated_summary:
        sections.append("========== CONSOLIDATED SUMMARY ==========")
        sections.append(final_summary_source)

    final_report = "\n".join(sections)
    print(f"\n[*] Final report generated. Length: {len(final_report)} characters.")
    return final_report

# ============ STEP 7: Entry Point ============
if __name__ == "__main__":
    pdf_path = "your_contract.pdf"  # Change this to your actual file
    report = summarize_contract(pdf_path)
    output_file = "contract_summary.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"[*] Summary written to {output_file}")
