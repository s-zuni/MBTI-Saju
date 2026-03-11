import os
import re

api_dir = r"c:\Users\zxzx7\Desktop\MBTI-Saju\api"

# Pattern to fix: "gemini-3.1-flash-lite-" followed by any whitespace/newline then "-preview"
pattern = re.compile(r'gemini-3\.1-flash-lite-[\r\n\s]+-preview', re.MULTILINE)
replacement = 'gemini-3.1-flash-lite-preview'

for filename in os.listdir(api_dir):
    if not filename.endswith('.ts'):
        continue
    filepath = os.path.join(api_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = pattern.findall(content)
    if matches:
        fixed = pattern.sub(replacement, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f"FIXED {filename}: replaced {len(matches)} occurrence(s)")
        # verify
        with open(filepath, 'r', encoding='utf-8') as f:
            verify = f.read()
        idx = verify.find('gemini-3.1-flash-lite-preview')
        print(f"  Verified at index {idx}: '{verify[idx:idx+35]}'")
    else:
        # Check for other variations
        if 'gemini-3.1' in content:
            idx = content.find('gemini-3.1')
            print(f"OK {filename}: gemini ref at index {idx}: '{content[idx:idx+50]}'")
        else:
            print(f"No gemini ref: {filename}")

print("Done!")
