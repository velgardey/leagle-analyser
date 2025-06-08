"""
Dependencies (install before running):
    pip install PyMuPDF            
    pip install google-generativeai
    pip install pdf2image pytesseract  
    pip install pillow                  
    pip install regex
    pip install WeasyPrint
                 
"""

import os
import sys
import re
import fitz  # PyMuPDF
import google.generativeai as genai
from weasyprint import HTML
import tempfile
from dotenv import load_dotenv

# ============ CONFIGURATION & GLOBAL RULES ============

# Load environment variables from parent directory
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(parent_dir, '.env.local')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"[INFO] Loaded environment variables from {env_path}")
else:
    # Fallback to .env file
    env_path = os.path.join(parent_dir, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"[INFO] Loaded environment variables from {env_path}")

# 1. Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("[ERROR] GEMINI_API_KEY environment variable is not set")
    sys.exit(1)

print("[INFO] GEMINI_API_KEY found - enabling AI analysis")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")

# 2. Risk‐Level Definitions (per‐clause)
#    We assign numeric risk scores: LOW = 1, MEDIUM = 3, HIGH = 5
RISK_KEYWORDS = {
    # HIGH‐RISK indicators
    r"\bwithout\s+liability\b": 5,
    r"\bno\s+indemnifi": 5,           # Matches 'no indemnity' / 'no indemnification'
    r"\bno\s+governing\s+law\b": 5,
    r"\bno\s+termination\b": 5,
    # MEDIUM‐RISK indicators
    r"\bmay\b": 3,
    r"\bcould\b": 3,
    r"\breasonable\s+endeavor": 3,
    r"\bsubject\s+to\s+review\b": 3,
    # LOW‐RISK / caution indicators
    r"\bunless\s+otherwise\s+agreed\b": 1,
    r"\bbest\s+efforts\b": 1,
}

# 3. Global‐Contract Checks (applies across entire text)
GLOBAL_RISK_RULES = {
    "Missing Indemnification Clause": {
        "pattern": re.compile(r"indemnif", re.IGNORECASE),
        "severity": 20,  # Weight in overall risk meter
        "description": "No indemnification language found."
    },
    "Missing Governing Law Clause": {
        "pattern": re.compile(r"Governing Law", re.IGNORECASE),
        "severity": 15,
        "description": "No 'Governing Law' clause detected."
    },
    "Missing Termination Clause": {
        "pattern": re.compile(r"termination\s+for\s+convenience|termination\s+by\s+either\s+party", re.IGNORECASE),
        "severity": 15,
        "description": "No clear termination‐for‐convenience clause found."
    },
    # You can add more global checks here (e.g., missing 'Renewal Notice', missing 'Confidentiality')
}

# ============ STEP 1: PDF Text Extraction ============

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    # If extracted text is extremely short (possible scanned PDF), fallback to OCR
    if len(text.strip()) < 100:
        try:
            from pdf2image import convert_from_path
            import pytesseract
            from PIL import Image
            pages = convert_from_path(pdf_path, dpi=300)
            ocr_text = ""
            for page_im in pages:
                ocr_text += pytesseract.image_to_string(page_im)
            return ocr_text
        except ImportError:
            # OCR dependencies not installed or poppler missing; return whatever text we have
            return text
    return text

# ============ STEP 2: Sliding Window Chunking ============

def sliding_window_chunks(text, max_chars=6000, overlap=1000):
    """
    Splits text into overlapping chunks. Ensures no infinite loop.
    """
    chunks = []
    start = 0
    text_length = len(text)
    while start < text_length:
        end = min(start + max_chars, text_length)
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        if end == text_length:
            break
        start += max_chars - overlap
    return chunks

# ============ STEP 3: Risk & Loophole Detection ============

def detect_clause_risk_and_loopholes(clause_text):
    """
    Returns:
      - risk_score: int (sum of matched keyword weights, capped at 5)
      - clause_flags: list of (reason, severity_label) for each matched pattern
      - clause_loopholes: list of sentences or phrases indicating potential ambiguity
    """
    risk_score = 0
    clause_flags = []
    clause_loopholes = []

    # Check each keyword pattern
    for pattern_str, weight in RISK_KEYWORDS.items():
        pattern = re.compile(pattern_str, re.IGNORECASE)
        if pattern.search(clause_text):
            risk_score = max(risk_score, weight)
            # Determine severity label
            if weight >= 5:
                label = "HIGH"
            elif weight >= 3:
                label = "MEDIUM"
            else:
                label = "LOW"
            clause_flags.append({
                "pattern": pattern_str,
                "severity": label,
                "description": f"Matched pattern '{pattern_str}'"
            })

            # For loophole detection: if it's ambiguity keyword, capture snippet
            if weight <= 3:  # treat 'may', 'could', 'reasonable endeavors' as loopholes
                clause_loopholes.append(f"Ambiguous phrasing: '{pattern.search(clause_text).group(0)}'")

    # If no patterns matched, risk_score remains 0 => "NONE"
    if risk_score == 0:
        severity_label = "NONE"
    elif risk_score <= 1:
        severity_label = "LOW"
    elif risk_score <= 3:
        severity_label = "MEDIUM"
    else:
        severity_label = "HIGH"

    return severity_label, clause_flags, clause_loopholes

def detect_global_risks(full_text):
    """
    Runs GLOBAL_RISK_RULES over the full text to catch missing clauses.
    Returns:
      - global_flags: list of { name, severity (int), description }
    """
    global_flags = []
    for name, rule in GLOBAL_RISK_RULES.items():
        if not rule["pattern"].search(full_text):
            global_flags.append({
                "name": name,
                "severity": rule["severity"],
                "description": rule["description"]
            })
    return global_flags

# ============ STEP 4: Clean AI Output ============

def clean_response(text):
    lines = text.strip().split("\n")
    unwanted_phrases = ["okay", "here's", "this excerpt", "clause by clause", "please note", "it is important"]
    return "\n".join(
        line for line in lines if not any(p.lower() in line.lower() for p in unwanted_phrases)
    ).strip()

# ============ STEP 5: Analyze Individual Chunk ============
def safe_gemini_generate(prompt):
    """
    Wraps model.generate_content, catching key‐expired/invalid errors
    and returning a placeholder instead of raising.
    """
    try:
        resp = model.generate_content(prompt)
        return clean_response(resp.text)
    except Exception as e:
        msg = str(e)
        if "API key expired" in msg or "API_KEY_INVALID" in msg:
            return "[AI ANALYSIS UNAVAILABLE – API key expired or invalid]"
        return f"[AI ANALYSIS ERROR: {msg}]"

def analyze_chunk(chunk, context=None):
    """
    Calls Gemini to analyze a contract chunk, with Indian legal context.
    Returns the cleaned response text.
    """
    # Prepend context if available
    context_str = f"Context from earlier:\n{context}\n\n" if context else ""
    prompt = f"""
You are a knowledgeable legal advisor specializing in Indian contracts. Here is one section (clause) of the contract:

\"\"\"{chunk}\"\"\"

1. Summarize this section in simple, plain-English (but keep an official tone).  
   - Who are the parties mentioned?  
   - What are their main obligations or rights?  
   - Are there any “if this happens, that happens” rules (e.g., termination events)?  
   - Point out any ambiguous words or phrases (e.g., “unsuitable,” “may”) and explain why they could be confusing under Indian law.

2. Conclude with a one-sentence takeaway in bullet form, as if you were explaining to a business manager.

Format your answer as:

Parties: …
Obligations: …
Termination Triggers: …
Ambiguities/Risks (India): …
Takeaway: ...
etc, """
    try:
        response = model.generate_content(prompt)
        return clean_response(response.text)
    except Exception as e:
        return f"Error analyzing chunk (length {len(chunk)}): {str(e)}"

# ============ STEP 6: Full Document and Clause-Based Summarization with Risk Features ============

def summarize_contract(pdf_path):
    print("[*] Extracting text from PDF...")
    full_text = extract_text_from_pdf(pdf_path)

    # Global risk checks
    print("[*] Detecting global contract-level risks...")
    global_flags = detect_global_risks(full_text)

    # Attempt a full-document summary if the contract is not too long
    allow_full_summary = len(full_text) <= 30000
    full_doc_summary = ""
    if allow_full_summary:
        try:
            print("[*] Generating full-document summary...")
            full_summary_prompt = f"""
You are a senior legal advisor and contract analyst. Analyze the complete contract text below and provide a comprehensive, structured analysis:

\"\"\"{full_text}\"\"\"

Provide a detailed analysis in the following structured format:

**CONTRACT OVERVIEW:**
- Contract title and type
- Primary purpose and scope
- Effective date and duration
- Governing law and jurisdiction

**PARTIES ANALYSIS:**
- Complete list of all parties with full names, addresses, and roles
- Legal entity types (corporation, LLC, individual, etc.)
- Key contacts and authorized representatives
- Any parent companies, subsidiaries, or affiliates mentioned

**FINANCIAL TERMS:**
- Total contract value and payment structure
- Payment schedules, milestones, and methods
- Pricing mechanisms (fixed, variable, escalation clauses)
- Penalties, late fees, and financial remedies
- Currency and exchange rate provisions

**TIMELINE & MILESTONES:**
- Contract commencement and expiration dates
- Key delivery dates and performance milestones
- Renewal options and notice requirements
- Critical deadlines and time-sensitive obligations

**SCOPE OF WORK:**
- Detailed description of products, services, or deliverables
- Performance standards and acceptance criteria
- Quality requirements and specifications
- Delivery terms and locations

**RISK ASSESSMENT:**
- High-risk clauses and potential legal issues
- Liability limitations and indemnification terms
- Insurance requirements and coverage gaps
- Compliance obligations and regulatory risks
- Force majeure and business continuity provisions

**TERMINATION & DISPUTE RESOLUTION:**
- Termination triggers and procedures
- Notice requirements and cure periods
- Post-termination obligations and survival clauses
- Dispute resolution mechanisms (arbitration, litigation, mediation)
- Governing law and venue provisions

**KEY RECOMMENDATIONS:**
- Critical action items and immediate concerns
- Suggested contract amendments or clarifications
- Risk mitigation strategies
- Compliance requirements and deadlines

Provide specific details, exact dates, amounts, and actionable insights. Focus on business-critical information that stakeholders need to know.
"""

            full_doc_summary = clean_response(model.generate_content(full_summary_prompt).text.strip())
        except Exception as e:
            full_doc_summary = f"Failed to generate full summary: {str(e)}"
    else:
        full_doc_summary = (
            "For lengthy contracts, clause-by-clause analysis has been prioritized "
            "for better accuracy and insight. A consolidated summary will follow."
        )

    # Clause-wise analysis
    print("[*] Creating sliding-window chunks...")
    chunks = sliding_window_chunks(full_text)
    clauses = chunks[:]  # treat each chunk as a “clause” for returning

    print(f"[*] Analyzing {len(chunks)} chunks with Gemini + Risk Detector...\n")

    chunk_analyses = []
    clause_risk_levels = []
    clause_risk_flags = {}
    clause_loophole_map = {}
    clause_ai_summaries = []  # <-- Collect each chunk’s AI summary
    prev_context = ""

    for idx, chunk in enumerate(chunks):
        print(f"[+] Processing Chunk {idx + 1}/{len(chunks)}")

        # AI analysis for this chunk
        prompt = f"""
        You are an expert legal analyst specializing in contract law. Analyze the following contract section thoroughly:

        \"\"\"{chunk}\"\"\"

        Provide a comprehensive analysis in the following structured format:

        **PARTIES IDENTIFIED:**
        - List all parties mentioned with their roles and responsibilities
        - Include any subsidiaries, affiliates, or third parties referenced

        **KEY OBLIGATIONS & RESPONSIBILITIES:**
        - Detailed breakdown of what each party must do
        - Performance standards, deadlines, and deliverables
        - Payment terms, amounts, and schedules if mentioned

        **DATES & TIMELINE EVENTS:**
        - Extract ALL specific dates mentioned (format: YYYY-MM-DD)
        - Identify deadlines, milestones, renewal dates, notice periods
        - Note any time-sensitive obligations or events

        **TERMINATION & RENEWAL PROVISIONS:**
        - Termination triggers and conditions
        - Notice requirements and procedures
        - Renewal terms and automatic extensions
        - Post-termination obligations

        **RISK FACTORS & LEGAL CONCERNS:**
        - Ambiguous language that could cause disputes
        - One-sided or unfair terms
        - Missing protections or safeguards
        - Potential compliance issues

        **KEY TERMS & DEFINITIONS:**
        - Important technical terms and their meanings
        - Financial terms (pricing, penalties, etc.)
        - Legal concepts that need clarification

        **PRODUCTS/SERVICES/DELIVERABLES:**
        - Specific items, services, or deliverables mentioned
        - Quantities, specifications, quality standards
        - Delivery terms and acceptance criteria

        Be specific, detailed, and focus on actionable insights that would help a business understand their obligations and risks.
        """
        ai_summary = safe_gemini_generate(prompt)
        clause_ai_summaries.append(ai_summary)

        # Rule-based risk & loophole detection for this chunk
        risk_level, flags, loopholes = detect_clause_risk_and_loopholes(chunk)
        clause_risk_levels.append(risk_level)
        clause_risk_flags[idx + 1] = flags   # numbering starts at 1
        clause_loophole_map[idx + 1] = loopholes

        # Build combined chunk report (for consolidated summary)
        chunk_report = f"[Clause {idx + 1}]\n"
        chunk_report += "AI Analysis:\n" + ai_summary + "\n"
        chunk_report += f"Risk Level: {risk_level}\n"
        if flags:
            chunk_report += "Risk Flags:\n"
            for f in flags:
                chunk_report += f"- {f['severity']}: {f['description']}\n"
        if loopholes:
            chunk_report += "Potential Loopholes:\n"
            for lp in loopholes:
                chunk_report += f"- {lp}\n"
        chunk_analyses.append(chunk_report)

        prev_context = ai_summary  # feed this summary as context next

    combined_analysis = "\n\n".join(chunk_analyses)

    # Decide whether to generate a consolidated summary
    generate_consolidated = (not allow_full_summary) or ("Failed to generate" in full_doc_summary)
    final_summary = full_doc_summary

    if generate_consolidated:
        print("[*] Generating consolidated summary from clause-by-chapter analysis...")
        consolidation_prompt = f"""
You are a senior legal advisor and contract specialist. Based on the detailed clause-by-clause analysis below, create a comprehensive contract summary:

\"\"\"{combined_analysis}\"\"\"

Synthesize this information into a structured executive summary with the following sections:

**EXECUTIVE SUMMARY:**
- Contract type, purpose, and key business objectives
- Total value and duration
- Primary parties and their roles

**PARTIES & RELATIONSHIPS:**
- Complete party identification with roles and responsibilities
- Key contacts and decision-makers
- Corporate structure and affiliations

**FINANCIAL OVERVIEW:**
- Total contract value and payment terms
- Key financial milestones and deadlines
- Pricing structure and adjustment mechanisms
- Financial penalties and remedies

**PERFORMANCE OBLIGATIONS:**
- Detailed breakdown of each party's responsibilities
- Delivery schedules and performance standards
- Quality requirements and acceptance criteria
- Key performance indicators and metrics

**TIMELINE & CRITICAL DATES:**
- Contract effective and expiration dates
- Major milestones and delivery deadlines
- Renewal options and notice requirements
- Time-sensitive obligations and deadlines

**RISK ANALYSIS:**
- High-priority legal and business risks
- Liability exposure and limitations
- Insurance and indemnification requirements
- Regulatory compliance obligations
- Force majeure and business continuity risks

**TERMINATION & DISPUTE RESOLUTION:**
- Termination triggers and procedures
- Notice requirements and cure periods
- Post-termination obligations
- Dispute resolution mechanisms and governing law

**RECOMMENDATIONS & ACTION ITEMS:**
- Immediate action items and deadlines
- Recommended contract amendments
- Risk mitigation strategies
- Compliance requirements and monitoring needs

Provide specific, actionable insights with exact dates, amounts, and clear business implications. Focus on information that executives and stakeholders need for decision-making.
"""
        try:
            final_summary = safe_gemini_generate(consolidation_prompt)
        except Exception as e:
    # safe_gemini_generate already catches key errors,
    # but in case something else goes wrong:
            final_summary = f"[SUMMARY ERROR: {str(e)}]"


    # Compute overall Risk Meter
    numeric_map = {"HIGH": 5, "MEDIUM": 3, "LOW": 1, "NONE": 0}
    clause_scores = [numeric_map[lvl] for lvl in clause_risk_levels]
    avg_clause_score = sum(clause_scores) / max(len(clause_scores), 1)
    total_global_risk = sum(f["severity"] for f in global_flags)

    # Weigh clause risk (0–50) and global risk (0–50) to get meter 0–100
    normalized_clause_risk = min(avg_clause_score * 10, 50)   # scale 0–5 → 0–50
    normalized_global_risk = min(total_global_risk, 50)       # cap at 50
    risk_meter = int(normalized_clause_risk + normalized_global_risk)

    # Return seven items: clauses, clause_risk_levels, clause_risk_flags, clause_loophole_map,
    # global_flags, risk_meter, and final_summary, plus clause_ai_summaries as the eighth
    return (
        clauses,               # 1) list of clause texts
        clause_risk_levels,    # 2) ["NONE","MEDIUM","MEDIUM",…]
        clause_risk_flags,     # 3) { clause_idx: [ { … }, … ], … }
        clause_loophole_map,   # 4) { clause_idx: [ "Ambiguous phrasing: 'may'", … ], … }
        global_flags,          # 5) [ { "name": …, "severity": …, "description": … }, … ]
        risk_meter,            # 6) integer 0–100
        final_summary,         # 7) string summary (full or consolidated)
        clause_ai_summaries    # 8) list of AI summaries, one per clause
    )
# ============ STEP 6: Generate PDF Report ============



def extract_snippet(text: str, pattern: re.Pattern, window: int = 100) -> str:
    """
    Find the first match of `pattern` in `text`, then return
    up to `window` characters before and after it, but
    extend to nearest sentence boundaries to avoid cutting mid-sentence.
    """
    m = pattern.search(text)
    if not m:
        # fallback: return the first 200 chars
        return text[:200] + ("…" if len(text) > 200 else "")

    start, end = m.span()
    # expand to sentence boundaries
    pre = text[:start]
    post = text[end:]
    # find last period before start, or 0
    sent_start = pre.rfind('.') + 1 if '.' in pre else 0
    # find next period after end
    next_period = post.find('.')
    sent_end = end + next_period + 1 if next_period != -1 else len(text)

    snippet = text[sent_start:sent_end].strip()
    # ellipsize if we truncated
    if sent_start > 0:
        snippet = "… " + snippet
    if sent_end < len(text):
        snippet = snippet + " …"
    return snippet


import re
from weasyprint import HTML, CSS

def strip_markdown(text: str) -> str:
    """
    Enhanced markdown stripping with better formatting:
    1) Replace **bold** → <strong>…</strong>
    2) Replace *italic* → <em>…</em> (but not when part of bullet points)
    3) Convert leading '* ' lines into proper <ul><li>…</li></ul>, skipping empty bullets
    4) Clean up paragraph breaks and formatting
    5) Remove stray asterisks and clean up text
    """
    if not text or not text.strip():
        return ""
    
    # Remove multiple asterisks and clean up
    text = re.sub(r'\*{3,}', '', text)  # Remove triple or more asterisks
    
    # Handle bold text first (before handling bullets)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    
    # Split into lines for processing
    lines = text.split('\n')
    processed_lines = []
    in_list = False
    current_paragraph = []
    
    for line in lines:
        stripped = line.strip()
        
        # Handle bullet points
        if stripped.startswith('* ') or stripped.startswith('• '):
            # Close current paragraph if exists
            if current_paragraph:
                para_text = ' '.join(current_paragraph).strip()
                if para_text:
                    processed_lines.append(f"<p>{para_text}</p>")
                current_paragraph = []
            
            # Handle list
            content = stripped[2:].strip() if stripped.startswith('* ') else stripped[2:].strip()
            if content:
                if not in_list:
                    processed_lines.append("<ul>")
                    in_list = True
                # Clean content and escape HTML
                content = re.sub(r'\*(.+?)\*', r'<em>\1</em>', content)  # Italic within bullets
                safe_content = content.replace('<', '&lt;').replace('>', '&gt;')
                # Re-enable our formatting tags
                safe_content = safe_content.replace('&lt;strong&gt;', '<strong>').replace('&lt;/strong&gt;', '</strong>')
                safe_content = safe_content.replace('&lt;em&gt;', '<em>').replace('&lt;/em&gt;', '</em>')
                processed_lines.append(f"  <li>{safe_content}</li>")
        else:
            # Close list if we were in one
            if in_list:
                processed_lines.append("</ul>")
                in_list = False
            
            # Handle regular text
            if stripped:
                # Remove stray asterisks that aren't part of formatting
                cleaned = re.sub(r'(?<!\*)\*(?!\*)', '', stripped)  # Remove single asterisks
                cleaned = re.sub(r'\*(.+?)\*', r'<em>\1</em>', cleaned)  # Convert remaining italic
                current_paragraph.append(cleaned)
            else:
                # Empty line - end current paragraph
                if current_paragraph:
                    para_text = ' '.join(current_paragraph).strip()
                    if para_text:
                        processed_lines.append(f"<p>{para_text}</p>")
                    current_paragraph = []
    
    # Handle remaining content
    if in_list:
        processed_lines.append("</ul>")
    if current_paragraph:
        para_text = ' '.join(current_paragraph).strip()
        if para_text:
            processed_lines.append(f"<p>{para_text}</p>")
    
    # Join and clean up
    result = '\n'.join(processed_lines)
    
    # Final cleanup
    result = re.sub(r'<p>\s*</p>', '', result)  # Remove empty paragraphs
    result = re.sub(r'(\n\s*){3,}', '\n\n', result)  # Reduce multiple line breaks
    
    return result.strip()

def format_clause_summary(summary_text: str) -> str:
    """
    Format clause summaries with better structure and readability
    """
    if not summary_text or not summary_text.strip():
        return "<p>No summary available.</p>"
    
    # Split into sections based on common patterns
    sections = []
    current_section = []
    
    lines = summary_text.split('\n')
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Check if this is a section header (bold text or specific patterns)
        if (stripped.startswith('**') and stripped.endswith('**')) or \
           any(header in stripped.lower() for header in ['parties involved:', 'key responsibilities:', 'termination clauses:', 'legal risks:']):
            if current_section:
                sections.append('\n'.join(current_section))
                current_section = []
            current_section.append(stripped)
        else:
            current_section.append(stripped)
    
    if current_section:
        sections.append('\n'.join(current_section))
    
    # Format each section
    formatted_sections = []
    for section in sections:
        cleaned = strip_markdown(section)
        if cleaned:
            formatted_sections.append(cleaned)
    
    return '\n'.join(formatted_sections) if formatted_sections else "<p>No summary available.</p>"

def generate_pdf_report(
    clauses,
    clause_risk_levels,
    clause_risk_flags,
    clause_loophole_map,
    global_flags,
    risk_meter,
    summary_text,
    clause_ai_summaries,
    output_pdf_path="contract_report.pdf"
):
    """
    Generate a professional, enhanced PDF with improved formatting and styling
    """

    def risk_color(level):
        return {
            "HIGH": "#e74c3c",
            "MEDIUM": "#f39c12", 
            "LOW": "#27ae60",
            "NONE": "#95a5a6",
        }.get(level, "#95a5a6")

    def risk_bg_color(level):
        return {
            "HIGH": "#fdf2f2",
            "MEDIUM": "#fef9e7",
            "LOW": "#f0f9f4", 
            "NONE": "#f8f9fa",
        }.get(level, "#f8f9fa")

    def extract_may_snippet(clause_text, max_chars=350):
        """Enhanced snippet extraction with better context"""
        sentences = re.split(r'(?<=[\.\?\!])\s+', clause_text.strip())
        target_idx = None
        
        for i, sent in enumerate(sentences):
            if re.search(r"\bmay\b", sent, re.IGNORECASE):
                target_idx = i
                break
                
        if target_idx is None:
            snippet = clause_text.strip()[:max_chars]
            return snippet + ("…" if len(clause_text) > max_chars else "")
        
        # Get context around the target sentence
        start_idx = max(0, target_idx - 1)
        end_idx = min(len(sentences), target_idx + 3)  # More context
        snippet_text = " ".join(sentences[start_idx:end_idx]).strip()
        
        if len(snippet_text) > max_chars:
            # Center around the "may" keyword
            m = re.search(r"\bmay\b", snippet_text, re.IGNORECASE)
            if m:
                center = m.start()
                half = max_chars // 2
                s_pos = max(0, center - half)
                e_pos = min(len(snippet_text), center + half)
                truncated = snippet_text[s_pos:e_pos].strip()
                
                if s_pos > 0:
                    # Find word boundary
                    space_idx = truncated.find(' ')
                    if space_idx > 0:
                        truncated = truncated[space_idx:].strip()
                        truncated = "…" + truncated
                
                if e_pos < len(snippet_text):
                    space_idx = truncated.rfind(' ')
                    if space_idx > 0:
                        truncated = truncated[:space_idx] + "…"
                
                return truncated
            return snippet_text[:max_chars] + "…"
        return snippet_text

    def highlight_may(text):
        """Enhanced highlighting for 'may' keyword"""
        pattern = re.compile(r"\b(may)\b", re.IGNORECASE)
        return pattern.sub(
            r"<span class='highlight-may'>\1</span>",
            text,
            count=3  # Highlight up to 3 instances
        )

    def get_risk_icon(level):
        icons = {
            "HIGH": "🔴",
            "MEDIUM": "🟡", 
            "LOW": "🟢",
            "NONE": "⚪"
        }
        return icons.get(level, "⚪")

    # Build enhanced HTML with modern styling
    html_parts = [
        "<!DOCTYPE html>",
        "<html lang='en'><head><meta charset='utf-8'>",
        "<title>Contract Risk Assessment Report</title>",
        """
        <style>
          /* ============ Modern Base Styles ============ */
          @page { 
            margin: 0.8in; 
            counter-increment: page;
            @bottom-center {
              content: "Page " counter(page);
              font-size: 9pt;
              color: #6c757d;
              margin-top: 0.5in;
            }
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #2c3e50;
            line-height: 1.6;
            font-size: 11pt;
            margin: 0;
            padding: 0;
          }

          /* ============ Typography ============ */
          h1 {
            font-size: 28pt;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            color: #1a202c;
            text-align: center;
            padding-bottom: 1rem;
            border-bottom: 3px solid #3182ce;
          }
          
          h2 {
            font-size: 18pt;
            font-weight: 600;
            margin: 1.5rem 0 0.8rem 0;
            color: #2d3748;
            position: relative;
            padding-left: 1rem;
          }
          
          h2:before {
            content: '';
            position: absolute;
            left: 0;
            top: 0.3rem;
            width: 4px;
            height: 1.2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 2px;
          }
          
          h3 {
            font-size: 14pt;
            font-weight: 600;
            margin: 1rem 0 0.5rem 0;
            color: #2d3748;
          }
          
          p { 
            margin: 0.6rem 0; 
            text-align: justify;
            hyphens: auto;
          }
          
          ul {
            margin: 0.8rem 0;
            padding-left: 1.5rem;
          }
          
          li { 
            margin-bottom: 0.4rem;
            line-height: 1.5;
          }

          /* ============ Risk Score Section ============ */
          .risk-score-section {
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            margin: 1rem 0;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          
          .risk-score-section h2 {
            color: white;
            margin-bottom: 1rem;
            padding-left: 0;
          }
          
          .risk-score-section h2:before {
            display: none;
          }
          
          .risk-score {
            font-size: 48pt;
            font-weight: 800;
            margin: 0.5rem 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          
          .risk-description {
            font-size: 14pt;
            opacity: 0.9;
            margin-top: 0.5rem;
          }

          /* ============ Card-based Sections ============ */
          .section {
            margin: 1.5rem 0;
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
            page-break-inside: avoid;
          }

          /* ============ Summary Styling ============ */
          .summary {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border-left: 6px solid #4299e1;
            padding: 1.5rem;
            margin: 1rem 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
          
          .summary p:first-child { margin-top: 0; }
          .summary p:last-child { margin-bottom: 0; }

          /* ============ AI Summary Cards ============ */
          .ai-summary {
            background: #fefefe;
            border: 1px solid #e2e8f0;
            border-left: 6px solid #9f7aea;
            padding: 1.5rem;
            margin: 1rem 0;
            border-radius: 8px;
            page-break-inside: avoid;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          }
          
          .ai-summary h3 { 
            margin-top: 0; 
            color: #553c9a;
            font-size: 15pt;
          }
          
          .ai-summary p:last-child { margin-bottom: 0; }

          /* ============ Enhanced Badges and Pills ============ */
          .flag-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            color: white;
            font-size: 9pt;
            font-weight: 600;
            margin: 0.2rem 0.4rem 0.2rem 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .flag-badge.HIGH { 
            background: linear-gradient(135deg, #fc8181 0%, #e53e3e 100%);
          }
          .flag-badge.MEDIUM { 
            background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
          }
          .flag-badge.LOW { 
            background: linear-gradient(135deg, #68d391 0%, #38a169 100%);
          }
          .flag-badge.NONE { 
            background: linear-gradient(135deg, #a0aec0 0%, #718096 100%);
          }

          /* ============ Risk Heatmap ============ */
          .heatmap-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
          }
          
          .heatmap-item {
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            border: 2px solid transparent;
          }

          /* ============ Enhanced Clause Snippets ============ */
          .clause-snippet {
            background: #fafafa;
            border: 1px solid #e2e8f0;
            border-left: 6px solid #ed8936;
            padding: 1.5rem;
            margin: 1.5rem 0;
            border-radius: 8px;
            page-break-inside: avoid;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
          
          .clause-snippet h3 {
            margin-top: 0;
            color: #2d3748;
            font-size: 14pt;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .snippet-text {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 10pt;
            line-height: 1.5;
            border: 1px solid #e2e8f0;
            margin: 0.8rem 0;
          }

          /* ============ Enhanced Highlighting ============ */
          .highlight-may {
            background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
            color: #c53030;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
            border: 1px solid #fc8181;
            text-transform: uppercase;
            font-size: 9pt;
            letter-spacing: 0.5px;
          }

          /* ============ Loophole Warnings ============ */
          .loophole {
            background: linear-gradient(135deg, #fed7d7 0%, #fbb6ce 100%);
            border: 1px solid #f687b3;
            padding: 0.8rem;
            margin: 0.5rem 0;
            border-radius: 6px;
            font-style: italic;
            color: #c53030;
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .loophole-icon {
            font-size: 16pt;
            flex-shrink: 0;
          }

          /* ============ Responsive Tables ============ */
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
          
          .info-table th,
          .info-table td {
            padding: 0.8rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .info-table th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
          }

          /* ============ Print Optimizations ============ */
          @media print {
            .section { page-break-inside: avoid; }
            .clause-snippet { page-break-inside: avoid; }
            .ai-summary { page-break-inside: avoid; }
          }

          /* ============ Utility Classes ============ */
          .text-center { text-align: center; }
          .text-muted { color: #6c757d; }
          .font-weight-bold { font-weight: 600; }
          .mb-0 { margin-bottom: 0; }
          .mt-2 { margin-top: 1rem; }
        </style>
        """,
        "</head><body>"
    ]

    # ==== 1. Enhanced Title ====
    html_parts.append("<h1>Contract Risk Assessment Report</h1>")

    # ==== 2. Enhanced Risk Score Section ====
    if risk_meter > 70:
        risk_desc = "High Risk - Immediate attention required"
        score_color = "#e53e3e"
    elif risk_meter > 40:
        risk_desc = "Medium Risk - Review recommended" 
        score_color = "#ed8936"
    else:
        risk_desc = "Low Risk - Generally acceptable"
        score_color = "#38a169"

    html_parts.append(f"""
    <div class='risk-score-section'>
        <h2>Overall Risk Assessment</h2>
        <div class='risk-score' style='color: {score_color};'>{risk_meter}<span style='font-size: 24pt;'>/100</span></div>
        <div class='risk-description'>{risk_desc}</div>
    </div>
    """)

    # ==== 3. Enhanced Summary Section ====
    html_parts.append("<div class='section'><h2>Executive Summary</h2>")
    if summary_text and summary_text.strip():
        cleaned = strip_markdown(summary_text)
        html_parts.append(f"<div class='summary'>{cleaned}</div>")
    else:
        html_parts.append("<div class='summary'><p>No executive summary available.</p></div>")
    html_parts.append("</div>")

    # ==== 4. Enhanced Clause-wise AI Summaries ====
    html_parts.append("<div class='section'><h2>Detailed Clause Analysis</h2>")
    if clause_ai_summaries:
        for idx, ai_sum in enumerate(clause_ai_summaries, start=1):
            risk_level = clause_risk_levels[idx-1] if idx <= len(clause_risk_levels) else "NONE"
            risk_icon = get_risk_icon(risk_level)
            
            html_parts.append(f"""
            <div class='ai-summary'>
                <h3>{risk_icon} Clause {idx} Analysis 
                    <span class='flag-badge {risk_level}'>{risk_level} Risk</span>
                </h3>
                {format_clause_summary(ai_sum)}
            </div>
            """)
    else:
        html_parts.append("<p class='text-muted'>No detailed clause analysis available.</p>")
    html_parts.append("</div>")

    # ==== 5. Enhanced Global Flags ====
    html_parts.append("<div class='section'><h2>Contract-Level Risk Factors</h2>")
    if global_flags:
        for gf in global_flags:
            sev_label = "HIGH" if gf["severity"] >= 20 else "MEDIUM" if gf["severity"] >= 10 else "LOW"
            html_parts.append(f"""
            <div style='margin: 1rem 0; padding: 1rem; background: {risk_bg_color(sev_label)}; 
                        border-left: 6px solid {risk_color(sev_label)}; border-radius: 6px;'>
                <div style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;'>
                    <span class='flag-badge {sev_label}'>{sev_label}</span>
                    <strong style='color: {risk_color(sev_label)};'>{gf['name']}</strong>
                </div>
                <p style='margin: 0; color: #4a5568;'>{gf['description']}</p>
            </div>
            """)
    else:
        html_parts.append("<p class='text-muted'>No contract-level risk factors identified.</p>")
    html_parts.append("</div>")

    # ==== 6. Enhanced Risk Heatmap ====
    html_parts.append("<div class='section'><h2>Risk Distribution Overview</h2>")
    html_parts.append("<div class='heatmap-grid'>")
    for idx, level in enumerate(clause_risk_levels, start=1):
        bg_color = risk_bg_color(level)
        text_color = risk_color(level)
        icon = get_risk_icon(level)
        html_parts.append(f"""
        <div class='heatmap-item' style='background: {bg_color}; color: {text_color}; border-color: {text_color};'>
            <div style='font-size: 18pt; margin-bottom: 0.5rem;'>{icon}</div>
            <div>Clause {idx}</div>
            <div style='font-size: 9pt; text-transform: uppercase; letter-spacing: 1px;'>{level}</div>
        </div>
        """)
    html_parts.append("</div></div>")

    # ==== 7. Enhanced Risky Clause Snippets ====
    html_parts.append("<div class='section'><h2>Risk Analysis Details</h2>")
    any_risky = False
    for idx, level in enumerate(clause_risk_levels, start=1):
        flags = clause_risk_flags.get(idx, [])
        if flags and level != "NONE":
            any_risky = True
            clause_text = clauses[idx - 1]
            snippet = extract_may_snippet(clause_text)
            highlighted = highlight_may(snippet)
            icon = get_risk_icon(level)

            html_parts.append(f"""
            <div class='clause-snippet'>
                <h3>{icon} Clause {idx} Risk Analysis</h3>
                <div class='snippet-text'>{highlighted}</div>
                <div style='margin-top: 1rem;'>
            """)
            
            for f in flags:
                pat = re.sub(r"\\b|\b|'","", f["pattern"]).strip()
                keyword = pat.replace("\\s+", " ")
                sev = f["severity"]
                html_parts.append(f"""
                <div style='margin: 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;'>
                    <span class='flag-badge {sev}'>{sev}</span>
                    <span>Flagged keyword: <code style='background: #f1f5f9; padding: 2px 6px; border-radius: 3px;'>"{keyword}"</code></span>
                </div>
                """)
            html_parts.append("</div></div>")
    
    if not any_risky:
        html_parts.append("<p class='text-muted'>No significant risk patterns detected in individual clauses.</p>")
    html_parts.append("</div>")

    # ==== 8. Enhanced Loophole Detection ====
    html_parts.append("<div class='section'><h2>Potential Legal Loopholes</h2>")
    any_loophole = False
    for idx, loopholes in clause_loophole_map.items():
        if loopholes:
            any_loophole = True
            icon = get_risk_icon("HIGH")
            html_parts.append(f"""
            <div class='clause-snippet'>
                <h3>{icon} Clause {idx} - Potential Issues</h3>
            """)
            for lp in loopholes:
                html_parts.append(f"""
                <div class='loophole'>
                    <span class='loophole-icon'>⚠️</span>
                    <div>{lp}</div>
                </div>
                """)
            html_parts.append("</div>")
    
    if not any_loophole:
        html_parts.append("<p class='text-muted'>No obvious legal loopholes detected.</p>")
    html_parts.append("</div>")

    # ==== 9. Report Generation Info ====
    html_parts.append(f"""
    <div class='section' style='margin-top: 2rem; text-align: center; background: #f8f9fa;'>
        <p class='text-muted' style='margin: 0;'>
            Report generated on {__import__('datetime').datetime.now().strftime('%B %d, %Y at %I:%M %p')}
            <br>
            <small>This automated analysis should be reviewed by qualified legal counsel.</small>
        </p>
    </div>
    """)

    html_parts.append("</body></html>")

    # Generate PDF with enhanced styling
    html_content = "\n".join(html_parts)
    
    try:
        HTML(string=html_content).write_pdf(
            output_pdf_path,
            stylesheets=[CSS(string="""
                @page { margin: 0.8in; }
                body { -webkit-print-color-adjust: exact; }
            """)]
        )
        print(f"✅ Enhanced PDF report successfully generated: {output_pdf_path}")
        return True
    except Exception as e:
        print(f"❌ Error generating PDF: {str(e)}")
        return False
# ============ STEP 7: Entry Point ============
if __name__ == "__main__":
    import sys

    # Check if a PDF file path is provided as argument, otherwise use default
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        # Check for temp_contract.pdf first, then fallback to your_contract.pdf
        if os.path.exists("temp_contract.pdf"):
            pdf_path = "temp_contract.pdf"
        elif os.path.exists("contract_two.pdf"):
            pdf_path = "contract_two.pdf"
        else:
            pdf_path = "your_contract.pdf"

    if not os.path.exists(pdf_path):
        print(f"[ERROR] PDF file not found: {pdf_path}")
        sys.exit(1)

    try:
        print(f"[*] Processing PDF: {pdf_path}")
        (
            clauses,
            clause_risk_levels,
            clause_risk_flags,
            clause_loophole_map,
            global_flags,
            risk_meter,
            summary_text,
            clause_ai_summaries
        ) = summarize_contract(pdf_path)

        # Write text summary for API consumption
        output_file = "contract_summary.txt"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(summary_text)
        print(f"[*] Summary written to {output_file}")

        # Optionally generate PDF report
        generate_pdf_report(
            clauses=clauses,
            clause_risk_levels=clause_risk_levels,
            clause_risk_flags=clause_risk_flags,
            clause_loophole_map=clause_loophole_map,
            global_flags=global_flags,
            risk_meter=risk_meter,
            summary_text=summary_text,
            clause_ai_summaries=clause_ai_summaries,
            output_pdf_path="contract_analysis_report.pdf"
        )

    except Exception as e:
        print(f"[ERROR] Failed to process PDF: {str(e)}")
        sys.exit(1)
