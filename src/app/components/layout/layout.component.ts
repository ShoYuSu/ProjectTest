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

  // 🌟 1. ประกาศ Signals ควบคุมเมนูหลักตามที่ใช้ใน HTML (แก้ปัญหาตัวแดง/เมนูไม่ขึ้น)
  canViewDashboard = signal(false);
  canViewStaff = signal(false);
  canViewResearch = signal(false);
  canViewTraining = signal(false);
  canViewProjects = signal(false);

  isProfileMenuOpen = false;
  userName: string = 'ADMIN';
  userRoleDisplay: string = 'SYSTEM ADMIN';
  userInitial: string = 'A';

  ngOnInit() {
    // ⭐️ 1. ดักจับข้อมูลที่เพื่อนส่งมาทาง URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const roleFromUrl = urlParams.get('role');
    const userFromUrl = urlParams.get('user');
    const permsFromUrl = urlParams.get('perms');

    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      if (roleFromUrl) localStorage.setItem('role', roleFromUrl);
      if (userFromUrl) localStorage.setItem('full_name', userFromUrl);

      if (permsFromUrl) {
        localStorage.setItem('permissions', decodeURIComponent(permsFromUrl));
      }

      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ⭐️ 2. โค้ดดึงข้อมูลมาแสดงผลบนเมนู
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
    } else if (role === 'student') {
      this.userRoleDisplay = 'STUDENT';
    }

    // ⭐️ 3. ตรวจสอบสิทธิ์ย่อยในการเข้าถึงโมดูลต่างๆ (รองรับโครงสร้างฐานข้อมูลจริง)
    const permsString = localStorage.getItem('permissions') || '';

    // แปลงข้อมูลสิทธิ์ทั้งหมดให้เป็นตัวพิมพ์เล็ก (lowercase) เพื่อป้องกันบั๊กพิมพ์เล็กพิมพ์ใหญ่ไม่ตรงกับ DB
    const permsArray = permsString.split(',').map(p => p.trim().toLowerCase());
    const isAdmin = role === 'admin';

    // เช็คสิทธิ์โดยดูว่ามีชื่อโมดูล + คำว่า view + และต้องไม่เป็นสิทธิ์รูปแบบ none
    this.canViewDashboard.set(isAdmin || permsArray.some(p => p.includes('dashboard') && p.includes('view') && !p.includes('none')));
    this.canViewStaff.set(isAdmin || permsArray.some(p => p.includes('staff_info') && p.includes('view') && !p.includes('none')));
    this.canViewResearch.set(isAdmin || permsArray.some(p => p.includes('research_info') && p.includes('view') && !p.includes('none')));
    this.canViewTraining.set(isAdmin || permsArray.some(p => p.includes('training') && p.includes('view') && !p.includes('none')));
    this.canViewProjects.set(isAdmin || permsArray.some(p => p.includes('plan_project') && p.includes('view') && !p.includes('none')));
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
    event.preventDefault(); // ป้องกันการเปลี่ยนหน้าแบบปกติของแท็ก <a>

    const role = localStorage.getItem('role') || '';
    const token = localStorage.getItem('token') || '';
    const fullName = localStorage.getItem('full_name') || '';

    // 🎯 กำหนด Path ปลายทางตาม Role
    let targetPath = '/home'; // ค่าเริ่มต้นให้ไป /home

    if (role === 'admin') {
      targetPath = '/system-dashboard';
    } else if (role === 'teacher') {
      targetPath = '/home';
    }

    // สร้าง URL ไปที่พอร์ต 4200 พร้อมแนบพารามิเตอร์ยืนยันตัวตน
    const advisorUrl = `http://localhost:4200${targetPath}?role=${role}&token=${token}&user=${fullName}`;

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
