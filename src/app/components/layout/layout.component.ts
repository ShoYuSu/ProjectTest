import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  private router = inject(Router);

  isStaffExpanded = signal(false);
  isResearchExpanded = signal(false);
  isSidebarOpen = signal(false);
  isMiniSidebar = signal(false);

  // Signals ควบคุมเมนูหลักตามสิทธิ์การเข้าถึงโมดูล
  canViewDashboard = signal(false);
  canViewStaff = signal(false);
  canViewResearch = signal(false);
  canViewTraining = signal(false);
  canViewProjects = signal(false);

  // Signals เพิ่มเติมเพื่อควบคุม Dropdown รายภาควิชา
  canViewAllDepts = signal(true); 
  userDept = signal<string>('');   

  isProfileMenuOpen = false;
  userName: string = 'ADMIN';
  userRole: string = 'ผู้ดูแลระบบ';
  userImage: string = 'https://upload.wikimedia.org/wikipedia/th/thumb/a/a2/Siam_University_logo.png/200px-Siam_University_logo.png';

  // 🌟 เพิ่มตัวแปร Getter สำหรับดึงตัวอักษรย่อชื่อผู้ใช้ (แก้ Error: userInitial)
  get userInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
  }

  // 🌟 เพิ่มตัวแปร Getter สำหรับดึงชื่อตำแหน่ง/สิทธิ์ (แก้ Error: userRoleDisplay)
  get userRoleDisplay(): string {
    return this.userRole;
  }

  ngOnInit() {
    this.loadUserProfile();
    this.checkPermissions();

    const currentUrl = this.router.url;
    if (currentUrl.includes('/staff')) {
      this.isStaffExpanded.set(true);
    }
    if (currentUrl.includes('/research')) {
      this.isResearchExpanded.set(true);
    }
  }

  loadUserProfile() {
    const role = localStorage.getItem('role') || 'student';
    const fullName = localStorage.getItem('full_name') || 'ผู้ใช้งานระบบ';
    const imageUrl = localStorage.getItem('img_profile');

    this.userName = fullName;
    if (role === 'admin') this.userRole = 'ผู้ดูแลระบบ';
    else if (role === 'teacher') this.userRole = 'อาจารย์/บุคลากร';
    else this.userRole = 'นักศึกษา';

    if (imageUrl) {
      this.userImage = imageUrl.startsWith('http') ? imageUrl : `http://localhost:8080/api/${imageUrl.replace(/^\//, '')}`;
    }
  }

  checkPermissions() {
    const permsString = localStorage.getItem('permissions') || '';
    const myDeptId = localStorage.getItem('dept_id') || '';
    console.log('📦 Permissions ใน Layout ตอนนี้คือ:', permsString);

    switch (myDeptId) {
      case '1': this.userDept.set('chemistry'); break;
      case '2': this.userDept.set('math'); break;
      case '3': this.userDept.set('cs'); break;
      case '4': this.userDept.set('physics'); break;
      case '5': this.userDept.set('food-tech'); break;
      default: this.userDept.set('');
    }

    let viewDash = false;
    let viewStaff = false;
    let viewResearch = false;
    let viewTraining = false;
    let viewProjects = false;
    let viewAllDepts = false;

    if (permsString && !permsString.startsWith('[') && !permsString.startsWith('{')) {
      const permsArray = permsString.split(','); 
      for (const p of permsArray) {
        const parts = p.split(':'); 
        if (parts.length >= 3) {
          const moduleName = parts[0].trim().toLowerCase();
          const action = parts[1].trim().toLowerCase();
          const scope = parts[2].trim().toLowerCase();

          if (action === 'view' && scope !== 'none') {
            if (moduleName.includes('dashboard')) viewDash = true;
            if (moduleName.includes('staff')) {
              viewStaff = true;
              if (scope === 'all') viewAllDepts = true;
            }
            if (moduleName.includes('research')) viewResearch = true;
            if (moduleName.includes('training')) viewTraining = true;
            if (moduleName.includes('plan') || moduleName.includes('project')) viewProjects = true;
          }
        }
      }
    } else {
      try {
        const permsObj = JSON.parse(permsString);
        if (Array.isArray(permsObj)) {
          permsObj.forEach(p => {
            if (p.action?.toLowerCase() === 'view' && p.scope?.toLowerCase() !== 'none') {
              const mod = p.module_name?.toLowerCase() || '';
              if (mod.includes('dashboard')) viewDash = true;
              if (mod.includes('staff')) {
                viewStaff = true;
                if (p.scope?.toLowerCase() === 'all') viewAllDepts = true;
              }
              if (mod.includes('research')) viewResearch = true;
              if (mod.includes('training')) viewTraining = true;
              if (mod.includes('plan') || mod.includes('project')) viewProjects = true;
            }
          });
        }
      } catch (e) { 
        console.error('อ่านค่า Permissions ใน Layout ไม่สำเร็จ:', e);
      }
    }

    this.canViewDashboard.set(viewDash);
    this.canViewStaff.set(viewStaff);
    this.canViewResearch.set(viewResearch);
    this.canViewTraining.set(viewTraining);
    this.canViewProjects.set(viewProjects);
    this.canViewAllDepts.set(viewAllDepts);
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logout() {
    localStorage.clear();
    this.isProfileMenuOpen = false;
    window.location.href = 'http://localhost:4200/login?action=logout';
  }

  goToAdvisorSystem(event: Event) {
    event.preventDefault();
    const role = localStorage.getItem('role') || '';
    const token = localStorage.getItem('token') || '';
    const fullName = localStorage.getItem('full_name') || '';
    const advisorUrl = `http://localhost:4200/home?role=${role}&token=${token}&user=${fullName}`;
    window.location.href = advisorUrl;
  }

  toggleMiniSidebar() {
    this.isMiniSidebar.set(!this.isMiniSidebar());
    if (this.isMiniSidebar()) {
      this.isStaffExpanded.set(false);
      this.isResearchExpanded.set(false);
    }
  }

  toggleStaff() {
    if (this.isMiniSidebar()) this.isMiniSidebar.set(false);
    this.isStaffExpanded.set(!this.isStaffExpanded());
  }

  toggleResearch() {
    if (this.isMiniSidebar()) this.isMiniSidebar.set(false);
    this.isResearchExpanded.set(!this.isResearchExpanded());
  }

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  // 🌟 เพิ่มฟังก์ชันสำหรับปิด Sidebar เมื่อหน้าจอเป็นมือถือ (แก้ Error: closeSidebarOnMobile)
  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) { // 1024px คือจุดตัด (Breakpoint) สำหรับหน้าจอใหญ่ใน Tailwind
      this.isSidebarOpen.set(false);
    }
  }
}