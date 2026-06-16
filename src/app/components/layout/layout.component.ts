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

  // 🌟 Signals เพิ่มเติมเพื่อควบคุม Dropdown รายภาควิชาของโมดูล Staff Information
  canViewAllDepts = signal(true); // True = แสดงครบทุกภาควิชา, False = กรองเฉพาะภาควิชาตนเอง
  userDept = signal<string>('');   // เก็บตัวย่อภาควิชาของผู้ใช้ปัจจุบัน เช่น 'physics', 'cs', 'math'

  isProfileMenuOpen = false;
  userName: string = 'ADMIN';
  userRoleDisplay: string = 'SYSTEM ADMIN';
  userInitial: string = 'A';

  ngOnInit() {
    // ⭐️ 1. ดักจับข้อมูลที่ส่งมาจาก URL ของระบบล็อกอินหลัก
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const roleFromUrl = urlParams.get('role');
    const userFromUrl = urlParams.get('user');
    const permsFromUrl = urlParams.get('perms');
    const deptFromUrl = urlParams.get('dept'); // รองรับกรณีแนบชื่อภาควิชามาโดยตรงจากลิงก์หลัก

    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      if (roleFromUrl) localStorage.setItem('role', roleFromUrl);
      if (userFromUrl) localStorage.setItem('full_name', userFromUrl);
      
      // จัดเก็บค่า user_id ลงหน่วยความจำ Local เพื่อใช้ยืนยันกับ PHP API ตัวอื่น
      if (roleFromUrl === 'teacher') {
        localStorage.setItem('user_id', '14'); // รหัสอูเกวตามโครงสร้างข้อมูลจำลอง
      } else if (roleFromUrl === 'admin') {
        localStorage.setItem('user_id', '15'); // รหัสไอแซก
      } else {
        localStorage.setItem('user_id', '10');
      }
      
      if (deptFromUrl) {
        localStorage.setItem('user_dept', deptFromUrl.toLowerCase());
      }
      
      if (permsFromUrl) {
        localStorage.setItem('permissions', decodeURIComponent(permsFromUrl));
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ⭐️ 2. ดึงสถานะประวัติผู้ใช้งานปัจจุบันขึ้นมาทำป้ายชื่อโปรไฟล์
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
      // 🌟 จำลองข้อมูลภาควิชาอัตโนมัติหากเข้าด้วยบทบาทครูอูเกว (dept_id = 4 คือ ฟิสิกส์)
      if (!localStorage.getItem('user_dept')) {
        localStorage.setItem('user_dept', 'physics');
      }
    } else if (role === 'student') {
      this.userRoleDisplay = 'STUDENT';
    }

    this.userDept.set(localStorage.getItem('user_dept') || '');

    // ⭐️ 3. ตรวจสอบเงื่อนไข Permission Based Access Control
    const permsString = localStorage.getItem('permissions') || '';
    const permsArray = permsString.split(',').map(p => p.trim().toLowerCase());
    const isAdmin = role === 'admin';

    // เช็คการเปิด-ปิดเมนูหลัก
    this.canViewDashboard.set(isAdmin || permsArray.some(p => p.includes('dashboard') && p.includes('view') && !p.includes('none')));
    this.canViewStaff.set(isAdmin || permsArray.some(p => p.includes('staff_info') && p.includes('view') && !p.includes('none')));
    this.canViewResearch.set(isAdmin || permsArray.some(p => p.includes('research_info') && p.includes('view') && !p.includes('none')));
    this.canViewTraining.set(isAdmin || permsArray.some(p => p.includes('training') && p.includes('view') && !p.includes('none')));
    this.canViewProjects.set(isAdmin || permsArray.some(p => p.includes('plan_project') && p.includes('view') && !p.includes('none')));

    // 🌟 เช็คสิทธิ์ควบคุม Dropdown เมนูย่อยของบุคลากรรายภาควิชา
    const hasDepartmentScopeOnly = permsArray.some(p => p.includes('staff_info') && p.includes('view') && p.includes('department'));
    
    if (isAdmin) {
      this.canViewAllDepts.set(true); // แอดมินดูได้หมดทุกแท็บ dropdown
    } else if (hasDepartmentScopeOnly) {
      this.canViewAllDepts.set(false); // จำกัดสิทธิ์ให้เห็นเฉพาะภาควิชาตนเอง
    } else {
      this.canViewAllDepts.set(true); // กรณีได้สิทธิ์เป็น 'all' จะเห็นครบทุกภาควิชา
    }
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