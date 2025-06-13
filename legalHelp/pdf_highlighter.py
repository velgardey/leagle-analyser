#!/usr/bin/env python3
"""
PDF Highlighter Module
Adds colored highlights directly to PDF documents based on risk analysis
"""

import fitz  # PyMuPDF
import json
import sys
import os
from typing import List, Dict, Tuple, Optional

def get_risk_color(risk_level: str) -> Tuple[float, float, float]:
    """Get RGB color values for risk level (0-1 range for PyMuPDF)"""
    colors = {
        "high": (0.937, 0.267, 0.267),     # Red: #ef4444
        "medium": (0.961, 0.620, 0.043),   # Orange: #f59e0b
        "low": (0.133, 0.773, 0.369),      # Green: #22c55e
        "critical": (0.800, 0.000, 0.000), # Dark Red
        "warning": (1.000, 0.647, 0.000),  # Orange
        "info": (0.000, 0.500, 1.000)      # Blue
    }
    return colors.get(risk_level.lower(), (0.612, 0.639, 0.686))  # Default gray

def search_text_in_pdf(doc: fitz.Document, search_text: str, page_num: Optional[int] = None) -> List[Dict]:
    """
    Search for text in PDF and return positions
    Returns list of dictionaries with page, rect coordinates
    """
    results = []
    
    # Determine which pages to search
    pages_to_search = [page_num] if page_num is not None else range(len(doc))
    
    for page_idx in pages_to_search:
        if page_idx >= len(doc):
            continue
            
        page = doc[page_idx]
        
        # Search for the text (case-insensitive)
        text_instances = page.search_for(search_text, flags=fitz.TEXT_DEHYPHENATE)
        
        for rect in text_instances:
            results.append({
                "page": page_idx,
                "rect": rect,
                "text": search_text
            })
    
    return results

def highlight_text_areas(doc: fitz.Document, highlights: List[Dict]) -> int:
    """
    Add highlights to PDF based on highlight definitions
    
    highlights format:
    [
        {
            "text": "text to highlight",
            "risk_level": "high|medium|low",
            "page": optional page number,
            "description": "description of the risk"
        }
    ]
    
    Returns number of highlights added
    """
    highlights_added = 0
    
    for highlight_def in highlights:
        text_to_highlight = highlight_def.get("text", "")
        risk_level = highlight_def.get("risk_level", "medium")
        target_page = highlight_def.get("page")
        description = highlight_def.get("description", "")
        
        if not text_to_highlight:
            continue
        
        # Search for text in PDF
        search_results = search_text_in_pdf(doc, text_to_highlight, target_page)
        
        # Add highlights for each found instance
        for result in search_results:
            page = doc[result["page"]]
            rect = result["rect"]
            color = get_risk_color(risk_level)
            
            # Add highlight annotation
            highlight = page.add_highlight_annot(rect)
            highlight.set_colors(stroke=color)
            highlight.set_opacity(0.4)
            
            # Add note with description if provided
            if description:
                highlight.set_info(content=f"Risk Level: {risk_level.upper()}\n{description}")
            
            highlight.update()
            highlights_added += 1
    
    return highlights_added

def highlight_clause_areas(doc: fitz.Document, clause_risk_map: List[Dict]) -> int:
    """
    Add highlights based on clause risk mapping with improved text detection
    """
    highlights_added = 0

    for clause in clause_risk_map:
        page_num = clause.get("pageNumber", 1) - 1  # Convert to 0-based index
        risk_level = clause.get("riskLevel", "medium")
        description = clause.get("description", "")
        clause_id = clause.get("clause", "")
        position = clause.get("position", {})

        if page_num >= len(doc) or page_num < 0:
            continue

        page = doc[page_num]
        page_rect = page.rect

        # First try to find text by clause number
        clause_found = False
        if clause_id:
            # Try different clause formats
            clause_patterns = [
                clause_id,
                f"Clause {clause_id}",
                f"Section {clause_id}",
                f"{clause_id}.",
                f"Article {clause_id}"
            ]

            for pattern in clause_patterns:
                search_results = search_text_in_pdf(doc, pattern, page_num)
                if search_results:
                    for result in search_results:
                        rect = result["rect"]
                        # Expand the rectangle slightly to include surrounding context
                        expanded_rect = fitz.Rect(
                            max(0, rect.x0 - 10),
                            max(0, rect.y0 - 5),
                            min(page_rect.width, rect.x1 + 200),  # Extend to the right
                            min(page_rect.height, rect.y1 + 20)   # Extend down
                        )

                        color = get_risk_color(risk_level)
                        highlight = page.add_highlight_annot(expanded_rect)
                        highlight.set_colors(stroke=color)
                        highlight.set_opacity(0.3)

                        note_content = f"Clause: {clause_id}\nRisk Level: {risk_level.upper()}"
                        if description:
                            note_content += f"\n{description}"

                        highlight.set_info(content=note_content)
                        highlight.update()
                        highlights_added += 1
                        clause_found = True
                        break

                if clause_found:
                    break

        # Fallback to position-based highlighting only if text search failed
        if not clause_found and position:
            top_pct = position.get("top", 0)
            left_pct = position.get("left", 0)
            width_pct = position.get("width", 100)
            height_pct = position.get("height", 10)

            # Calculate actual coordinates
            x0 = page_rect.width * (left_pct / 100)
            y0 = page_rect.height * (top_pct / 100)
            x1 = x0 + (page_rect.width * (width_pct / 100))
            y1 = y0 + (page_rect.height * (height_pct / 100))

            rect = fitz.Rect(x0, y0, x1, y1)

            # Check if there's actual text in this area and it's not just whitespace
            text_in_area = page.get_text("text", clip=rect).strip()
            # Also check text density - avoid highlighting areas with very little text
            if text_in_area and len(text_in_area) > 5:  # Only highlight if there's substantial text
                color = get_risk_color(risk_level)
                highlight = page.add_highlight_annot(rect)
                highlight.set_colors(stroke=color)
                highlight.set_opacity(0.3)

                note_content = f"Clause: {clause_id}\nRisk Level: {risk_level.upper()}"
                if description:
                    note_content += f"\n{description}"

                highlight.set_info(content=note_content)
                highlight.update()
                highlights_added += 1

    return highlights_added

def create_highlighted_pdf(input_pdf_path: str, contract_data: Dict, output_pdf_path: str) -> Dict:
    """
    Create a highlighted version of the PDF based on contract analysis data
    
    Returns:
        Dict with success status and statistics
    """
    try:
        # Open the PDF
        doc = fitz.open(input_pdf_path)
        
        highlights_added = 0
        
        # Method 1: Highlight based on clause risk mapping
        clause_risk_map = contract_data.get("clauseRiskMap", [])
        if clause_risk_map:
            highlights_added += highlight_clause_areas(doc, clause_risk_map)
        
        # Method 2: Highlight based on risk descriptions (fallback)
        risks = contract_data.get("risks", [])
        risk_highlights = []
        
        for risk in risks:
            # Try to find key phrases from risk titles and descriptions
            title = risk.get("title", "")
            description = risk.get("description", "")
            category = risk.get("category", "medium")
            
            # Extract key phrases to highlight
            key_phrases = []
            
            # Look for specific terms in the title
            if "automatic renewal" in title.lower():
                key_phrases.append("automatic renewal")
                key_phrases.append("automatically renew")
            
            if "exclusive" in title.lower():
                key_phrases.append("exclusive")
                key_phrases.append("sole and exclusive")
            
            if "termination" in title.lower():
                key_phrases.append("termination")
                key_phrases.append("terminate")
            
            if "intellectual property" in title.lower():
                key_phrases.append("intellectual property")
                key_phrases.append("IP")
            
            # Add phrases to highlight list
            for phrase in key_phrases:
                risk_highlights.append({
                    "text": phrase,
                    "risk_level": category.lower(),
                    "description": f"{title}: {description[:100]}..."
                })
        
        # Apply risk-based highlights
        if risk_highlights:
            highlights_added += highlight_text_areas(doc, risk_highlights)
        
        # Method 3: Highlight party names
        parties = contract_data.get("contractInfo", {}).get("parties", [])
        for party in parties:
            name = party.get("name", "")
            if name and len(name) > 5:  # Only highlight substantial names
                risk_highlights.append({
                    "text": name,
                    "risk_level": "info",
                    "description": f"Contract Party: {party.get('role', 'Unknown Role')}"
                })
        
        # Apply party highlights
        if len(risk_highlights) > len(risks):  # Only if we added party highlights
            highlights_added += highlight_text_areas(doc, risk_highlights[len(risks):])
        
        # Save the highlighted PDF
        doc.save(output_pdf_path)
        doc.close()
        
        return {
            "success": True,
            "highlights_added": highlights_added,
            "output_file": output_pdf_path,
            "message": f"Successfully added {highlights_added} highlights to PDF"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "highlights_added": 0,
            "message": f"Failed to create highlighted PDF: {str(e)}"
        }

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 3:
        print("Usage: python pdf_highlighter.py <input_pdf> <contract_analysis_json> [output_pdf]")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    analysis_json = sys.argv[2]
    output_pdf = sys.argv[3] if len(sys.argv) > 3 else "highlighted_contract.pdf"
    
    if not os.path.exists(input_pdf):
        print(f"Error: Input PDF not found: {input_pdf}")
        sys.exit(1)
    
    if not os.path.exists(analysis_json):
        print(f"Error: Analysis JSON not found: {analysis_json}")
        sys.exit(1)
    
    # Load contract analysis data
    try:
        with open(analysis_json, 'r', encoding='utf-8') as f:
            contract_data = json.load(f)
    except Exception as e:
        print(f"Error loading analysis JSON: {e}")
        sys.exit(1)
    
    # Create highlighted PDF
    result = create_highlighted_pdf(input_pdf, contract_data, output_pdf)
    
    if result["success"]:
        print(f"✓ {result['message']}")
        print(f"✓ Output saved to: {output_pdf}")
    else:
        print(f"✗ {result['message']}")
        sys.exit(1)

if __name__ == "__main__":
    main()
