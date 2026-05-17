import sys

with open('src/main/resources/templates/dashboards/student/student.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add missing Absences button to mobile nav
old_nav = '''            <button onclick="switchTab('calendar')" id="nav-mob-calendar" class="nav-mobile flex flex-col items-center gap-1 w-16 py-1">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="text-[10px] font-medium">Schedule</span>
            </button>'''

new_nav = '''            <button onclick="switchTab('calendar')" id="nav-mob-calendar" class="nav-mobile flex flex-col items-center gap-1 w-16 py-1">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="text-[10px] font-medium">Schedule</span>
            </button>
            <button onclick="switchTab('justification')" id="nav-mob-justification" class="nav-mobile flex flex-col items-center gap-1 w-16 py-1">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span class="text-[10px] font-medium">Absences</span>
            </button>'''

html = html.replace(old_nav, new_nav)

# Remove TAB_MAP and switchTab from student.html script block
start_marker = '    //  Tab / View Switcher '
end_marker = '    //  Settings UI & API calls '

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx != -1 and end_idx != -1:
    html = html[:start_idx] + html[end_idx:]

with open('src/main/resources/templates/dashboards/student/student.html', 'w', encoding='utf-8') as f:
    f.write(html)
