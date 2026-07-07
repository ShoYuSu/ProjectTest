import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  public router = inject(Router); // 🌟 เปลี่ยนเป็น public เพื่อให้ HTML เช็ค URL ทำสี Highlight ได้
  private http = inject(HttpClient);

  isStaffExpanded = signal(false);
  isResearchExpanded = signal(false);
  isSidebarOpen = signal(false);
  isMiniSidebar = signal(false);

  // Signals ควบคุมเมนูหลักตามสิทธิ์จากฐานข้อมูลจริงเท่านั้น
  canViewDashboard = signal(false);
  canViewStaff = signal(false);
  canViewResearch = signal(false);
  canViewTraining = signal(false);
  canViewProjects = signal(false);

  // คงไว้สำหรับระบบที่ปรึกษาของเพื่อน (เช็คสิทธิ์ผ่าน Role)
  canViewAdvisorSystem = signal(false); 

  // Signals ควบคุม Dropdown รายภาควิชาของโมดูล Staff
  canViewAllDepts = signal(true); 
  userDept = signal<string>('');   

  isProfileMenuOpen = false;
  userName: string = 'USER';
  userRoleDisplay: string = 'MEMBER';
  userInitial: string = 'U';

  ngOnInit() {
    // 🌟 กางเมนู Dropdown ค้างไว้อัตโนมัติเวลา Refresh หน้าเว็บ
    if (this.router.url.includes('/staff') && !this.router.url.includes('profile')) {
      this.isStaffExpanded.set(true);
    }
    if (this.router.url.includes('/research')) {
      this.isResearchExpanded.set(true);
    }

    this.handleUrlParams();
    this.loadUserProfile();
    this.fetchPermissionsFromDB();
  }

  // 🛡️ จัดการ Parameter ที่ส่งมาจากระบบ Login กลาง
  handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const roleFromUrl = urlParams.get('role');
    const userFromUrl = urlParams.get('user');
    const deptFromUrl = urlParams.get('dept'); 
    const isAdvisorFromUrl = urlParams.get('is_advisor'); 
    
    // รับค่า user_id จริงๆ จากระบบล็อกอินหลัก
    const userIdFromUrl = urlParams.get('user_id') || urlParams.get('userId') || urlParams.get('uid');

    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      if (roleFromUrl) localStorage.setItem('role', roleFromUrl);
      if (userFromUrl) localStorage.setItem('full_name', userFromUrl);
      if (userIdFromUrl) localStorage.setItem('user_id', userIdFromUrl); // บันทึก ID จริงลงเครื่อง
      if (deptFromUrl) localStorage.setItem('user_dept', deptFromUrl.toLowerCase());
      if (isAdvisorFromUrl !== null) localStorage.setItem('is_advisor', isAdvisorFromUrl);
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // ใช้ Role เพื่อแสดงผลข้อความในป้ายโปรไฟล์ และตั้งค่าพื้นฐานเท่านั้น
  loadUserProfile() {
    const role = localStorage.getItem('role');
    const fullName = localStorage.getItem('full_name');

    if (fullName) {
      this.userName = fullName;
      this.userInitial = fullName.charAt(0).toUpperCase();
    }

    if (role === 'admin') {
      this.userRoleDisplay = 'SYSTEM ADMIN';
    } else if (role === 'teacher') {
      this.userRoleDisplay = 'TEACHER / LECTURER';
      if (!localStorage.getItem('user_dept')) {
        localStorage.setItem('user_dept', 'physics');
      }
    } else if (role === 'student') {
      this.userRoleDisplay = 'STUDENT';
    }

    this.userDept.set(localStorage.getItem('user_dept') || '');
  }

  // 🛡️ ดึงสิทธิ์การเปิด/ปิดเมนูจากฐานข้อมูลสดๆ
  fetchPermissionsFromDB() {
    const role = localStorage.getItem('role') || '';
    const currentUserId = localStorage.getItem('user_id') || '0';
    const isAdvisor = localStorage.getItem('is_advisor') === 'true';

    // ส่วนนี้ตรวจสอบ Role เพื่อระบบที่ปรึกษาของเพื่อนตามที่คุณต้องการ
    this.canViewAdvisorSystem.set(role === 'admin' || role === 'student' || (role === 'teacher' && isAdvisor));

    // ทุกคน (รวมถึง Admin) ต้องยิงเช็คสิทธิ์การเข้าถึงโมดูลจากฐานข้อมูลจริงทั้งหมด
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);
    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (perms) => {
          if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
            
            const checkViewScope = (keyword: string) => {
              const key = Object.keys(perms).find(k => k.toLowerCase().includes(keyword.toLowerCase()));
              if (key && perms[key] && perms[key]['view']) {
                return perms[key]['view'].toLowerCase() !== 'none';
              }
              return false;
            };

            const getStaffScope = () => {
              const key = Object.keys(perms).find(k => k.toLowerCase().includes('staff'));
              return (key && perms[key] && perms[key]['view']) ? perms[key]['view'].toLowerCase() : 'none';
            };

            // กำหนดการแสดงผลเมนูจากสิทธิ์จริงในฐานข้อมูล
            this.canViewDashboard.set(checkViewScope('dashboard'));
            this.canViewStaff.set(checkViewScope('staff'));
            this.canViewResearch.set(checkViewScope('research'));
            this.canViewTraining.set(checkViewScope('training'));
            this.canViewProjects.set(checkViewScope('plan') || checkViewScope('project'));

            // เช็คว่าต้องบังคับกรองเฉพาะภาควิชาตนเองหรือไม่
            this.canViewAllDepts.set(getStaffScope() !== 'department');
          }
        },
        error: (err) => console.error('ไม่สามารถดึงสิทธิ์การเข้าถึงเมนูจากฐานข้อมูลได้', err)
      });
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logout() {
    localStorage.clear();
    this.isProfileMenuOpen = false;
    window.location.href = 'http://localhost:4200/login?action=logout';
  }

  // ส่งค่าไประบบที่ปรึกษาของเพื่อน โดยใช้ข้อมูล Token และ Role ตามเดิม
  goToAdvisorSystem(event: Event) {
    event.preventDefault();
    const role = localStorage.getItem('role') || '';
    const token = localStorage.getItem('token') || '';
    const fullName = localStorage.getItem('full_name') || '';

    const path = role === 'teacher' ? 'home' : 'system-dashboard';
    const advisorUrl = `http://localhost:4200/${path}?role=${role}&token=${token}&user=${encodeURIComponent(fullName)}`;
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

  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) {
      this.isSidebarOpen.set(false);
    }
  }
}