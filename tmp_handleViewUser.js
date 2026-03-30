async function handleViewUser(userId) {
    openDetailModal('User Details', `Information for user #${userId}`);
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user details');
        const user = await response.json();
        
        const bodyEl = document.getElementById('detailModalBody');
        bodyEl.innerHTML = `
            <div class="space-y-6 text-slate-700">
                <div class="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div class="w-16 h-16 bg-[#00B0FF] bg-opacity-10 rounded-2xl flex items-center justify-center text-[#00B0FF] text-2xl font-bold">
                        ${(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-slate-800">${escapeHtml(user.firstName || '')} ${escapeHtml(user.lastName || '')}</h4>
                        <p class="text-slate-500">${escapeHtml(user.username)}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                        <p class="font-bold text-slate-800">${escapeHtml(user.email || 'No email')}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                            ${user.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Roles</p>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${(user.roleNames || []).map(roleName => `
                            <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-tight">
                                ${escapeHtml(roleName)}
                            </span>
                        `).join('') || '<p class="text-sm text-slate-400 italic">No roles assigned</p>'}
                    </div>
                </div>

                <!-- Role Specific Details -->
                ${(user.roleNames || []).includes('PEDAGOGIC_ASSISTANT') || (user.roleNames || []).includes('PA_ASSISTANT') ? `
                <div class="grid grid-cols-1 gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div>
                        <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Handled Departments</p>
                        <div class="flex flex-wrap gap-1 mt-1">
                            ${(user.handledDepartmentNames || []).map(dept => `
                                <span class="px-2 py-0.5 bg-white text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-100">${escapeHtml(dept)}</span>
                            `).join('') || '<span class="text-xs text-emerald-400 italic">None</span>'}
                        </div>
                    </div>
                    <div class="mt-2">
                        <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Handled Specialities</p>
                        <div class="flex flex-wrap gap-1 mt-1">
                            ${(user.handledSpecialityNames || []).map(spec => `
                                <span class="px-2 py-0.5 bg-white text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-100">${escapeHtml(spec)}</span>
                            `).join('') || '<span class="text-xs text-emerald-400 italic">None</span>'}
                        </div>
                    </div>
                </div>
                ` : ''}

                ${(user.roleNames || []).includes('TEACHER') ? `
                <div class="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <p class="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Taught Courses</p>
                    <div class="flex flex-wrap gap-1 mt-1">
                        ${(user.taughtCourseNames || []).map(course => `
                            <span class="px-2 py-0.5 bg-white text-orange-700 rounded-md text-[10px] font-bold border border-orange-100">${escapeHtml(course)}</span>
                        `).join('') || '<span class="text-xs text-orange-400 italic">No courses assigned</span>'}
                    </div>
                </div>
                ` : ''}

                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Effective Permissions</p>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        ${allPermissions
                            .filter(perm => (user.effectivePermissionIds || []).includes(perm.permissionId))
                            .map(perm => `
                                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span class="text-xs font-medium text-slate-600">${escapeHtml(perm.name)}</span>
                                </div>
                            `).join('') || '<div class="col-span-2 py-4 text-center text-slate-400 italic text-xs">No active permissions</div>'}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error viewing user:', error);
        document.getElementById('detailModalBody').innerHTML = `
            <div class="p-8 text-center text-red-500">
                <p class="font-bold">Error loading user details</p>
                <p class="text-sm mt-1">${error.message}</p>
            </div>
        `;
    }
}
