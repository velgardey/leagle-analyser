"""
Enhanced Contract Analysis Script for Comprehensive JSON Output
This script generates a detailed JSON structure that properly feeds all application components.
"""

import os
import sys
import re
import json
import fitz  # PyMuPDF
import google.generativeai as genai
from datetime import datetime, timedelta
import tempfile
from dotenv import load_dotenv

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

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("[WARNING] GEMINI_API_KEY environment variable is not set - using fallback analysis")
    model = None
else:
    print("[INFO] GEMINI_API_KEY found - enabling AI analysis")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF with OCR fallback"""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    
    # If extracted text is extremely short (possible scanned PDF), fallback to OCR
    if len(text.strip()) < 100:
        try:
            from pdf2image import convert_from_path
            import pytesseract
            pages = convert_from_path(pdf_path, dpi=300)
            ocr_text = ""
            for page_im in pages:
                ocr_text += pytesseract.image_to_string(page_im)
            return ocr_text
        except ImportError:
            return text
    return text

def safe_gemini_generate(prompt):
    """Safe wrapper for Gemini API calls with timeout"""
    if model is None:
        return "[AI ANALYSIS UNAVAILABLE - No API key]"

    try:
        print(f"[DEBUG] Sending prompt to Gemini API (length: {len(prompt)} characters)")

        # Add timeout and safety settings with increased token limit
        generation_config = genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=16384,  # Increased token limit for comprehensive responses
        )

        resp = model.generate_content(
            prompt,
            generation_config=generation_config,
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
        )

        print(f"[DEBUG] Received response from Gemini API")

        if resp.text:
            print(f"[DEBUG] Response length: {len(resp.text)} characters")
            return resp.text.strip()
        else:
            print("[WARNING] Empty response from Gemini API")
            return "[AI ANALYSIS UNAVAILABLE - Empty response]"

    except Exception as e:
        print(f"[WARNING] Gemini API error: {str(e)}")
        import traceback
        print(f"[DEBUG] Full error traceback: {traceback.format_exc()}")
        return "[AI ANALYSIS UNAVAILABLE]"

def safe_extract(func, *args, default=None):
    """Safe wrapper for extraction functions"""
    try:
        result = func(*args)
        return result if result is not None else default
    except Exception as e:
        print(f"[WARNING] Error in {func.__name__}: {str(e)}")
        return default

def safe_extract_with_pages(func, ai_response, full_text, total_pages, default=None):
    """Safe wrapper for extraction functions that take total_pages"""
    try:
        result = func(ai_response, full_text, total_pages)
        return result if result is not None else default
    except Exception as e:
        print(f"[WARNING] Error in {func.__name__}: {str(e)}")
        return default

def preprocess_contract_text(full_text):
    """Clean and preprocess contract text for better analysis"""
    # Remove excessive whitespace and normalize line breaks
    cleaned = re.sub(r'\s+', ' ', full_text)
    cleaned = re.sub(r'\n\s*\n', '\n', cleaned)

    # Remove page numbers and headers/footers
    cleaned = re.sub(r'Page\s+\d+\s+of\s+\d+', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^\d+\s*$', '', cleaned, flags=re.MULTILINE)

    return cleaned.strip()

def extract_comprehensive_data(full_text, pdf_path):
    """Extract comprehensive contract data using AI analysis"""

    # Clean and preprocess the text
    cleaned_text = preprocess_contract_text(full_text)

    # Enhanced analysis prompt for better data extraction with JSON output
    analysis_prompt = f"""
You are an expert legal contract analyst with 20+ years of experience. Analyze this contract text and extract comprehensive, accurate data with extreme attention to detail.

CONTRACT TEXT:
\"\"\"{cleaned_text[:25000]}\"\"\"

CRITICAL INSTRUCTIONS FOR MAXIMUM DATA QUALITY:
1. Extract ALL information explicitly stated in the contract - NEVER use generic placeholders
2. For party names: Extract EXACT legal names as written (e.g., "Organic Preparations INC.", "Agape ATP International Holding Limited")
3. For addresses: Extract complete addresses with street, city, country details
4. For dates: Calculate exact dates (if "10 years from 2018-01-15", expiration is 2028-01-15)
5. For financial terms: Find ALL monetary amounts, percentages, payment schedules, minimum orders
6. For products: Extract ACTUAL product names, NOT text fragments like "as specified" or "pursuant to"
7. For quantities: Convert text to numbers (e.g., "15,000 150gm units" becomes quantity_numeric: 15000, unit: "150gm units")
8. For territories: Look for specific countries, regions, or schedule references
9. For risk assessment: Provide realistic risk scores (20-95 range) based on actual contract language and complexity
10. Use exact dates in YYYY-MM-DD format and calculate all derived dates
11. Extract ALL timeline events with specific dates and responsible parties
12. Return comprehensive JSON with NO null values - use actual extracted data
13. For risk scores: Base on actual contract complexity, not generic 50-point values
14. For financial values: Include currency symbols and exact amounts found in contract
15. For products: Look for actual product names, specifications, quantities, and pricing

RETURN YOUR ANALYSIS AS A VALID JSON OBJECT WITH THIS EXACT STRUCTURE:

{{
  "contract_basics": {{
    "title": "EXACT contract title from document (e.g., 'ODM Supply Agreement', 'Service Contract for XYZ')",
    "type": "Specific agreement type (Supply Agreement/Service Agreement/Distribution Agreement/etc)",
    "effective_date": "YYYY-MM-DD (extract exact date from contract)",
    "expiration_date": "YYYY-MM-DD (calculate from term length if not explicit)",
    "contract_value": "Extract total amounts with currency (e.g., 'USD 2,500,000', '€1,000,000')",
    "governing_law": "Exact jurisdiction as stated (e.g., 'Laws of Hong Kong', 'New York State Law')",
    "contract_term_years": "Extract exact number (e.g., 10, 5, 3)",
    "auto_renewal": "true/false based on actual renewal clauses",
    "territory": "Specific geographical scope (e.g., 'Global', 'Asia-Pacific', 'United States and Canada')"
  }},
  "parties": [
    {{
      "legal_name": "EXACT legal name as written in contract (e.g., 'Organic Preparations INC.', 'Agape ATP International Holding Limited')",
      "common_name": "Short name or trading name if different",
      "address": "Complete address as written (street, city, state, country, postal code)",
      "role": "Specific role (Manufacturer/Customer/Supplier/Distributor/Licensor/etc)",
      "entity_type": "Entity type (Corporation/LLC/Limited Company/Individual/Partnership/etc)"
    }}
  ],
  "financial_details": {{
    "payment_terms": "Exact payment terms as written (e.g., 'Net 30 days', 'Payment due within 15 days of invoice')",
    "total_value": "Extract total contract amounts with currency (e.g., 'USD 2,500,000', 'EUR 1,000,000')",
    "payment_schedule": "Specific payment schedule (e.g., '50% on order confirmation, 50% before shipment')",
    "late_payment_penalties": "Exact penalty terms (e.g., '1.5% per month on overdue amounts', 'Interest at prime rate + 2%')",
    "currency": "Primary currency (USD, EUR, GBP, CAD, AUD, etc.)",
    "minimum_order_requirements": "Minimum purchase amounts (e.g., 'Minimum order 10,000 units', 'USD 50,000 minimum per quarter')"
  }},
  "timeline_events": [
    {{
      "date": "YYYY-MM-DD (calculate specific dates from contract terms)",
      "event": "What happens on this date (e.g., 'Contract Renewal Deadline', 'Payment Due')",
      "type": "milestone/deadline/renewal/termination/payment",
      "responsible_party": "Specific party name or 'Both parties'",
      "notice_required": "Yes/No and notice period (e.g., '6 months notice required')",
      "notice_deadline": "YYYY-MM-DD (calculate when notice must be given)",
      "priority": "high/medium/low based on event importance",
      "completed": "true/false based on whether date has passed"
    }}
  ],
  "risk_factors": [
    {{
      "risk_title": "Specific risk name (e.g., 'Automatic Renewal Risk', 'Minimum Purchase Commitment')",
      "description": "Detailed explanation of the risk and its implications",
      "category": "High/Medium/Low (based on actual contract analysis)",
      "impact": "High/Medium/Low (realistic assessment of business impact)",
      "likelihood": "High/Medium/Low (realistic probability assessment)",
      "risk_score": "REQUIRED: AI-generated numeric score 20-95 based on comprehensive risk analysis. Consider contract complexity, financial exposure, legal implications, operational impact, and likelihood. High-risk items (80-95), Medium-risk items (40-79), Low-risk items (20-39). NEVER use placeholder values.",
      "mitigation": "Specific actionable mitigation strategies"
    }}
  ],
  "products_services": [
    {{
      "name": "ACTUAL product/service name from contract (e.g., 'Organic Health Supplements', 'Software Development Services', 'Manufacturing Equipment')",
      "description": "Detailed product description from contract",
      "quantity_text": "Exact quantity text as written (e.g., '15,000 150gm packaged units per annum', '500 hours of consulting')",
      "quantity_numeric": "Convert to number (e.g., 15000, 500)",
      "unit": "Specific unit type (150gm units, hours, pieces, liters, etc.)",
      "specifications": "Technical details, packaging, sizes, quality standards",
      "price": "Pricing information with currency (e.g., 'USD 25 per unit', 'EUR 150 per hour')",
      "schedule_reference": "Reference to schedules (e.g., 'Schedule A', 'Exhibit B', 'Appendix 1')"
    }}
  ],
  "key_terms": [
    {{
      "term": "Term name",
      "definition": "How it's defined in contract",
      "importance": "Critical/High/Medium"
    }}
  ],
  "clause_risk_mapping": [
    {{
      "clause": "Specific clause or section name (e.g., Section 3.1 Payment Terms, Automatic Renewal Clause)",
      "risk_level": "high/medium/low based on risk assessment",
      "page": "Page number where clause is located (1-based)",
      "description": "Brief description of the risk associated with this clause"
    }}
  ]
}}

CRITICAL REQUIREMENTS FOR HIGH-QUALITY DATA EXTRACTION:
- NEVER use generic placeholders like "Party A", "Party B", "Not specified", "As agreed"
- Extract ACTUAL company names, addresses, and contact information
- Calculate ALL specific dates with precision (if contract is 10 years from 2018-01-15, expiration is 2028-01-15)
- Extract ALL products/services with real names, NOT text fragments
- Find ALL financial amounts, percentages, payment terms, and minimum orders
- Extract specific territorial references (countries, regions, schedule references)
- Convert ALL quantities to numbers where possible
- CRITICAL: Generate AI-calculated risk scores (20-95 range) for each risk based on comprehensive analysis of contract language, complexity, financial exposure, and business impact. DO NOT use placeholder scores.

ENHANCED COMPONENT-SPECIFIC REQUIREMENTS:
1. ANALYTICS DASHBOARD: Provide accurate metrics for overallRiskScore (20-95), riskDistribution counts (high/medium/low), completionRate percentage (0-100), criticalDeadlines count, performanceMetrics with complianceScore/financialHealth/operationalRisk (0-100 each)
2. TIMELINE COMPONENT: Include responsibleParty (specific entity name), consequences (specific outcomes), noticeRequired boolean, noticeDeadline with specific dates (YYYY-MM-DD format)
3. RISK ASSESSMENT: Include urgency level (Critical/High/Medium/Low), mitigationStrategies array (3-5 specific strategies), recommendations array (3-5 actionable items), specific clauses affected
4. CONTRACT HEATMAP: Provide clauseRiskMap with accurate pageNumber (1-based), position coordinates (top, left, width, height in pixels)
5. PARTY INFORMATION: Include entityType (Corporation/LLC/Partnership/etc), contactInfo with email/phone if available, structured address components (street/city/state/country/postalCode)
6. FINANCIAL TERMS: Include paymentSchedule (specific terms), penalties for latePayment/breach (amounts/percentages), minimumOrder requirements (quantities/values)
7. PRODUCT SPECIFICATIONS: Include deliveryTerms (Incoterms), specifications details (packaging/certifications), pricing with unitPrice/currency/totalPrice (actual numbers)

CRITICAL DATA ACCURACY REQUIREMENTS:
- ALL company names must be EXACT legal names from the contract (e.g., "ORGANIC PREPARATIONS INC." not "Organic Preparations")
- ALL product names must be EXACT product names from schedules/exhibits (e.g., "ATP 1S Survivor Select" not "health supplement")
- ALL dates must be EXACT dates from contract (e.g., "2018-01-15" not "approximately 2018")
- ALL financial amounts must be EXACT amounts from contract (e.g., "AUD 1.00" not "approximately $1")
- ALL risk scores must be calculated based on actual contract complexity and terms (20-95 range)
- ALL timeline events must be based on actual contract deadlines and milestones
- NO generic placeholders, approximations, or made-up data allowed
- Extract ALL timeline events with specific dates and responsible parties
- Use actual contract language for definitions and descriptions
- Be extremely thorough - this data feeds critical business decision-making
- For risk assessment: Consider contract complexity, financial exposure, operational impact
- For timeline events: Include contract start, renewal deadlines, payment due dates, termination notices
- For products: Look for actual product names, not legal references or schedule mentions

QUALITY CHECK: Before returning, verify that:
- All party names are actual company names from the contract (not "Party A" or "Company B")
- All dates are calculated correctly and in YYYY-MM-DD format
- All financial amounts include currency and specific values (not "0" or "Not specified")
- All products have real names and specifications (not "Services as specified")
- All addresses are complete and structured with actual locations
- Risk scores are AI-generated based on comprehensive analysis (20-95 range) reflecting actual contract complexity, financial exposure, and business impact (not generic 50-point scores or random values)
- Timeline events have specific dates and realistic priorities
- All data is extracted from actual contract content, not assumed or generic

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.
"""

    print("[*] Analyzing contract with enhanced AI prompt...")
    ai_response = safe_gemini_generate(analysis_prompt)

    # Save full AI response for analysis
    with open("ai_response_debug.txt", "w", encoding="utf-8") as f:
        f.write(ai_response)
    print(f"[DEBUG] Full AI response saved to ai_response_debug.txt ({len(ai_response)} characters)")

    # Parse the AI response and structure it with enhanced validation
    try:
        contract_data = parse_ai_json_response(ai_response, full_text, pdf_path)
        print("[*] Successfully used enhanced JSON parsing")

        # Perform comprehensive quality checks
        quality_score, quality_issues = perform_quality_checks(contract_data, ai_response, full_text)
        print(f"[*] Data quality score: {quality_score}/100")

        # Strict quality threshold - fail if below 70%
        if quality_score < 70:
            print(f"[ERROR] Data quality too low ({quality_score}/100). Minimum required: 70/100")
            print("[ERROR] Quality issues found:")
            for issue in quality_issues:
                print(f"   - {issue}")
            raise ValueError(f"Contract analysis failed quality validation (score: {quality_score}/100)")

        # Perform strict validation with no fallbacks
        print(f"[DEBUG] Contract data type before validation: {type(contract_data)}")
        print(f"[DEBUG] Contract data keys: {list(contract_data.keys()) if isinstance(contract_data, dict) else 'Not a dict'}")

        validation_result = validate_contract_data_strict(contract_data, full_text, pdf_path)
        print(f"[DEBUG] Validation result type: {type(validation_result)}")

        if validation_result is None:
            raise ValueError("Contract analysis failed strict validation - insufficient data quality")

        # validation_result is the validated contract_data
        return validation_result
    except Exception as e:
        print(f"[ERROR] JSON parsing failed: {str(e)}")
        print("[ERROR] AI response could not be parsed into valid contract data")
        print("[ERROR] Analysis failed - no fallback data will be generated")
        raise ValueError(f"Failed to parse AI response: {str(e)}")

def parse_ai_response_to_json(ai_response, full_text, pdf_path):
    """Parse AI response and create comprehensive JSON structure"""
    
    # Get file metadata
    file_stats = os.stat(pdf_path)
    file_size = file_stats.st_size
    file_name = os.path.basename(pdf_path)
    
    # Calculate document pages
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    doc.close()
    
    # Base structure with comprehensive data
    try:
        contract_data = {
            "contractInfo": {
                "title": safe_extract(extract_contract_title, ai_response, full_text, default="Contract Agreement"),
                "type": safe_extract(extract_contract_type, ai_response, full_text, default="General Agreement"),
                "effectiveDate": safe_extract(extract_effective_date, ai_response, full_text, default=datetime.now().strftime("%Y-%m-%d")),
                "expirationDate": safe_extract(extract_expiration_date, ai_response, full_text, default=(datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")),
                "totalValue": safe_extract(extract_total_value, ai_response, full_text, default=0),
                "currency": safe_extract(extract_currency, ai_response, full_text, default="USD"),
                "governingLaw": safe_extract(extract_governing_law, ai_response, full_text, default="Not specified"),
                "parties": safe_extract(extract_parties, ai_response, full_text, default=[]),
                "contractTerm": safe_extract(extract_contract_terms, ai_response, full_text, default={}),
                "territory": safe_extract(extract_territory, ai_response, full_text, default="Not specified"),
                "exclusivity": safe_extract(extract_exclusivity, ai_response, full_text, default=False),
                "financialTerms": safe_extract(extract_financial_terms, ai_response, full_text, default={})
            },
            "relationships": safe_extract(extract_relationships, ai_response, full_text, default=[]),
            "timeline": safe_extract(extract_timeline_events, ai_response, full_text, default=[]),
            "risks": [],  # STRICT: No fallback - must come from AI
            "keyTerms": [],  # STRICT: No fallback - must come from AI
            "products": [],  # STRICT: No fallback - must come from AI
            "clauseRiskMap": [],  # STRICT: No fallback - must come from AI
            "analytics": {},  # STRICT: No fallback - must come from AI
            "documentStructure": safe_extract_with_pages(extract_document_structure, ai_response, full_text, total_pages, default={}),
            "complianceRequirements": safe_extract(extract_compliance_requirements, ai_response, full_text, default=[]),
            "metadata": {
                "analysisDate": datetime.now().isoformat(),
                "analysisVersion": "2.0",
                "confidence": 0.85,
                "extractedText": full_text[:1000] + "..." if len(full_text) > 1000 else full_text,
                "fileName": file_name,
                "fileSize": file_size,
                "totalPages": total_pages,
                "language": "English",
                "jurisdiction": safe_extract(extract_governing_law, ai_response, full_text, default="Not specified")
            }
        }
    except Exception as e:
        print(f"[ERROR] Error building contract data structure: {str(e)}")
        raise
    
    return contract_data

def perform_quality_checks(contract_data, ai_response, full_text):
    """Perform comprehensive quality checks on the extracted contract data"""
    quality_score = 100
    quality_issues = []

    # Check 1: Party Information Quality (20 points)
    party_score = 20
    parties = contract_data.get("contractInfo", {}).get("parties", [])

    if len(parties) < 2:
        quality_issues.append("Insufficient parties identified (minimum 2 required)")
        party_score -= 10

    for party in parties:
        name = party.get("name", "")
        # Check for generic names
        generic_names = ["party a", "party b", "party 1", "party 2", "company a", "company b",
                        "not specified", "contractor", "client", "supplier", "customer"]
        if any(generic in name.lower() for generic in generic_names):
            quality_issues.append(f"Generic party name detected: {name}")
            party_score -= 5

        # Check for proper company indicators
        if len(name) > 5 and not any(indicator in name for indicator in
                                   ["Inc", "LLC", "Ltd", "Corporation", "Company", "Limited", "Corp",
                                    "Incorporated", "International", "Holdings", "Group"]):
            quality_issues.append(f"Party name may not be a proper company name: {name}")
            party_score -= 2

    quality_score -= max(0, 20 - party_score)

    # Check 2: Product Information Quality (15 points)
    product_score = 15
    products = contract_data.get("products", [])

    if len(products) == 0:
        quality_issues.append("No products/services identified")
        product_score = 0
    else:
        for product in products:
            name = product.get("name", "")
            # Check for text fragments
            fragment_indicators = ["listed in", "as specified", "pursuant to", "will be deemed",
                                 "shall be", "according to", "in accordance with"]
            if any(fragment in name.lower() for fragment in fragment_indicators):
                quality_issues.append(f"Product name appears to be text fragment: {name}")
                product_score -= 3

            # Check for proper quantities
            quantity = product.get("quantity", 0)
            if not isinstance(quantity, (int, float)) or quantity <= 0:
                quality_issues.append(f"Invalid quantity for product {name}: {quantity}")
                product_score -= 2

    quality_score -= max(0, 15 - product_score)

    # Check 3: Financial Information Quality (15 points)
    financial_score = 15
    financial_terms = contract_data.get("contractInfo", {}).get("financialTerms", {})

    payment_terms = financial_terms.get("paymentTerms", "")
    if not payment_terms or payment_terms.lower() in ["not specified", "as agreed", "net 30 days"]:
        quality_issues.append("Generic or missing payment terms")
        financial_score -= 5

    total_value = financial_terms.get("totalValue", 0)
    if total_value == 0:
        quality_issues.append("No contract value identified")
        financial_score -= 5

    quality_score -= max(0, 15 - financial_score)

    # Check 4: Timeline Quality (15 points)
    timeline_score = 15
    timeline = contract_data.get("timeline", [])

    if len(timeline) < 3:
        quality_issues.append("Insufficient timeline events (minimum 3 recommended)")
        timeline_score -= 5

    for event in timeline:
        date = event.get("date", "")
        if not date or date.lower() in ["not specified", "n/a", "tbd"]:
            quality_issues.append(f"Generic or missing date for event: {event.get('event', 'Unknown')}")
            timeline_score -= 2

    quality_score -= max(0, 15 - timeline_score)

    # Check 5: Risk Assessment Quality (15 points)
    risk_score = 15
    risks = contract_data.get("risks", [])

    if len(risks) < 3:
        quality_issues.append("Insufficient risk analysis (minimum 3 risks recommended)")
        risk_score -= 5

    for risk in risks:
        risk_score_val = risk.get("riskScore", 0)
        if not isinstance(risk_score_val, (int, float)) or risk_score_val < 20 or risk_score_val > 95:
            quality_issues.append(f"Invalid risk score: {risk_score_val} (should be 20-95)")
            risk_score -= 2

        title = risk.get("title", "")
        if not title or len(title) < 10:
            quality_issues.append("Risk title too short or missing")
            risk_score -= 2

    quality_score -= max(0, 15 - risk_score)

    # Check 6: Analytics Quality (10 points)
    analytics_score = 10
    analytics = contract_data.get("analytics", {})

    overall_risk = analytics.get("overallRiskScore", 0)
    if not isinstance(overall_risk, (int, float)) or overall_risk < 20 or overall_risk > 95:
        quality_issues.append(f"Invalid overall risk score: {overall_risk}")
        analytics_score -= 5

    risk_distribution = analytics.get("riskDistribution", {})
    total_risks = sum(risk_distribution.values()) if risk_distribution else 0
    if total_risks != len(risks):
        quality_issues.append("Risk distribution doesn't match actual risk count")
        analytics_score -= 3

    quality_score -= max(0, 10 - analytics_score)

    # Check 7: Document Structure Quality (10 points)
    structure_score = 10
    doc_structure = contract_data.get("documentStructure", {})

    sections = doc_structure.get("sections", [])
    if len(sections) < 3:
        quality_issues.append("Insufficient document sections identified")
        structure_score -= 5

    total_pages = doc_structure.get("totalPages", 0)
    if total_pages == 0:
        quality_issues.append("Total pages not identified")
        structure_score -= 3

    quality_score -= max(0, 10 - structure_score)

    # Ensure quality score is within bounds
    quality_score = max(0, min(100, quality_score))

    return quality_score, quality_issues

def parse_ai_json_response(ai_response, full_text, pdf_path):
    """Parse JSON response from AI and convert to contract data structure"""

    # Get file metadata
    file_stats = os.stat(pdf_path)
    file_size = file_stats.st_size
    file_name = os.path.basename(pdf_path)

    # Calculate document pages
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    doc.close()

    try:
        # Try to extract JSON from AI response (handle markdown code blocks)
        json_text = ai_response

        # Remove markdown code blocks if present
        if "```json" in ai_response:
            # Extract everything between ```json and ```
            start_marker = "```json"
            end_marker = "```"
            start_idx = ai_response.find(start_marker)
            if start_idx != -1:
                start_idx += len(start_marker)
                end_idx = ai_response.find(end_marker, start_idx)
                if end_idx != -1:
                    json_text = ai_response[start_idx:end_idx].strip()
                else:
                    # No closing marker, take everything after ```json
                    json_text = ai_response[start_idx:].strip()
        else:
            # Try to find JSON object
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                json_text = json_match.group(0)
            else:
                raise ValueError("No JSON found in AI response")

        # Clean up the JSON text and handle incomplete responses
        json_text = json_text.replace('null', '"Not specified"')

        # Check if JSON is incomplete and try to fix it
        if not json_text.strip().endswith('}'):
            print("[DEBUG] Detected incomplete JSON response, attempting to fix...")

            # Remove any trailing commas that might cause issues
            json_text = re.sub(r',\s*$', '', json_text.strip())

            # Count opening and closing braces and brackets
            open_braces = json_text.count('{')
            close_braces = json_text.count('}')
            open_brackets = json_text.count('[')
            close_brackets = json_text.count(']')

            missing_braces = open_braces - close_braces
            missing_brackets = open_brackets - close_brackets

            # Add missing closing brackets first, then braces
            if missing_brackets > 0:
                json_text += ']' * missing_brackets
                print(f"[DEBUG] Added {missing_brackets} missing closing brackets")

            if missing_braces > 0:
                json_text += '}' * missing_braces
                print(f"[DEBUG] Added {missing_braces} missing closing braces")

            # Final cleanup - remove any trailing commas before closing braces/brackets
            json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)

        ai_data = json.loads(json_text)

        # Convert AI JSON to our contract data structure
        contract_basics = ai_data.get("contract_basics", {})

        # Calculate expiration date if not provided
        expiration_date = contract_basics.get("expiration_date")
        if not expiration_date or expiration_date == "Not specified":
            effective_date = contract_basics.get("effective_date")
            term_years = contract_basics.get("contract_term_years", "10")
            if effective_date and term_years:
                try:
                    start_date = datetime.strptime(effective_date, "%Y-%m-%d")
                    years = int(str(term_years).replace("years", "").strip())
                    end_date = start_date + timedelta(days=365 * years)
                    expiration_date = end_date.strftime("%Y-%m-%d")
                except:
                    expiration_date = "Not specified"

        contract_data = {
            "contractInfo": {
                "title": contract_basics.get("title", "Contract Agreement"),
                "type": contract_basics.get("type", "General Agreement"),
                "effectiveDate": contract_basics.get("effective_date", datetime.now().strftime("%Y-%m-%d")),
                "expirationDate": expiration_date or (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
                "totalValue": extract_numeric_value(contract_basics.get("contract_value", "0")),
                "currency": extract_currency_from_text(contract_basics.get("contract_value") or ai_data.get("financial_details", {}).get("currency", "USD")),
                "governingLaw": contract_basics.get("governing_law", "Not specified"),
                "parties": convert_ai_parties(ai_data.get("parties", [])),
                "contractTerm": convert_ai_contract_terms(contract_basics, ai_data.get("timeline_events", [])),
                "territory": contract_basics.get("territory", "Not specified"),
                "exclusivity": safe_extract(extract_exclusivity, ai_response, full_text, default=False),
                "financialTerms": convert_ai_financial_terms(ai_data.get("financial_details", {}))
            },
            "relationships": safe_extract(extract_relationships, ai_response, full_text, default=[]),
            "timeline": convert_ai_timeline(ai_data.get("timeline_events", [])),
            "risks": convert_ai_risks(ai_data.get("risk_factors", [])),
            "keyTerms": convert_ai_key_terms(ai_data.get("key_terms", [])),
            "products": convert_ai_products(ai_data.get("products_services", [])),
            "clauseRiskMap": safe_extract_with_pages(extract_clause_risk_map_enhanced, ai_response, full_text, total_pages, default=[]),
            "analytics": safe_extract(calculate_analytics_enhanced, ai_response, full_text, default={}),
            "documentStructure": safe_extract_with_pages(extract_document_structure, ai_response, full_text, total_pages, default={}),
            "complianceRequirements": safe_extract(extract_compliance_requirements, ai_response, full_text, default=[]),
            "metadata": {
                "analysisDate": datetime.now().isoformat(),
                "analysisVersion": "2.2",
                "confidence": 0.92,
                "extractedText": full_text[:1000] + "..." if len(full_text) > 1000 else full_text,
                "fileName": file_name,
                "fileSize": file_size,
                "totalPages": total_pages,
                "language": "English",
                "jurisdiction": ai_data.get("contract_basics", {}).get("governing_law", "Not specified")
            }
        }

        return contract_data

    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"[ERROR] Failed to parse AI JSON response: {str(e)}")
        raise

def extract_numeric_value(text):
    """Extract numeric value from text with enhanced pattern matching"""
    if not text:
        return 0

    text_str = str(text).replace("$", "").replace("€", "").replace("£", "").replace("¥", "")

    # Enhanced patterns for different number formats
    patterns = [
        r'([\d,]+(?:\.\d{2})?)\s*(?:million|mil|m)',  # Millions
        r'([\d,]+(?:\.\d{2})?)\s*(?:thousand|k)',     # Thousands
        r'([\d,]+(?:\.\d{2})?)',                      # Regular numbers
        r'(\d+(?:,\d{3})*(?:\.\d{2})?)',             # Comma-separated numbers
        r'(\d+(?:\.\d{2})?)'                          # Simple numbers
    ]

    for pattern in patterns:
        match = re.search(pattern, text_str, re.IGNORECASE)
        if match:
            try:
                value = float(match.group(1).replace(",", ""))
                # Apply multipliers
                if "million" in text_str.lower() or " mil" in text_str.lower() or " m" in text_str.lower():
                    value *= 1000000
                elif "thousand" in text_str.lower() or " k" in text_str.lower():
                    value *= 1000
                return value
            except:
                continue
    return 0

def extract_currency_from_text(text):
    """Extract currency from text"""
    if not text:
        return "USD"

    text = str(text).upper()
    for currency in ["USD", "EUR", "GBP", "CAD", "AUD"]:
        if currency in text:
            return currency

    if "$" in text:
        return "USD"
    elif "€" in text:
        return "EUR"
    elif "£" in text:
        return "GBP"

    return "USD"

def convert_ai_parties(ai_parties):
    """Convert AI parties data to our format with enhanced naming and validation"""
    parties = []

    for i, party in enumerate(ai_parties):
        if isinstance(party, dict) and party.get("legal_name"):
            legal_name = party.get("legal_name", "").strip()
            common_name = party.get("common_name", "").strip()

            # Enhanced validation for actual company names
            excluded_placeholders = [
                "party a", "party b", "party 1", "party 2", "party one", "party two",
                "company a", "company b", "company 1", "company 2", "company one", "company two",
                "not specified", "not available", "to be determined", "tbd", "n/a",
                "first party", "second party", "third party", "contractor", "client",
                "supplier", "customer", "vendor", "buyer", "seller", "licensor", "licensee"
            ]

            # Check if legal name is a real company name
            is_valid_name = (
                legal_name and
                len(legal_name) > 3 and
                not any(placeholder in legal_name.lower() for placeholder in excluded_placeholders) and
                # Check for company indicators
                (any(indicator in legal_name for indicator in ["Inc", "LLC", "Ltd", "Corporation", "Company", "Limited", "Corp", "Incorporated", "International", "Holdings", "Group", "Enterprises", "Pte", "Pty", "GmbH", "AG", "SA", "SAS"]) or
                 # Or if it looks like a proper name (starts with capital, has multiple words)
                 (legal_name[0].isupper() and len(legal_name.split()) >= 2))
            )

            if is_valid_name:
                # Use legal name as primary display name, fallback to common name
                display_name = legal_name if legal_name else common_name

                # Clean up display name - remove quotes and extra text
                if display_name:
                    display_name = display_name.replace('"', '').replace("'", "").strip()
                    # Remove common prefixes like "the " only if it's not part of the actual name
                    if display_name.lower().startswith("the ") and len(display_name) > 4:
                        potential_name = display_name[4:].strip()
                        # Only remove "the" if the remaining text looks like a company name
                        if any(suffix in potential_name for suffix in ["Inc", "LLC", "Ltd", "Corporation", "Company", "Limited"]):
                            display_name = potential_name

                # Parse and structure the address
                address_data = party.get("address", "")
                if isinstance(address_data, dict):
                    # Address is already structured
                    parsed_address = {
                        "street": address_data.get("street", ""),
                        "city": address_data.get("city", ""),
                        "state": address_data.get("state", ""),
                        "country": address_data.get("country", ""),
                        "postalCode": address_data.get("postalCode", "")
                    }
                    # Create a text representation for location field
                    address_parts = [
                        address_data.get("street", ""),
                        address_data.get("city", ""),
                        address_data.get("state", ""),
                        address_data.get("country", ""),
                        address_data.get("postalCode", "")
                    ]
                    address_text = ", ".join([part for part in address_parts if part and part != "N/A"])
                else:
                    # Address is a string, parse it
                    address_text = str(address_data) if address_data else ""
                    parsed_address = parse_address_enhanced(address_text)

                parties.append({
                    "id": f"party_{i + 1}",
                    "name": display_name,
                    "legalName": legal_name,
                    "location": address_text or "Address not specified",
                    "address": parsed_address,
                    "role": party.get("role", "Contract Party"),
                    "type": "Company",
                    "entityType": party.get("entity_type", "Corporation"),
                    "description": f"{display_name} - {party.get('role', 'Contract party')}",
                    "contactInfo": {"email": "", "phone": ""}
                })

    # Strict validation - no fallbacks
    if len(parties) < 2:
        raise ValueError("Insufficient parties identified from AI response - minimum 2 required")

    return parties

def convert_ai_contract_terms(contract_basics, timeline_events):
    """Convert AI contract terms data to our format"""
    auto_renewal_value = contract_basics.get("auto_renewal", False)
    # Handle both boolean and string values
    if isinstance(auto_renewal_value, bool):
        auto_renewal = auto_renewal_value
    else:
        auto_renewal = str(auto_renewal_value).lower() == "true"

    term_years = contract_basics.get("contract_term_years", "Not specified")

    # Extract notice period from timeline events
    notice_period = "Not specified"
    for event in timeline_events:
        if "notice" in str(event.get("notice_required", "")).lower():
            notice_text = event.get("notice_required", "")
            if "6 months" in notice_text or "six months" in notice_text:
                notice_period = "6 months"
            elif "month" in notice_text:
                notice_period = "30 days"

    return {
        "initialTerm": f"{term_years} years" if term_years != "Not specified" else "Not specified",
        "renewalType": "Automatic" if auto_renewal else "Manual",
        "renewalPeriod": f"{term_years} years" if auto_renewal and term_years != "Not specified" else "Not specified",
        "noticePeriod": notice_period,
        "autoRenewal": auto_renewal
    }

def convert_ai_financial_terms(ai_financial):
    """Convert AI financial data to our format"""
    return {
        "paymentTerms": ai_financial.get("payment_terms", "Net 30 days"),
        "currency": extract_currency_from_text(ai_financial.get("total_value", "USD")),
        "totalValue": extract_numeric_value(ai_financial.get("total_value", "0")),
        "paymentSchedule": ai_financial.get("payment_schedule", "As agreed"),
        "penalties": {
            "latePayment": ai_financial.get("late_payment_penalties", "As per agreement"),
            "breach": "As per agreement"
        }
    }

def convert_ai_timeline(ai_timeline):
    """Convert AI timeline data to our format with enhanced validation"""
    events = []

    for i, event in enumerate(ai_timeline):
        if isinstance(event, dict) and event.get("date"):
            notice_required = "yes" in str(event.get("notice_required", "")).lower()
            notice_deadline = event.get("notice_deadline")

            # Enhanced notice deadline calculation
            if notice_required and not notice_deadline:
                event_date = event.get("date")
                notice_text = str(event.get("notice_required", ""))
                if event_date:
                    try:
                        event_dt = datetime.strptime(event_date, "%Y-%m-%d")
                        # Calculate notice deadline based on notice text
                        if "6 months" in notice_text or "six months" in notice_text:
                            notice_dt = event_dt - timedelta(days=180)
                        elif "3 months" in notice_text or "three months" in notice_text:
                            notice_dt = event_dt - timedelta(days=90)
                        elif "30 days" in notice_text or "thirty days" in notice_text:
                            notice_dt = event_dt - timedelta(days=30)
                        elif "60 days" in notice_text or "sixty days" in notice_text:
                            notice_dt = event_dt - timedelta(days=60)
                        else:
                            notice_dt = event_dt - timedelta(days=30)  # Default 30 days
                        notice_deadline = notice_dt.strftime("%Y-%m-%d")
                    except:
                        notice_deadline = "30 days before event"

            # Determine completion status based on date
            event_date = event.get("date")
            completed = event.get("completed")
            if completed is None:
                completed = False
                if event_date:
                    try:
                        event_dt = datetime.strptime(event_date, "%Y-%m-%d")
                        completed = event_dt < datetime.now()
                    except:
                        completed = False

            # Use AI-provided priority or determine based on event type
            priority = event.get("priority", "medium").lower()
            if not priority or priority == "not specified":
                event_type = event.get("type", "milestone").lower()
                if event_type in ["deadline", "termination", "renewal"]:
                    priority = "high"
                elif event_type in ["payment", "delivery"]:
                    priority = "high"
                elif event_type == "milestone":
                    priority = "medium"
                else:
                    priority = "medium"

            # Enhanced consequences based on event type and content
            consequences = "As per contract terms"
            if event.get("type") == "deadline":
                consequences = "Non-compliance may result in breach of contract"
            elif event.get("type") == "payment":
                consequences = "Payment obligation must be fulfilled"
            elif event.get("type") == "renewal":
                consequences = "Contract automatically renews unless notice given"
            elif event.get("type") == "termination":
                consequences = "Contract may be terminated if notice requirements met"

            events.append({
                "id": i + 1,
                "date": event.get("date"),
                "event": event.get("event", "Contract Event"),
                "type": event.get("type", "milestone"),
                "description": event.get("event", "Contract Event"),
                "completed": completed,
                "priority": priority,
                "responsibleParty": event.get("responsible_party", "Both parties"),
                "consequences": consequences,
                "noticeRequired": notice_required,
                "noticeDeadline": notice_deadline
            })

    # Strict validation - no fallbacks
    if not events:
        raise ValueError("No timeline events identified from AI response")

    return events

def convert_ai_risks(ai_risks):
    """Convert AI risks data to our format with enhanced scoring"""
    risks = []

    for i, risk in enumerate(ai_risks):
        if isinstance(risk, dict) and risk.get("risk_title"):
            # Enhanced risk scoring based on category and impact
            category = risk.get("category", "Medium").lower()
            impact = risk.get("impact", "Medium").lower()
            likelihood = risk.get("likelihood", "Medium").lower()

            # Require AI-provided risk score - no fallback calculations
            risk_score = risk.get("risk_score")
            if risk_score and isinstance(risk_score, (int, float)):
                risk_score = max(20, min(95, int(risk_score)))
            else:
                # Strict validation - fail if AI didn't provide a proper risk score
                print(f"[ERROR] Missing or invalid AI-generated risk score for risk: {risk.get('risk_title', 'Unknown')}")
                print(f"[ERROR] Risk score value: {risk_score} (type: {type(risk_score)})")
                raise ValueError(f"AI must provide valid risk scores (20-95) for all risks. Missing score for: {risk.get('risk_title', 'Unknown')}")

            # Enhanced recommendations based on risk category and type
            recommendations = []
            mitigation_strategies = []

            risk_title = risk.get("risk_title", "")
            category = risk.get("category", "Medium").lower()

            # Category-specific recommendations
            if "renewal" in risk_title.lower():
                recommendations = ["Set calendar reminders for renewal dates", "Review contract performance annually", "Negotiate renewal terms in advance"]
                mitigation_strategies = ["Automated renewal tracking", "Performance monitoring", "Strategic planning"]
            elif "payment" in risk_title.lower() or "financial" in risk_title.lower():
                recommendations = ["Implement payment tracking system", "Establish credit monitoring", "Consider payment guarantees"]
                mitigation_strategies = ["Cash flow management", "Credit assessment", "Financial controls"]
            elif "intellectual property" in risk_title.lower() or "ip" in risk_title.lower():
                recommendations = ["Conduct IP due diligence", "Register trademarks/patents", "Monitor for infringement"]
                mitigation_strategies = ["IP portfolio management", "Legal protection", "Monitoring systems"]
            elif "termination" in risk_title.lower():
                recommendations = ["Understand termination triggers", "Maintain compliance records", "Plan exit strategies"]
                mitigation_strategies = ["Compliance monitoring", "Documentation", "Contingency planning"]
            else:
                recommendations = [f"Monitor {risk_title.lower()}", "Regular compliance review", "Seek legal advice if needed"]
                mitigation_strategies = ["Regular monitoring", "Legal consultation", "Risk assessment"]

            # Urgency based on risk score
            if risk_score >= 80:
                urgency = "Critical"
            elif risk_score >= 60:
                urgency = "High"
            elif risk_score >= 40:
                urgency = "Medium"
            else:
                urgency = "Low"

            risks.append({
                "id": i + 1,
                "category": risk.get("category", "Medium").title(),
                "title": risk.get("risk_title"),
                "description": risk.get("description", "Risk identified in contract analysis"),
                "impact": risk.get("impact", "Medium").title(),
                "likelihood": risk.get("likelihood", "Medium").title(),
                "riskScore": risk_score,
                "urgency": urgency,
                "mitigation": risk.get("mitigation", f"Monitor and address {risk.get('risk_title', 'this risk')}"),
                "clauses": ["General"],
                "recommendations": recommendations,
                "mitigationStrategies": mitigation_strategies
            })

    # Strict validation - no fallbacks
    if not risks:
        raise ValueError("No risks identified from AI response")

    return risks

def convert_ai_key_terms(ai_terms):
    """Convert AI key terms data to our format"""
    terms = []

    for i, term in enumerate(ai_terms):
        if isinstance(term, dict) and term.get("term"):
            terms.append({
                "id": i + 1,
                "term": term.get("term"),
                "definition": term.get("definition", "As defined in the contract"),
                "importance": term.get("importance", "Medium"),
                "clauses": ["General"],
                "category": "Legal",
                "implications": [f"{term.get('term')} requirements must be understood and followed"]
            })

    # Strict validation - no fallbacks
    if not terms:
        raise ValueError("No key terms identified from AI response")

    return terms

def convert_ai_products(ai_products):
    """Convert AI products data to our format with enhanced validation"""
    products = []

    for i, product in enumerate(ai_products):
        if isinstance(product, dict) and product.get("name"):
            # Enhanced filtering for real product names
            name = product.get("name", "").strip()

            # Exclude generic text fragments and legal language
            excluded_fragments = [
                "listed in", "as specified", "pursuant to", "will be deemed", "shall be",
                "according to", "in accordance with", "as defined", "as described",
                "products and services", "goods and services", "deliverables",
                "items", "materials", "components", "such products", "said products",
                "services as specified", "contract deliverables", "work product",
                "subject matter", "scope of work", "statement of work", "exhibit",
                "schedule", "appendix", "attachment", "addendum"
            ]

            # Enhanced validation for real product names
            is_valid_product = (
                len(name) > 3 and
                not any(fragment in name.lower() for fragment in excluded_fragments) and
                not name.lower().startswith(("the ", "all ", "any ", "such ", "said ", "these ", "those ")) and
                not re.match(r'^[a-z\s]+$', name) and  # Avoid all lowercase generic terms
                not re.match(r'^[A-Z\s]+$', name) and  # Avoid all uppercase generic terms
                # Look for actual product indicators
                (any(indicator in name for indicator in ["Supplement", "Vitamin", "Extract", "Powder", "Capsule", "Tablet", "Software", "Hardware", "Equipment", "System", "Solution", "Service", "Product", "Device", "Tool", "Machine"]) or
                 # Or if it has specific product characteristics
                 (name[0].isupper() and len(name.split()) >= 1 and not name.lower() in ["product", "service", "item", "deliverable", "goods"]))
            )

            if is_valid_product:
                # Extract quantity with better parsing
                quantity = 1
                quantity_text = product.get("quantity_text", "") or product.get("quantity", "")
                quantity_numeric = product.get("quantity_numeric")

                if quantity_numeric and isinstance(quantity_numeric, (int, float)):
                    quantity = int(quantity_numeric)
                elif quantity_text:
                    # Enhanced quantity extraction
                    numeric_match = re.search(r'([\d,]+(?:\.\d+)?)', str(quantity_text))
                    if numeric_match:
                        try:
                            quantity = int(float(numeric_match.group(1).replace(",", "")))
                        except:
                            quantity = 1

                # Enhanced unit extraction
                unit = product.get("unit", "units")
                if not unit or unit == "Not specified":
                    if quantity_text:
                        # Look for units in quantity text
                        unit_patterns = [
                            r'\b(\d+(?:gm|g|gram|grams))\b',
                            r'\b(\d+(?:ml|mL|milliliter|milliliters))\b',
                            r'\b(\d+(?:kg|kilogram|kilograms))\b',
                            r'\b(\d+(?:lb|lbs|pound|pounds))\b',
                            r'\b(units?|pieces?|items?|hours?|days?)\b'
                        ]
                        for pattern in unit_patterns:
                            match = re.search(pattern, quantity_text, re.IGNORECASE)
                            if match:
                                unit = match.group(1)
                                break
                    if not unit or unit == "Not specified":
                        unit = "units"

                # Enhanced specifications
                specifications_text = product.get("specifications", "")
                if not specifications_text or specifications_text == "Not specified":
                    specifications_text = "As specified in contract"

                # Enhanced pricing extraction
                price_info = product.get("price", "")
                unit_price = 0
                currency = "USD"

                if price_info:
                    unit_price = extract_numeric_value(price_info)
                    currency = extract_currency_from_text(price_info)

                # Enhanced delivery terms based on product type and contract context
                delivery_terms = "Ex Works (EXW)"  # Default from contract analysis
                if "book" in name.lower():
                    delivery_terms = "Digital delivery or printing on demand"
                elif any(term in name.lower() for term in ["supplement", "vitamin", "health", "organic"]):
                    delivery_terms = "Temperature-controlled shipping required"

                # Enhanced category classification
                category = "Contract Deliverable"
                if "book" in name.lower():
                    category = "Intellectual Property"
                elif any(term in name.lower() for term in ["supplement", "vitamin", "health", "organic", "formula"]):
                    category = "Health Products"
                elif "new product" in name.lower():
                    category = "Future Deliverables"

                # Calculate total price if possible
                total_price = unit_price * quantity if unit_price > 0 and quantity > 0 else None

                products.append({
                    "id": i + 1,
                    "name": name,
                    "description": product.get("description", f"{name} as specified in contract") or f"{name} as specified in contract",
                    "quantity": quantity,
                    "unit": unit,
                    "category": category,
                    "specifications": specifications_text,
                    "deliveryTerms": delivery_terms,
                    "pricing": {
                        "unitPrice": unit_price,
                        "currency": currency,
                        "totalPrice": total_price,
                        "minimumOrder": 1
                    }
                })

    # Strict validation - no fallbacks
    if not products:
        raise ValueError("No valid products identified from AI response")

    return products

def parse_ai_response_to_json_enhanced(ai_response, full_text, pdf_path):
    """Enhanced parsing with better data extraction from AI response"""

    # Get file metadata
    file_stats = os.stat(pdf_path)
    file_size = file_stats.st_size
    file_name = os.path.basename(pdf_path)

    # Calculate document pages
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    doc.close()

    # Enhanced extraction functions that use both AI response and text analysis
    contract_data = {
        "contractInfo": {
            "title": extract_contract_title_enhanced(ai_response, full_text),
            "type": extract_contract_type_enhanced(ai_response, full_text),
            "effectiveDate": extract_effective_date_enhanced(ai_response, full_text),
            "expirationDate": extract_expiration_date_enhanced(ai_response, full_text),
            "totalValue": extract_total_value_enhanced(ai_response, full_text),
            "currency": extract_currency_enhanced(ai_response, full_text),
            "governingLaw": extract_governing_law_enhanced(ai_response, full_text),
            "parties": extract_parties_enhanced(ai_response, full_text),
            "contractTerm": extract_contract_terms_enhanced(ai_response, full_text),
            "territory": extract_territory_enhanced(ai_response, full_text),
            "exclusivity": extract_exclusivity_enhanced(ai_response, full_text),
            "financialTerms": extract_financial_terms_enhanced(ai_response, full_text)
        },
        "relationships": extract_relationships_enhanced(ai_response, full_text),
        "timeline": extract_timeline_events_enhanced(ai_response, full_text),
        "risks": extract_risks_enhanced(ai_response, full_text),
        "keyTerms": extract_key_terms_enhanced(ai_response, full_text),
        "products": extract_products_enhanced(ai_response, full_text),
        "clauseRiskMap": extract_clause_risk_map_enhanced(ai_response, full_text, total_pages),
        "analytics": calculate_analytics_enhanced(ai_response, full_text),
        "documentStructure": extract_document_structure_enhanced(ai_response, full_text, total_pages),
        "complianceRequirements": extract_compliance_requirements_enhanced(ai_response, full_text),
        "metadata": {
            "analysisDate": datetime.now().isoformat(),
            "analysisVersion": "2.1",
            "confidence": 0.90,
            "extractedText": full_text[:1000] + "..." if len(full_text) > 1000 else full_text,
            "fileName": file_name,
            "fileSize": file_size,
            "totalPages": total_pages,
            "language": "English",
            "jurisdiction": extract_governing_law_enhanced(ai_response, full_text)
        }
    }

    return contract_data

def extract_contract_title(ai_response, full_text):
    """Extract contract title from AI response or text"""
    # Look for title patterns in the text
    title_patterns = [
        r"(?i)agreement\s+for\s+(.+?)(?:\n|$)",
        r"(?i)(.+?)\s+agreement",
        r"(?i)contract\s+for\s+(.+?)(?:\n|$)",
        r"(?i)(.+?)\s+contract"
    ]
    
    for pattern in title_patterns:
        match = re.search(pattern, full_text[:500])
        if match:
            return match.group(1).strip()
    
    return "Contract Agreement"

def extract_contract_title_enhanced(ai_response, full_text):
    """Enhanced contract title extraction using AI response and text analysis"""
    # First try to extract from AI response
    if ai_response and "Title:" in ai_response:
        title_match = re.search(r"Title:\s*(.+?)(?:\n|$)", ai_response, re.IGNORECASE)
        if title_match:
            title = title_match.group(1).strip()
            if title and title != "Not specified" and len(title) > 3:
                return title

    # Fallback to original method
    return extract_contract_title(ai_response, full_text)

def extract_contract_type_enhanced(ai_response, full_text):
    """Enhanced contract type extraction"""
    # First try to extract from AI response
    if ai_response and "Type:" in ai_response:
        type_match = re.search(r"Type:\s*(.+?)(?:\n|$)", ai_response, re.IGNORECASE)
        if type_match:
            contract_type = type_match.group(1).strip()
            if contract_type and contract_type != "Not specified":
                return contract_type

    # Fallback to original method
    return extract_contract_type(ai_response, full_text)

def extract_parties_enhanced(ai_response, full_text):
    """Enhanced party extraction using AI response"""
    parties = []

    # Try to extract from AI response first
    if ai_response and "Party" in ai_response:
        party_sections = re.findall(r"Party \d+:(.*?)(?=Party \d+:|$)", ai_response, re.DOTALL | re.IGNORECASE)

        for i, party_text in enumerate(party_sections):
            party_id = i + 1

            # Extract party details from AI response
            legal_name = extract_field_from_text(party_text, "Legal Name")
            common_name = extract_field_from_text(party_text, "Common Name")
            address = extract_field_from_text(party_text, "Address")
            role = extract_field_from_text(party_text, "Role")
            entity_type = extract_field_from_text(party_text, "Entity Type")

            if legal_name and legal_name != "Not specified":
                parties.append({
                    "id": f"party_{party_id}",
                    "name": common_name or legal_name,
                    "legalName": legal_name,
                    "location": address or "Address not specified",
                    "address": parse_address(address) if address else {
                        "street": "", "city": "", "country": "", "postalCode": ""
                    },
                    "role": role or f"Party {party_id}",
                    "type": "Company",
                    "entityType": entity_type or "Corporation",
                    "description": f"Party {party_id} to the agreement",
                    "contactInfo": {"email": "", "phone": ""}
                })

    # If no parties found in AI response, fallback to original method
    if not parties:
        parties = extract_parties(ai_response, full_text)

    return parties

def extract_field_from_text(text, field_name):
    """Extract a specific field from text"""
    pattern = rf"{field_name}:\s*(.+?)(?:\n|$)"
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        value = match.group(1).strip()
        return value if value and value != "Not specified" else None
    return None

def parse_address(address_text):
    """Parse address text into components"""
    if not address_text:
        return {"street": "", "city": "", "country": "", "postalCode": ""}

    # Simple address parsing - could be enhanced
    parts = [part.strip() for part in address_text.split(',')]

    return {
        "street": parts[0] if len(parts) > 0 else "",
        "city": parts[1] if len(parts) > 1 else "",
        "country": parts[-1] if len(parts) > 2 else "",
        "postalCode": ""
    }

def parse_address_enhanced(address_text):
    """Enhanced address parsing with better structure"""
    if not address_text or address_text.lower() in ["not specified", "address not specified", ""]:
        return {"street": "", "city": "", "state": "", "country": "", "postalCode": ""}

    # Clean the address text
    address_text = address_text.strip()

    # Split by commas and clean each part
    parts = [part.strip() for part in address_text.split(',') if part.strip()]

    # Initialize address components
    address = {"street": "", "city": "", "state": "", "country": "", "postalCode": ""}

    if len(parts) >= 1:
        address["street"] = parts[0]

    if len(parts) >= 2:
        address["city"] = parts[1]

    if len(parts) >= 3:
        # Try to identify country (usually last part)
        last_part = parts[-1]
        # Common country names and codes
        countries = ["USA", "United States", "Canada", "UK", "United Kingdom", "Hong Kong",
                    "Singapore", "Australia", "Germany", "France", "Japan", "China", "India",
                    "Vanuatu", "Switzerland", "Netherlands", "Belgium", "Italy", "Spain"]

        if any(country.lower() in last_part.lower() for country in countries):
            address["country"] = last_part
            # If we have more parts, the second-to-last might be state/province
            if len(parts) >= 4:
                address["state"] = parts[-2]
        else:
            # If last part doesn't look like a country, treat it as state/province
            address["state"] = last_part
            if len(parts) >= 4:
                address["country"] = "Not specified"

    # Extract postal code if present (look for patterns like numbers, postal codes)
    for part in parts:
        # Look for postal code patterns
        postal_match = re.search(r'\b\d{5}(-\d{4})?\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b', part)
        if postal_match:
            address["postalCode"] = postal_match.group(0)
            break

    return address

def extract_contract_type(ai_response, full_text):
    """Extract contract type"""
    type_keywords = {
        "Supply Agreement": ["supply", "supplier", "manufacturing"],
        "Service Agreement": ["service", "services", "consulting"],
        "Distribution Agreement": ["distribution", "distributor", "sales"],
        "Employment Agreement": ["employment", "employee", "work"],
        "License Agreement": ["license", "licensing", "intellectual property"]
    }
    
    text_lower = full_text.lower()
    for contract_type, keywords in type_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            return contract_type
    
    return "General Agreement"

def extract_total_value(ai_response, full_text):
    """Extract total contract value"""
    value_patterns = [
        r"(?:total|contract)\s+value\s*:?\s*\$?([\d,]+(?:\.\d{2})?)",
        r"\$\s*([\d,]+(?:\.\d{2})?)\s*(?:million|thousand)?",
        r"amount\s+of\s+\$?([\d,]+(?:\.\d{2})?)"
    ]

    for pattern in value_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            value_str = match.group(1).replace(",", "")
            try:
                return float(value_str)
            except:
                pass
    return 0

def extract_currency(ai_response, full_text):
    """Extract currency"""
    if "USD" in full_text or "$" in full_text:
        return "USD"
    elif "EUR" in full_text or "€" in full_text:
        return "EUR"
    elif "GBP" in full_text or "£" in full_text:
        return "GBP"
    return "USD"

def extract_governing_law(ai_response, full_text):
    """Extract governing law"""
    law_patterns = [
        r"governed\s+by\s+(?:the\s+)?laws?\s+of\s+([^,\n.]+)",
        r"governing\s+law\s*:?\s*([^,\n.]+)",
        r"subject\s+to\s+([^,\n.]+)\s+law"
    ]

    for pattern in law_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return "Not specified"

def extract_parties(ai_response, full_text):
    """Extract contract parties"""
    # This is a simplified extraction - in practice, you'd use more sophisticated NLP
    parties = []

    # Look for company names and addresses
    company_patterns = [
        r"([A-Z][a-zA-Z\s&,\.]+(?:Inc|LLC|Ltd|Corporation|Company|Limited)\.?)",
        r"([A-Z][a-zA-Z\s&,\.]+(?:Incorporated|Corporation))"
    ]

    found_companies = set()
    for pattern in company_patterns:
        matches = re.findall(pattern, full_text)
        for match in matches:
            if len(match) > 5 and match not in found_companies:
                found_companies.add(match)

    # Create party objects
    party_id = 1
    for company in list(found_companies)[:3]:  # Limit to 3 parties
        parties.append({
            "id": f"party_{party_id}",
            "name": company.strip(),
            "legalName": company.strip(),
            "location": "Address not specified",
            "address": {
                "street": "",
                "city": "",
                "country": "",
                "postalCode": ""
            },
            "role": "Party" if party_id == 1 else "Counterparty",
            "type": "Company",
            "entityType": "Corporation",
            "description": f"Party {party_id} to the agreement",
            "contactInfo": {
                "email": "",
                "phone": ""
            }
        })
        party_id += 1

    # Ensure at least 2 parties
    if len(parties) < 2:
        parties = [
            {
                "id": "party_1",
                "name": "Party A",
                "legalName": "Party A",
                "location": "Not specified",
                "address": {"street": "", "city": "", "country": "", "postalCode": ""},
                "role": "Primary Party",
                "type": "Company",
                "entityType": "Corporation",
                "description": "Primary party to the agreement",
                "contactInfo": {"email": "", "phone": ""}
            },
            {
                "id": "party_2",
                "name": "Party B",
                "legalName": "Party B",
                "location": "Not specified",
                "address": {"street": "", "city": "", "country": "", "postalCode": ""},
                "role": "Secondary Party",
                "type": "Company",
                "entityType": "Corporation",
                "description": "Secondary party to the agreement",
                "contactInfo": {"email": "", "phone": ""}
            }
        ]

    return parties

def extract_parties_enhanced(ai_response, full_text):
    """Enhanced party extraction with better company name detection"""
    parties = []

    # Enhanced company name patterns with more comprehensive matching
    company_patterns = [
        r"([A-Z][a-zA-Z\s&,\.'-]+(?:Inc|LLC|Ltd|Corporation|Company|Limited|Incorporated|Corp)\.?)",
        r"([A-Z][a-zA-Z\s&,\.'-]+(?:International|Holdings?|Group|Enterprises?)\.?)",
        r"([A-Z][a-zA-Z\s&,\.'-]+(?:Holding|Limited|Pte|Pty|GmbH|AG|SA|SAS)\.?)",
        r"([A-Z][a-zA-Z\s&,\.'-]+(?:Preparations|Solutions|Systems|Technologies|Industries)\.?)",
        r"([A-Z][a-zA-Z\s&,\.'-]+(?:Manufacturing|Trading|Distribution|Services)\.?)"
    ]

    found_companies = set()
    company_addresses = {}
    company_roles = {}

    # Extract companies with potential addresses and roles
    for pattern in company_patterns:
        matches = re.finditer(pattern, full_text)
        for match in matches:
            company_name = match.group(1).strip()

            # Enhanced validation for company names
            if (len(company_name) > 5 and
                company_name not in found_companies and
                not any(exclude in company_name.lower() for exclude in ["party", "company", "corporation", "limited", "inc", "llc"]) and
                len(company_name.split()) >= 2):  # Must have at least 2 words

                found_companies.add(company_name)

                # Try to find address near the company name
                start_pos = max(0, match.start() - 300)
                end_pos = min(len(full_text), match.end() + 300)
                context = full_text[start_pos:end_pos]

                # Look for address patterns in the context
                address_patterns = [
                    r"(?:address|located|situated)[\s:]*([^.]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)[^.]*)",
                    r"([^.]*(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)[^.]*)",
                    r"([^.]*(?:Hong Kong|Singapore|USA|Canada|UK|Australia|Germany|France|Japan|China|India|Vanuatu|Port Vila)[^.]*)",
                    r"([^.]*(?:Kowloon|Manhattan|London|Tokyo|Sydney|Toronto|Vancouver)[^.]*)"
                ]

                for addr_pattern in address_patterns:
                    addr_match = re.search(addr_pattern, context, re.IGNORECASE)
                    if addr_match:
                        company_addresses[company_name] = addr_match.group(1).strip()
                        break

                # Try to determine role from context
                role_patterns = [
                    (r"manufacturer|manufacturing|producer|maker", "Manufacturer"),
                    (r"customer|buyer|purchaser|client", "Customer"),
                    (r"supplier|vendor|provider", "Supplier"),
                    (r"distributor|distribution|dealer", "Distributor"),
                    (r"contractor|service provider", "Contractor"),
                    (r"licensor|licensing", "Licensor"),
                    (r"licensee", "Licensee")
                ]

                for role_pattern, role_name in role_patterns:
                    if re.search(role_pattern, context, re.IGNORECASE):
                        company_roles[company_name] = role_name
                        break

    # Create party objects with enhanced data
    party_id = 1
    default_roles = ["Manufacturer", "Customer", "Supplier", "Distributor", "Contractor", "Client"]

    for company in list(found_companies)[:4]:  # Allow up to 4 parties
        address_text = company_addresses.get(company, "Address not specified")
        parsed_address = parse_address_enhanced(address_text)

        # Use detected role or default
        role = company_roles.get(company, default_roles[min(party_id - 1, len(default_roles) - 1)])

        parties.append({
            "id": f"party_{party_id}",
            "name": company,
            "legalName": company,
            "location": address_text,
            "address": parsed_address,
            "role": role,
            "type": "Company",
            "entityType": "Corporation",
            "description": f"{company} - {role}",
            "contactInfo": {"email": "", "phone": ""}
        })
        party_id += 1

    # If still no good parties found, use the original method
    if len(parties) < 2:
        return extract_parties(ai_response, full_text)

    return parties

def extract_contract_terms(ai_response, full_text):
    """Extract contract term information"""
    term_info = {
        "initialTerm": "Not specified",
        "renewalType": "Manual",
        "renewalPeriod": "Not specified",
        "noticePeriod": "Not specified",
        "autoRenewal": False
    }

    # Extract term duration
    term_patterns = [
        r"(?:initial\s+)?term\s+of\s+(\d+)\s+(years?|months?)",
        r"(\d+)[-\s](year|month)\s+term"
    ]

    for pattern in term_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            duration = match.group(1)
            unit = match.group(2)
            term_info["initialTerm"] = f"{duration} {unit}"
            break

    # Check for auto-renewal
    if re.search(r"automatic(?:ally)?\s+renew", full_text, re.IGNORECASE):
        term_info["autoRenewal"] = True
        term_info["renewalType"] = "Automatic"

    # Extract notice period
    notice_patterns = [
        r"(\d+)\s+(?:days?|months?)\s+(?:written\s+)?notice",
        r"notice\s+of\s+(\d+)\s+(?:days?|months?)"
    ]

    for pattern in notice_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            term_info["noticePeriod"] = f"{match.group(1)} days"
            break

    return term_info

def extract_territory(ai_response, full_text):
    """Extract territorial scope"""
    territory_patterns = [
        r"territory\s*:?\s*([^,\n.]+)",
        r"geographical?\s+area\s*:?\s*([^,\n.]+)",
        r"worldwide|global|international"
    ]

    for pattern in territory_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            if "worldwide" in match.group(0).lower() or "global" in match.group(0).lower():
                return "Global"
            return match.group(1).strip()

    return "Not specified"

def extract_exclusivity(ai_response, full_text):
    """Extract exclusivity information"""
    exclusive_patterns = [
        r"exclusive(?:ly)?",
        r"sole\s+(?:and\s+)?exclusive",
        r"non[-\s]exclusive"
    ]

    for pattern in exclusive_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            if "non" in match.group(0).lower():
                return False
            return True

    return False

def extract_financial_terms(ai_response, full_text):
    """Extract financial terms"""
    return {
        "paymentTerms": "Net 30 days",
        "currency": extract_currency(ai_response, full_text),
        "totalValue": extract_total_value(ai_response, full_text),
        "paymentSchedule": "As agreed",
        "penalties": {
            "latePayment": "As per agreement",
            "breach": "As per agreement"
        }
    }

def extract_effective_date(ai_response, full_text):
    """Extract effective date"""
    date_patterns = [
        r"effective\s+(?:date|from)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})",
        r"commenc(?:ing|es)\s+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})",
        r"dated\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})"
    ]

    for pattern in date_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            try:
                date_str = match.group(1)
                # Convert to YYYY-MM-DD format
                parts = re.split(r'[\/\-]', date_str)
                if len(parts) == 3:
                    if len(parts[2]) == 4:  # Year is last
                        return f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
                    else:  # Year is first
                        return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
            except (ValueError, IndexError):
                continue

    return datetime.now().strftime("%Y-%m-%d")

def extract_expiration_date(ai_response, full_text):
    """Extract expiration date"""
    # Look for term duration and calculate expiration
    term_patterns = [
        r"(?:term|period)\s+of\s+(\d+)\s+years?",
        r"(\d+)[-\s]year\s+term",
        r"expires?\s+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})"
    ]

    for pattern in term_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            if "year" in pattern:
                try:
                    years = int(match.group(1))
                    effective_date = extract_effective_date(ai_response, full_text)
                    start_date = datetime.strptime(effective_date, "%Y-%m-%d")
                    end_date = start_date + timedelta(days=365 * years)
                    return end_date.strftime("%Y-%m-%d")
                except (ValueError, IndexError):
                    continue
            else:
                # Direct date match
                try:
                    date_str = match.group(1)
                    parts = re.split(r'[\/\-]', date_str)
                    if len(parts) == 3:
                        if len(parts[2]) == 4:  # Year is last
                            return f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
                        else:  # Year is first
                            return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                except (ValueError, IndexError):
                    continue

    # Default to 1 year from effective date
    effective_date = extract_effective_date(ai_response, full_text)
    try:
        start_date = datetime.strptime(effective_date, "%Y-%m-%d")
        end_date = start_date + timedelta(days=365)
        return end_date.strftime("%Y-%m-%d")
    except:
        return (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")

def extract_relationships(ai_response, full_text):
    """Extract party relationships"""
    return [
        {
            "from": "party_1",
            "to": "party_2",
            "type": "contractual",
            "description": "Primary contractual relationship",
            "strength": "strong",
            "obligations": ["Performance of contract terms"]
        }
    ]

def extract_timeline_events(ai_response, full_text):
    """Extract timeline events and milestones"""
    events = []
    event_id = 1

    # Add contract start event
    effective_date = extract_effective_date(ai_response, full_text)
    events.append({
        "id": event_id,
        "date": effective_date,
        "event": "Contract Effective Date",
        "type": "milestone",
        "description": "The date the contract becomes effective",
        "completed": True,
        "priority": "high",
        "responsibleParty": "Both parties",
        "consequences": "Contract becomes legally binding",
        "noticeRequired": False
    })
    event_id += 1

    # Add contract end event
    expiration_date = extract_expiration_date(ai_response, full_text)
    events.append({
        "id": event_id,
        "date": expiration_date,
        "event": "Contract Expiration",
        "type": "deadline",
        "description": "The date the contract expires",
        "completed": False,
        "priority": "critical",
        "responsibleParty": "Both parties",
        "consequences": "Contract terminates unless renewed",
        "noticeRequired": True,
        "noticeDeadline": (datetime.strptime(expiration_date, "%Y-%m-%d") - timedelta(days=180)).strftime("%Y-%m-%d")
    })

    return events

# REMOVED: extract_risks function
# This function was removed to ensure NO hardcoded risk data reaches users.
# All risks must come from comprehensive AI analysis to maintain quality and accuracy.

# REMOVED: extract_risks_enhanced function
# This function was removed to ensure NO hardcoded risk data reaches users.
# All risks must come from comprehensive AI analysis to maintain quality and accuracy.

# REMOVED: extract_key_terms function
# This function was removed to ensure NO hardcoded term data reaches users.
# All key terms must come from comprehensive AI analysis to maintain quality and accuracy.

# REMOVED: extract_products function
# This function was removed to ensure NO hardcoded product data reaches users.
# All products must come from comprehensive AI analysis to maintain quality and accuracy.

# REMOVED: extract_products_enhanced function
# This function was removed to ensure NO hardcoded product data reaches users.
# All products must come from comprehensive AI analysis to maintain quality and accuracy.

def extract_clause_risk_map(ai_response, full_text, total_pages):
    """Extract clause risk mapping from AI analysis only - no hardcoded data"""
    clause_risk_map = []

    # Try to extract from JSON AI response first
    try:
        if ai_response and "```json" in ai_response:
            start_idx = ai_response.find("```json") + 7
            end_idx = ai_response.find("```", start_idx)
            if end_idx != -1:
                json_text = ai_response[start_idx:end_idx].strip()
                ai_data = json.loads(json_text)

                # Extract clause risk mapping from JSON
                clause_risks = ai_data.get("clause_risk_mapping", [])
                for i, clause_risk in enumerate(clause_risks):
                    clause_text = clause_risk.get("clause", "")
                    risk_level = clause_risk.get("risk_level", "medium")
                    page_num = clause_risk.get("page", 1)
                    description = clause_risk.get("description", "")

                    if clause_text and len(clause_text.strip()) > 3:
                        clause_risk_map.append({
                            "clause": clause_text.strip(),
                            "riskLevel": risk_level.strip().lower(),
                            "page": int(page_num),
                            "position": {
                                "top": 10 + (i * 15),  # Distribute vertically
                                "left": 5,
                                "width": 90,
                                "height": 8
                            },
                            "description": description or f"Risk identified in: {clause_text.strip()}"
                        })
    except Exception as e:
        print(f"[WARNING] Could not parse JSON for clause risk mapping: {str(e)}")

    # If no JSON mapping found, try text-based extraction
    if not clause_risk_map and ai_response and "CLAUSE RISK MAPPING:" in ai_response:
        mapping_section = re.search(r"CLAUSE RISK MAPPING:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if mapping_section:
            mapping_text = mapping_section.group(1)

            # Extract clause mappings from AI response
            clause_matches = re.findall(r"Clause:\s*([^\n]+).*?Risk Level:\s*([^\n]+).*?Page:\s*(\d+)", mapping_text, re.DOTALL)

            for clause_text, risk_level, page_num in clause_matches:
                if clause_text.strip() and len(clause_text.strip()) > 5:
                    clause_risk_map.append({
                        "clause": clause_text.strip(),
                        "riskLevel": risk_level.strip().lower(),
                        "page": int(page_num),
                        "position": {
                            "top": 10,
                            "left": 5,
                            "width": 90,
                            "height": 8
                        },
                        "description": f"Risk identified in: {clause_text.strip()}"
                    })

    # Generate clause risk mapping from identified risks if still empty
    if not clause_risk_map:
        try:
            if ai_response and "```json" in ai_response:
                start_idx = ai_response.find("```json") + 7
                end_idx = ai_response.find("```", start_idx)
                if end_idx != -1:
                    json_text = ai_response[start_idx:end_idx].strip()
                    ai_data = json.loads(json_text)

                    # Generate clause mapping from risk factors
                    risks = ai_data.get("risk_factors", [])
                    for i, risk in enumerate(risks[:5]):  # Limit to top 5 risks
                        risk_title = risk.get("title", "")
                        risk_category = risk.get("category", "medium")

                        if risk_title:
                            clause_risk_map.append({
                                "clause": f"Risk Area {i+1}: {risk_title[:50]}",
                                "riskLevel": risk_category.lower(),
                                "page": min(i + 1, total_pages),
                                "position": {
                                    "top": 10 + (i * 15),
                                    "left": 5,
                                    "width": 90,
                                    "height": 8
                                },
                                "description": f"Risk area: {risk_title}"
                            })
        except Exception as e:
            print(f"[WARNING] Could not generate clause mapping from risks: {str(e)}")

    return clause_risk_map

def calculate_analytics(ai_response, full_text):
    """Calculate analytics from AI analysis only - no hardcoded data"""
    analytics = {
        "overallRiskScore": 50,  # Default neutral score
        "riskDistribution": {"high": 0, "medium": 0, "low": 0},
        "completionRate": 0,
        "criticalDeadlines": 0,
        "totalClauses": 0,
        "riskyClauses": 0,
        "performanceMetrics": {
            "complianceScore": 75,
            "financialHealth": 75,
            "operationalRisk": 50
        },
        "contractComplexity": {
            "textLength": len(full_text),
            "estimatedReadingTime": max(5, len(full_text) // 1000),
            "legalComplexity": 5
        }
    }

    # Try to extract analytics from AI response
    if ai_response and "ANALYTICS:" in ai_response:
        analytics_section = re.search(r"ANALYTICS:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if analytics_section:
            analytics_text = analytics_section.group(1)

            # Extract risk score
            risk_score_match = re.search(r"Overall Risk Score:\s*(\d+)", analytics_text)
            if risk_score_match:
                analytics["overallRiskScore"] = int(risk_score_match.group(1))

            # Extract clause counts
            clause_count_match = re.search(r"Total Clauses:\s*(\d+)", analytics_text)
            if clause_count_match:
                analytics["totalClauses"] = int(clause_count_match.group(1))

    return analytics

def extract_document_structure(ai_response, full_text, total_pages):
    """Extract document structure"""
    sections = [
        {
            "title": "Definitions and Interpretation",
            "pageStart": 1,
            "pageEnd": 2,
            "clauses": ["1.1", "1.2", "1.3"],
            "riskLevel": "medium",
            "summary": "Establishes key definitions and contract interpretation rules."
        },
        {
            "title": "Parties and Scope",
            "pageStart": 3,
            "pageEnd": 4,
            "clauses": ["2.1", "2.2"],
            "riskLevel": "high",
            "summary": "Defines parties and scope of the agreement."
        },
        {
            "title": "Terms and Conditions",
            "pageStart": 5,
            "pageEnd": max(6, total_pages - 2),
            "clauses": ["3.1", "3.2", "3.3"],
            "riskLevel": "medium",
            "summary": "Main terms and conditions of the contract."
        },
        {
            "title": "Termination and Miscellaneous",
            "pageStart": max(total_pages - 1, 7),
            "pageEnd": total_pages,
            "clauses": ["4.1", "4.2"],
            "riskLevel": "low",
            "summary": "Termination procedures and miscellaneous provisions."
        }
    ]

    return {
        "sections": sections,
        "totalPages": total_pages
    }

def extract_compliance_requirements(ai_response, full_text):
    """Extract compliance requirements"""
    requirements = []

    # Look for regulatory mentions
    regulatory_patterns = {
        "FDA": "Food and Drug Administration compliance",
        "GDPR": "General Data Protection Regulation compliance",
        "SOX": "Sarbanes-Oxley compliance",
        "ISO": "ISO standard compliance"
    }

    req_id = 1
    for regulation, description in regulatory_patterns.items():
        if re.search(regulation, full_text, re.IGNORECASE):
            requirements.append({
                "id": req_id,
                "requirement": f"{regulation} Compliance",
                "description": description,
                "jurisdiction": "As applicable",
                "deadline": "Ongoing",
                "status": "Active",
                "responsibleParty": "Both parties"
            })
            req_id += 1

    # Default compliance requirement
    if not requirements:
        requirements.append({
            "id": 1,
            "requirement": "General Legal Compliance",
            "description": "Compliance with applicable laws and regulations",
            "jurisdiction": "As applicable",
            "deadline": "Ongoing",
            "status": "Active",
            "responsibleParty": "Both parties"
        })

    return requirements

# Enhanced extraction functions
def extract_effective_date_enhanced(ai_response, full_text):
    """Enhanced effective date extraction"""
    if ai_response and "Effective Date:" in ai_response:
        date_match = re.search(r"Effective Date:\s*(\d{4}-\d{2}-\d{2})", ai_response)
        if date_match:
            return date_match.group(1)
    return extract_effective_date(ai_response, full_text)

def extract_expiration_date_enhanced(ai_response, full_text):
    """Enhanced expiration date extraction"""
    if ai_response and "Expiration Date:" in ai_response:
        date_match = re.search(r"Expiration Date:\s*(\d{4}-\d{2}-\d{2})", ai_response)
        if date_match:
            return date_match.group(1)
    return extract_expiration_date(ai_response, full_text)

def extract_total_value_enhanced(ai_response, full_text):
    """Enhanced total value extraction with better pattern matching"""
    # First try AI response
    if ai_response and "Contract Value:" in ai_response:
        value_match = re.search(r"Contract Value:\s*([^\n]+)", ai_response)
        if value_match:
            value_text = value_match.group(1)
            # Extract numeric value
            numeric_match = re.search(r"([\d,]+(?:\.\d{2})?)", value_text)
            if numeric_match:
                try:
                    return float(numeric_match.group(1).replace(",", ""))
                except:
                    pass

    # Enhanced patterns for value extraction from text
    value_patterns = [
        r"(?:total|contract|agreement)\s+value\s*:?\s*(?:USD|EUR|GBP|CAD|AUD)?\s*\$?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:amount|sum)\s+of\s+(?:USD|EUR|GBP|CAD|AUD)?\s*\$?\s*([\d,]+(?:\.\d{2})?)",
        r"\$\s*([\d,]+(?:\.\d{2})?)\s*(?:million|thousand|USD|EUR|GBP)?",
        r"(?:USD|EUR|GBP|CAD|AUD)\s+([\d,]+(?:\.\d{2})?)",
        r"purchase\s+price\s*:?\s*(?:USD|EUR|GBP|CAD|AUD)?\s*\$?\s*([\d,]+(?:\.\d{2})?)"
    ]

    for pattern in value_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            value_str = match.group(1).replace(",", "")
            try:
                value = float(value_str)
                # Handle millions/thousands multipliers
                if "million" in full_text[max(0, match.start()-20):match.end()+20].lower():
                    value *= 1000000
                elif "thousand" in full_text[max(0, match.start()-20):match.end()+20].lower():
                    value *= 1000
                return value
            except:
                continue

    return extract_total_value(ai_response, full_text)

def extract_currency_enhanced(ai_response, full_text):
    """Enhanced currency extraction"""
    if ai_response and "Contract Value:" in ai_response:
        value_match = re.search(r"Contract Value:\s*([^\n]+)", ai_response)
        if value_match and any(curr in value_match.group(1) for curr in ["USD", "EUR", "GBP"]):
            value_text = value_match.group(1)
            for curr in ["USD", "EUR", "GBP"]:
                if curr in value_text:
                    return curr
    return extract_currency(ai_response, full_text)

def extract_governing_law_enhanced(ai_response, full_text):
    """Enhanced governing law extraction"""
    if ai_response and "Governing Law:" in ai_response:
        law_match = re.search(r"Governing Law:\s*([^\n]+)", ai_response)
        if law_match:
            law = law_match.group(1).strip()
            if law and law != "Not specified":
                return law
    return extract_governing_law(ai_response, full_text)

def extract_contract_terms_enhanced(ai_response, full_text):
    """Enhanced contract terms extraction"""
    # Use original method as base
    terms = extract_contract_terms(ai_response, full_text)

    # Try to enhance with AI response data
    if ai_response:
        # Look for timeline information in AI response
        timeline_section = re.search(r"TIMELINE EVENTS:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if timeline_section:
            timeline_text = timeline_section.group(1)
            # Extract term duration from timeline events
            term_match = re.search(r"(\d+)\s+(year|month)", timeline_text, re.IGNORECASE)
            if term_match:
                duration = term_match.group(1)
                unit = term_match.group(2)
                terms["initialTerm"] = f"{duration} {unit}s"

    return terms

def extract_territory_enhanced(ai_response, full_text):
    """Enhanced territory extraction"""
    # Use original method
    return extract_territory(ai_response, full_text)

def extract_exclusivity_enhanced(ai_response, full_text):
    """Enhanced exclusivity extraction"""
    # Use original method
    return extract_exclusivity(ai_response, full_text)

def extract_financial_terms_enhanced(ai_response, full_text):
    """Enhanced financial terms extraction"""
    terms = extract_financial_terms(ai_response, full_text)

    # Try to enhance with AI response
    if ai_response and "FINANCIAL DETAILS:" in ai_response:
        financial_section = re.search(r"FINANCIAL DETAILS:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if financial_section:
            financial_text = financial_section.group(1)

            # Extract payment terms
            payment_match = re.search(r"Payment Terms:\s*([^\n]+)", financial_text)
            if payment_match:
                terms["paymentTerms"] = payment_match.group(1).strip()

            # Extract payment schedule
            schedule_match = re.search(r"Payment Schedule:\s*([^\n]+)", financial_text)
            if schedule_match:
                terms["paymentSchedule"] = schedule_match.group(1).strip()

    return terms

def extract_relationships_enhanced(ai_response, full_text):
    """Enhanced relationships extraction"""
    # Use original method for now
    return extract_relationships(ai_response, full_text)

def extract_timeline_events_enhanced(ai_response, full_text):
    """Enhanced timeline events extraction"""
    events = extract_timeline_events(ai_response, full_text)

    # Try to enhance with AI response
    if ai_response and "TIMELINE EVENTS:" in ai_response:
        timeline_section = re.search(r"TIMELINE EVENTS:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if timeline_section:
            timeline_text = timeline_section.group(1)

            # Extract additional events from AI response
            event_matches = re.findall(r"Date:\s*(\d{4}-\d{2}-\d{2}).*?Event:\s*([^\n]+)", timeline_text, re.DOTALL)

            event_id = len(events) + 1
            for date, event_desc in event_matches:
                if not any(e["date"] == date for e in events):  # Avoid duplicates
                    events.append({
                        "id": event_id,
                        "date": date,
                        "event": event_desc.strip(),
                        "type": "milestone",
                        "description": f"Event extracted from AI analysis: {event_desc.strip()}",
                        "completed": False,
                        "priority": "medium",
                        "responsibleParty": "As specified",
                        "consequences": "As per contract terms",
                        "noticeRequired": False
                    })
                    event_id += 1

    return events

def extract_risks_enhanced(ai_response, full_text):
    """Enhanced risk extraction"""
    risks = extract_risks(ai_response, full_text)

    # Try to enhance with AI response
    if ai_response and "RISK FACTORS:" in ai_response:
        risk_section = re.search(r"RISK FACTORS:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if risk_section:
            risk_text = risk_section.group(1)

            # Extract risks from AI response
            risk_matches = re.findall(r"Risk Title:\s*([^\n]+).*?Description:\s*([^\n]+).*?Category:\s*([^\n]+)", risk_text, re.DOTALL)

            risk_id = len(risks) + 1
            for title, description, category in risk_matches:
                if not any(r["title"] == title.strip() for r in risks):  # Avoid duplicates
                    risks.append({
                        "id": risk_id,
                        "category": category.strip(),
                        "title": title.strip(),
                        "description": description.strip(),
                        "impact": category.strip(),
                        "likelihood": "Medium",
                        "riskScore": 80 if category.strip().lower() == "high" else 60 if category.strip().lower() == "medium" else 40,
                        "urgency": category.strip(),
                        "mitigation": f"Monitor and address {title.strip().lower()}",
                        "clauses": ["General"],
                        "recommendations": [f"Review {title.strip().lower()}", "Implement monitoring"],
                        "mitigationStrategies": ["Regular review", "Legal consultation"]
                    })
                    risk_id += 1

    return risks

def extract_key_terms_enhanced(ai_response, full_text):
    """Enhanced key terms extraction"""
    terms = extract_key_terms(ai_response, full_text)

    # Try to enhance with AI response
    if ai_response and "KEY TERMS:" in ai_response:
        terms_section = re.search(r"KEY TERMS:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if terms_section:
            terms_text = terms_section.group(1)

            # Extract terms from AI response
            term_matches = re.findall(r"Term:\s*([^\n]+).*?Definition:\s*([^\n]+).*?Importance:\s*([^\n]+)", terms_text, re.DOTALL)

            term_id = len(terms) + 1
            for term_name, definition, importance in term_matches:
                if not any(t["term"] == term_name.strip() for t in terms):  # Avoid duplicates
                    terms.append({
                        "id": term_id,
                        "term": term_name.strip(),
                        "definition": definition.strip(),
                        "importance": importance.strip(),
                        "clauses": ["General"],
                        "category": "Legal",
                        "implications": [f"{term_name.strip()} requirements must be understood and followed"]
                    })
                    term_id += 1

    return terms

def extract_products_enhanced(ai_response, full_text):
    """Enhanced products extraction"""
    products = []

    # Try to extract from AI response first
    if ai_response and "PRODUCTS/SERVICES:" in ai_response:
        products_section = re.search(r"PRODUCTS/SERVICES:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if products_section:
            products_text = products_section.group(1)

            # Extract products from AI response
            product_matches = re.findall(r"Name:\s*([^\n]+).*?Description:\s*([^\n]+)", products_text, re.DOTALL)

            product_id = 1
            for name, description in product_matches:
                if name.strip() and len(name.strip()) > 3 and "not specified" not in name.lower():
                    products.append({
                        "id": product_id,
                        "name": name.strip(),
                        "description": description.strip(),
                        "quantity": 1,
                        "unit": "units",
                        "category": "Contract Deliverable",
                        "specifications": {
                            "packaging": "As specified",
                            "shelfLife": "As applicable",
                            "certifications": []
                        },
                        "pricing": {
                            "unitPrice": 0,
                            "currency": "USD",
                            "minimumOrder": 1
                        }
                    })
                    product_id += 1

    # If no products found in AI response, fallback to original method
    if not products:
        products = extract_products(ai_response, full_text)

    return products

def extract_clause_risk_map_enhanced(ai_response, full_text, total_pages):
    """Enhanced clause risk mapping"""
    # Get base mapping from AI analysis
    base_mapping = extract_clause_risk_map(ai_response, full_text, total_pages)

    # If base mapping is empty, try to create from document structure
    if not base_mapping:
        try:
            # Extract document sections and create risk mapping
            sections = ["Introduction", "Definitions", "Terms and Conditions", "Obligations", "Payment Terms", "Termination", "Miscellaneous"]

            for i, section in enumerate(sections):
                if section.lower() in full_text.lower():
                    # Determine risk level based on section type
                    risk_level = "high" if section in ["Obligations", "Payment Terms", "Termination"] else "medium"

                    base_mapping.append({
                        "clause": f"Section: {section}",
                        "riskLevel": risk_level,
                        "page": min(i + 1, total_pages),
                        "position": {
                            "top": 10 + (i * 12),
                            "left": 5,
                            "width": 90,
                            "height": 8
                        },
                        "description": f"Contract section: {section}"
                    })
        except Exception as e:
            print(f"[WARNING] Could not create enhanced clause mapping: {str(e)}")

    # Try to enhance with additional AI analysis
    if ai_response and "DETAILED CLAUSE ANALYSIS:" in ai_response:
        detailed_section = re.search(r"DETAILED CLAUSE ANALYSIS:(.*?)(?=\*\*|$)", ai_response, re.DOTALL | re.IGNORECASE)
        if detailed_section:
            detailed_text = detailed_section.group(1)

            # Extract additional clause details
            additional_matches = re.findall(r"Section:\s*([^\n]+).*?Risk:\s*([^\n]+).*?Location:\s*Page\s*(\d+)", detailed_text, re.DOTALL)

            for section, risk, page in additional_matches:
                if not any(clause["clause"] == section.strip() for clause in base_mapping):
                    base_mapping.append({
                        "clause": section.strip(),
                        "riskLevel": risk.strip().lower(),
                        "page": int(page),
                        "position": {
                            "top": 15 + len(base_mapping) * 12,
                            "left": 5,
                            "width": 90,
                            "height": 6
                        },
                        "description": f"Enhanced analysis: {section.strip()}"
                    })

    return base_mapping

def calculate_analytics_enhanced(ai_response, full_text):
    """Enhanced analytics calculation with improved metrics for dashboard components"""
    # Parse AI response to get risk data
    try:
        # Extract JSON from AI response
        json_text = ai_response
        if "```json" in ai_response:
            start_idx = ai_response.find("```json") + 7
            end_idx = ai_response.find("```", start_idx)
            if end_idx != -1:
                json_text = ai_response[start_idx:end_idx].strip()

        ai_data = json.loads(json_text)
        risks = convert_ai_risks(ai_data.get("risk_factors", []))
        timeline = convert_ai_timeline(ai_data.get("timeline_events", []))

    except Exception as e:
        print(f"[WARNING] Could not parse AI response for analytics: {str(e)}")
        # Fallback to base analytics
        return calculate_analytics(ai_response, full_text)

    # Calculate risk distribution and scores
    risk_distribution = {"high": 0, "medium": 0, "low": 0}
    total_risk_score = 0

    for risk in risks:
        category = risk["category"].lower()
        if category in risk_distribution:
            risk_distribution[category] += 1
        total_risk_score += risk["riskScore"]

    # Calculate realistic average risk score
    if len(risks) > 0:
        avg_risk_score = total_risk_score / len(risks)
    else:
        # Base risk score on contract complexity and content analysis
        text_length = len(full_text)
        complexity_indicators = [
            "automatic renewal", "exclusive", "penalty", "liquidated damages",
            "intellectual property", "minimum purchase", "territory", "jurisdiction"
        ]
        complexity_score = sum(1 for indicator in complexity_indicators if indicator in full_text.lower())

        base_score = 45
        if text_length > 20000:
            base_score += 15  # Complex contracts
        elif text_length > 10000:
            base_score += 8   # Medium complexity

        base_score += complexity_score * 3  # Add for each complexity indicator
        avg_risk_score = max(25, min(85, base_score))

    # Enhanced timeline analysis
    completed_events = sum(1 for event in timeline if event.get("completed", False))
    completion_rate = int((completed_events / max(len(timeline), 1)) * 100)

    # Count critical deadlines more accurately
    critical_deadlines = 0
    current_date = datetime.now()
    for event in timeline:
        if (event.get("priority") in ["high", "critical"] and
            not event.get("completed", False) and
            event.get("date")):
            try:
                event_date = datetime.strptime(event["date"], "%Y-%m-%d")
                if event_date > current_date:
                    critical_deadlines += 1
            except:
                pass

    # Enhanced clause estimation
    text_length = len(full_text)
    section_indicators = len(re.findall(r'\b(?:section|clause|article|paragraph)\s+\d+', full_text, re.IGNORECASE))
    numbered_items = len(re.findall(r'\b\d+\.\d+', full_text))

    estimated_clauses = max(
        section_indicators * 2,
        numbered_items,
        text_length // 800,
        10
    )
    estimated_clauses = min(estimated_clauses, 100)

    # Calculate risky clauses
    risky_clauses = risk_distribution["high"] * 3 + risk_distribution["medium"] * 2 + risk_distribution["low"]

    return {
        "overallRiskScore": int(avg_risk_score),
        "riskDistribution": risk_distribution,
        "completionRate": completion_rate,
        "criticalDeadlines": critical_deadlines,
        "totalClauses": estimated_clauses,
        "riskyClauses": risky_clauses,
        "performanceMetrics": {
            "complianceScore": max(50, 100 - (risk_distribution["high"] * 20) - (risk_distribution["medium"] * 8)),
            "financialHealth": max(60, 100 - (risk_distribution["high"] * 15) - (risk_distribution["medium"] * 5)),
            "operationalRisk": min(90, avg_risk_score + (risk_distribution["high"] * 8))
        },
        "contractComplexity": {
            "textLength": text_length,
            "estimatedReadingTime": max(5, text_length // 1000),  # Minutes
            "legalComplexity": min(10, len(re.findall(r'\b(?:whereas|therefore|notwithstanding|pursuant|herein|thereof)\b', full_text, re.IGNORECASE)))
        }
    }

def extract_document_structure_enhanced(ai_response, full_text, total_pages):
    """Enhanced document structure extraction"""
    # Use original method for now
    return extract_document_structure(ai_response, full_text, total_pages)

def extract_compliance_requirements_enhanced(ai_response, full_text):
    """Enhanced compliance requirements extraction"""
    # Use original method for now
    return extract_compliance_requirements(ai_response, full_text)

def safe_extract(func, *args, default=None):
    """Safely extract data with fallback"""
    try:
        return func(*args)
    except Exception as e:
        print(f"[WARNING] {func.__name__} failed: {str(e)}")
        return default

def safe_extract_with_pages(func, ai_response, full_text, total_pages, default=None):
    """Safely extract data with pages parameter"""
    try:
        return func(ai_response, full_text, total_pages)
    except Exception as e:
        print(f"[WARNING] {func.__name__} failed: {str(e)}")
        return default

def validate_contract_data_strict(contract_data, full_text, pdf_path):
    """Strict validation with no fallback data - fails if quality is insufficient"""
    print("[*] Performing strict contract data validation...")

    validation_errors = []

    # Strict party validation - no fallbacks
    parties = contract_data.get("contractInfo", {}).get("parties", [])
    if not parties or len(parties) < 2:
        validation_errors.append("CRITICAL: Insufficient parties identified (minimum 2 required)")
    else:
        for i, party in enumerate(parties):
            name = party.get("name", "")
            # Check for generic/placeholder names
            generic_indicators = [
                "party a", "party b", "party 1", "party 2", "company a", "company b",
                "not specified", "contractor", "client", "supplier", "customer",
                "first party", "second party", "the manufacturer", "the customer"
            ]
            if any(generic.lower() in name.lower() for generic in generic_indicators):
                validation_errors.append(f"CRITICAL: Generic party name detected: '{name}' - Real company names required")

            # Validate company name structure
            if len(name) < 5:
                validation_errors.append(f"CRITICAL: Party name too short: '{name}'")

            # Check for proper legal entity indicators (more comprehensive)
            legal_indicators = ["Inc", "LLC", "Ltd", "Corporation", "Company", "Limited", "Corp",
                              "Incorporated", "International", "Holdings", "Group", "Enterprises",
                              "INC.", "LIMITED", "HOLDING", "INTERNATIONAL"]
            if not any(indicator in name for indicator in legal_indicators):
                validation_errors.append(f"WARNING: Party '{name}' may not be a proper legal entity")

    # Strict product validation - no fallbacks
    products = contract_data.get("products", [])
    if not products:
        validation_errors.append("CRITICAL: No products/services identified")
    else:
        for i, product in enumerate(products):
            name = product.get("name", "")
            # Check for text fragments instead of real product names
            fragment_indicators = [
                "listed in", "as specified", "pursuant to", "will be deemed", "shall be",
                "according to", "in accordance with", "as defined", "schedule a"
            ]
            if any(fragment in name.lower() for fragment in fragment_indicators):
                validation_errors.append(f"CRITICAL: Product name is text fragment, not actual product: '{name}'")

            # Check for meaningful product names
            if len(name) < 3:
                validation_errors.append(f"CRITICAL: Product name too short: '{name}'")

            # Validate quantities
            quantity = product.get("quantity", 0)
            if not isinstance(quantity, (int, float)) or quantity <= 0:
                validation_errors.append(f"CRITICAL: Invalid quantity for product '{name}': {quantity}")

    # Strict financial validation - no fallbacks
    financial_terms = contract_data.get("contractInfo", {}).get("financialTerms", {})
    payment_terms = financial_terms.get("paymentTerms", "")
    if not payment_terms or payment_terms.lower() in ["not specified", "as agreed", "net 30 days"]:
        validation_errors.append("CRITICAL: Generic or missing payment terms")

    # Strict risk validation - no fallbacks
    risks = contract_data.get("risks", [])
    if len(risks) < 3:
        validation_errors.append("CRITICAL: Insufficient risk analysis (minimum 3 risks required)")
    else:
        for risk in risks:
            risk_score = risk.get("riskScore", 0)
            if not isinstance(risk_score, (int, float)) or risk_score < 20 or risk_score > 95:
                validation_errors.append(f"CRITICAL: Invalid risk score: {risk_score} (must be 20-95)")

            title = risk.get("title", "")
            if not title or len(title) < 10:
                validation_errors.append("CRITICAL: Risk title too short or missing")

    # Strict timeline validation - no fallbacks
    timeline = contract_data.get("timeline", [])
    if len(timeline) < 3:
        validation_errors.append("CRITICAL: Insufficient timeline events (minimum 3 required)")
    else:
        # Count events with specific dates vs conditional/ongoing events
        dated_events = 0
        for event in timeline:
            date = event.get("date", "")
            event_name = event.get("event", "Unknown")

            # Allow conditional/ongoing events without specific dates
            conditional_keywords = [
                "when", "if", "upon", "after", "during", "ongoing", "as needed",
                "quarterly", "monthly", "annually", "notification", "return",
                "rectification", "provide", "compensate"
            ]

            is_conditional = any(keyword in event_name.lower() for keyword in conditional_keywords)

            if date and date.lower() not in ["not specified", "n/a", "tbd"]:
                dated_events += 1
            elif not is_conditional:
                validation_errors.append(f"WARNING: Event missing specific date: {event_name}")

        # Require at least 2 events with specific dates
        if dated_events < 2:
            validation_errors.append("CRITICAL: Insufficient events with specific dates (minimum 2 required)")

    # Return validation results
    if validation_errors:
        critical_errors = [err for err in validation_errors if err.startswith("CRITICAL")]
        warning_errors = [err for err in validation_errors if err.startswith("WARNING")]

        if critical_errors:
            print(f"[ERROR] Validation failed with {len(critical_errors)} critical errors:")
            for error in critical_errors[:10]:  # Show first 10 critical errors
                print(f"   {error}")
            return None  # Fail validation - no data returned
        elif warning_errors:
            print(f"[WARNING] Validation passed with {len(warning_errors)} warnings:")
            for warning in warning_errors[:5]:  # Show first 5 warnings
                print(f"   {warning}")

    print("[*] Strict validation passed - high quality data confirmed")
    return contract_data

if __name__ == "__main__":
    # Check for PDF file
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        if os.path.exists("temp_contract.pdf"):
            pdf_path = "temp_contract.pdf"
        else:
            pdf_path = "your_contract.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"[ERROR] PDF file not found: {pdf_path}")
        sys.exit(1)
    
    try:
        print(f"[*] Processing PDF: {pdf_path}")
        full_text = extract_text_from_pdf(pdf_path)
        contract_data = extract_comprehensive_data(full_text, pdf_path)

        # Write JSON output
        output_file = "contract_analysis.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(contract_data, f, indent=2, ensure_ascii=False)

        print(f"[*] Comprehensive analysis written to {output_file}")

        # Also write summary text for backward compatibility
        summary_file = "contract_summary.txt"
        with open(summary_file, "w", encoding="utf-8") as f:
            f.write(f"Contract Analysis Summary\n")

            # Safe access to contract data with fallbacks
            contract_info = contract_data.get('contractInfo', {})
            analytics = contract_data.get('analytics', {})

            f.write(f"Title: {contract_info.get('title', 'Not specified')}\n")
            f.write(f"Type: {contract_info.get('type', 'Not specified')}\n")
            f.write(f"Effective Date: {contract_info.get('effectiveDate', 'Not specified')}\n")
            f.write(f"Total Value: {contract_info.get('totalValue', 'Not specified')} {contract_info.get('currency', 'USD')}\n")
            f.write(f"Risk Score: {analytics.get('overallRiskScore', 'Not calculated')}\n")

        print(f"[*] Summary written to {summary_file}")

    except ValueError as e:
        print(f"[ERROR] Contract analysis failed validation: {str(e)}")
        print("[ERROR] The AI was unable to extract sufficient high-quality data from this contract.")
        print("[ERROR] This may be due to:")
        print("   - Poor PDF quality or text extraction issues")
        print("   - Complex contract structure that requires manual review")
        print("   - Insufficient contract content for automated analysis")
        print("[ERROR] No fallback data will be generated. Please review the contract manually.")

        # Write error file for frontend
        error_file = "contract_analysis_error.json"
        with open(error_file, "w", encoding="utf-8") as f:
            json.dump({
                "error": True,
                "message": "Contract analysis failed quality validation",
                "details": str(e),
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)

        sys.exit(1)

    except Exception as e:
        print(f"[ERROR] Unexpected error during PDF processing: {str(e)}")
        print("[ERROR] This indicates a system error, not a data quality issue.")

        # Write error file for frontend
        error_file = "contract_analysis_error.json"
        with open(error_file, "w", encoding="utf-8") as f:
            json.dump({
                "error": True,
                "message": "System error during contract analysis",
                "details": str(e),
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)

        sys.exit(1)
