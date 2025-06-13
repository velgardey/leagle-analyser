#!/usr/bin/env python3

import json

# Test the AI response parsing
with open("ai_response_debug.txt", "r", encoding="utf-8") as f:
    ai_response = f.read()

print(f"AI response length: {len(ai_response)}")

# Try to extract JSON
import re
json_match = re.search(r'```json\s*(.*?)\s*```', ai_response, re.DOTALL)
if json_match:
    json_text = json_match.group(1)
    print(f"Extracted JSON length: {len(json_text)}")
    try:
        ai_data = json.loads(json_text)
        print(f"Successfully parsed JSON")
        print(f"AI data type: {type(ai_data)}")
        print(f"AI data keys: {list(ai_data.keys())}")
        
        # Test party conversion
        parties_data = ai_data.get("parties", [])
        print(f"Parties data: {parties_data}")
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed: {e}")
else:
    print("No JSON found in AI response")
