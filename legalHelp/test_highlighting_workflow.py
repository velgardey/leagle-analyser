#!/usr/bin/env python3
"""
Test script to verify the PDF highlighting workflow and identify optimizations
"""

import os
import sys
import json
import fitz  # PyMuPDF
from pdf_highlighter import create_highlighted_pdf, get_risk_color, search_text_in_pdf

def test_highlighting_workflow():
    """Test the complete PDF highlighting workflow"""
    
    print("🔍 Testing PDF Highlighting Workflow")
    print("=" * 50)
    
    # Check if required files exist
    pdf_file = "temp_contract.pdf"
    json_file = "contract_analysis.json"
    output_file = "test_highlighted_output.pdf"
    
    if not os.path.exists(pdf_file):
        print(f"❌ PDF file not found: {pdf_file}")
        return False
    
    if not os.path.exists(json_file):
        print(f"❌ JSON file not found: {json_file}")
        return False
    
    print(f"✅ Input files found")
    print(f"   📄 PDF: {pdf_file} ({os.path.getsize(pdf_file)} bytes)")
    print(f"   📊 JSON: {json_file} ({os.path.getsize(json_file)} bytes)")
    
    # Load contract analysis data
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            contract_data = json.load(f)
        print(f"✅ Contract data loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load contract data: {e}")
        return False
    
    # Analyze contract data structure
    print("\n📊 Contract Data Analysis:")
    print(f"   • Parties: {len(contract_data.get('contractInfo', {}).get('parties', []))}")
    print(f"   • Risks: {len(contract_data.get('risks', []))}")
    print(f"   • Timeline Events: {len(contract_data.get('timeline', []))}")
    print(f"   • Key Terms: {len(contract_data.get('keyTerms', []))}")
    print(f"   • Products: {len(contract_data.get('products', []))}")
    print(f"   • Clause Risk Map: {len(contract_data.get('clauseRiskMap', []))}")
    
    # Analyze clause risk map for highlighting
    clause_risk_map = contract_data.get('clauseRiskMap', [])
    if clause_risk_map:
        print(f"\n🎯 Clause Risk Map Analysis:")
        risk_levels = {}
        for clause in clause_risk_map:
            level = clause.get('riskLevel', 'unknown')
            risk_levels[level] = risk_levels.get(level, 0) + 1
        
        for level, count in risk_levels.items():
            print(f"   • {level.title()}: {count} clauses")
    
    # Test PDF highlighting
    print(f"\n🎨 Testing PDF Highlighting...")
    result = create_highlighted_pdf(pdf_file, contract_data, output_file)
    
    if result["success"]:
        print(f"✅ Highlighting successful!")
        print(f"   • Highlights added: {result['highlights_added']}")
        print(f"   • Output file: {result['output_file']}")
        print(f"   • File size: {os.path.getsize(output_file)} bytes")
        
        # Verify the highlighted PDF
        try:
            doc = fitz.open(output_file)
            total_pages = len(doc)
            total_annotations = 0
            
            for page_num in range(total_pages):
                page = doc[page_num]
                annotations = page.annots()
                page_annotations = len(list(annotations))
                total_annotations += page_annotations
                if page_annotations > 0:
                    print(f"   • Page {page_num + 1}: {page_annotations} annotations")
            
            doc.close()
            print(f"   • Total annotations: {total_annotations}")
            
        except Exception as e:
            print(f"⚠️  Could not verify annotations: {e}")
        
    else:
        print(f"❌ Highlighting failed: {result['message']}")
        return False
    
    # Test text search functionality
    print(f"\n🔍 Testing Text Search Functionality...")
    try:
        doc = fitz.open(pdf_file)
        
        # Test searching for party names
        parties = contract_data.get('contractInfo', {}).get('parties', [])
        search_results = 0
        
        for party in parties[:2]:  # Test first 2 parties
            name = party.get('name', '')
            if name and len(name) > 5:
                results = search_text_in_pdf(doc, name)
                search_results += len(results)
                print(f"   • Found '{name}': {len(results)} instances")
        
        doc.close()
        print(f"   • Total search results: {search_results}")
        
    except Exception as e:
        print(f"⚠️  Text search test failed: {e}")
    
    # Test risk color mapping
    print(f"\n🎨 Testing Risk Color Mapping...")
    risk_levels = ['high', 'medium', 'low', 'info']
    for level in risk_levels:
        color = get_risk_color(level)
        print(f"   • {level.title()}: {color}")
    
    print(f"\n✅ Highlighting workflow test completed successfully!")
    return True

def analyze_optimization_opportunities():
    """Analyze potential optimization opportunities"""
    
    print(f"\n🚀 Optimization Analysis:")
    print("=" * 50)
    
    # Check if contract analysis has good clause positioning data
    try:
        with open("contract_analysis.json", 'r', encoding='utf-8') as f:
            contract_data = json.load(f)
        
        clause_risk_map = contract_data.get('clauseRiskMap', [])
        
        print(f"📊 Clause Risk Map Quality:")
        if not clause_risk_map:
            print("   ❌ No clause risk map data - highlighting will be limited")
            return
        
        position_quality = 0
        for clause in clause_risk_map:
            position = clause.get('position', {})
            if all(key in position for key in ['top', 'left', 'width', 'height']):
                position_quality += 1
        
        quality_percentage = (position_quality / len(clause_risk_map)) * 100
        print(f"   • Position data quality: {quality_percentage:.1f}% ({position_quality}/{len(clause_risk_map)})")
        
        if quality_percentage < 80:
            print("   ⚠️  Recommendation: Improve clause position detection for better highlighting")
        else:
            print("   ✅ Good position data quality")
        
        # Check risk score distribution
        risk_scores = [clause.get('riskScore', 0) for clause in clause_risk_map]
        if risk_scores:
            avg_risk = sum(risk_scores) / len(risk_scores)
            print(f"   • Average risk score: {avg_risk:.1f}")
            print(f"   • Risk score range: {min(risk_scores)} - {max(risk_scores)}")
        
    except Exception as e:
        print(f"❌ Could not analyze optimization opportunities: {e}")

if __name__ == "__main__":
    print("🧪 PDF Highlighting Workflow Test")
    print("=" * 60)
    
    success = test_highlighting_workflow()
    
    if success:
        analyze_optimization_opportunities()
        print(f"\n🎉 All tests completed successfully!")
    else:
        print(f"\n❌ Tests failed!")
        sys.exit(1)
