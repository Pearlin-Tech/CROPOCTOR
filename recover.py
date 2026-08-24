import json
import sys

transcript_path = "/Users/pearlindadhania/.gemini/antigravity-ide/brain/0ad9bf4f-383f-4c5c-8266-4c99593c3bb8/.system_generated/logs/transcript_full.jsonl"
found_lines = {}
max_line = 0

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if 'cropDoctorService.ts' in content and 'The following code has been modified' in content:
                # parse lines
                parts = content.split('\n')
                for p in parts:
                    if ':' in p:
                        prefix = p.split(':')[0]
                        if prefix.isdigit():
                            lineno = int(prefix)
                            text = p[len(prefix)+2:] # remove ": "
                            if lineno not in found_lines:
                                found_lines[lineno] = text
                            max_line = max(max_line, lineno)
        except Exception:
            pass

with open('/tmp/recovered_crop_doctor.ts', 'w') as out:
    for i in range(1, max_line + 1):
        out.write(found_lines.get(i, f"// missing line {i}\n") + '\n')

print(f"Recovered up to line {max_line}")
