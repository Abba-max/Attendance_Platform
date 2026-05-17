import sys

with open('src/main/resources/templates/dashboards/student/student.html', 'r', encoding='utf-8') as f:
    content = f.read()

with open('student_views_patch.html', 'r', encoding='utf-8') as f:
    patch = f.read()

start_marker = '<!-- VIEW: JUSTIFICATIONS & HISTORY -->'
end_marker = '<!-- END VIEWS -->'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Markers not found')
    sys.exit(1)

# include the start marker in replacement or not?
# The patch starts with <!-- Mobile List View --> which is BEFORE view-justification.
# So I should find the end of view-calendar matrix and replace from there to END VIEWS.
# Actually, the patch contains:
# <!-- Mobile List View -->
# ...
# <!-- END VIEWS -->

# Let's find the exact place to insert.
# The matrix ends with:
#                             <!-- Dynamic Content from JS -->
#                         </div>
#                     </div>
#                 </div>
# 
#                 <!-- VIEW: JUSTIFICATIONS & HISTORY -->

# Let's find <!-- VIEW: JUSTIFICATIONS & HISTORY -->
# We will insert the patch starting exactly at <!-- VIEW: JUSTIFICATIONS & HISTORY -->,
# BUT the patch ALREADY contains <!-- VIEW: JUSTIFICATIONS & HISTORY --> inside it!
# Wait, the patch starts with <!-- Mobile List View --> which we need to insert BEFORE <!-- VIEW: JUSTIFICATIONS & HISTORY -->.
# So we can replace from <!-- VIEW: JUSTIFICATIONS & HISTORY --> to <!-- END VIEWS --> inclusive, 
# and prepend <!-- Mobile List View --> block from the patch.

# Let's just replace from <!-- VIEW: JUSTIFICATIONS & HISTORY --> to <!-- END VIEWS --> 
# with the contents of the patch.
new_content = content[:start_idx] + patch + content[end_idx + len(end_marker):]

with open('src/main/resources/templates/dashboards/student/student.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Successfully patched student.html')
