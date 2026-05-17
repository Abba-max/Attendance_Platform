import sys

file_path = 'src/main/resources/static/js/student/student-dashboard.js'
with open(file_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the slotsJson escaping logic
old_slots_json = r"const slotsJson = JSON.stringify(h.hourSlots || []).replace(/'/g, \"\\\\'\");"
new_slots_json = r"const slotsJson = JSON.stringify(h.hourSlots || []).replace(/\"/g, '&quot;').replace(/'/g, \"\\\\'\");"

if old_slots_json in js:
    js = js.replace(old_slots_json, new_slots_json)
else:
    print('Pattern not found')
    sys.exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(js)
