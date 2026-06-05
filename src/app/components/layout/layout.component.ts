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

  isProfileMenuOpen = false;
  userName: string = 'ADMIN';
  userRoleDisplay: string = 'SYSTEM ADMIN';
  userInitial: string = 'A';

ngOnInit() {
    // ⭐️ 1. ดักจับข้อมูล (Token, Role, User) ที่เพื่อนส่งมาทาง URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const roleFromUrl = urlParams.get('role');
    const userFromUrl = urlParams.get('user');

    // ถ้ามี Token ส่งมาทาง URL ให้เอามาเซฟลงความจำของ 4201 
    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      if (roleFromUrl) localStorage.setItem('role', roleFromUrl);
      if (userFromUrl) localStorage.setItem('full_name', userFromUrl);
      
      // ลบ Query ออกจาก URL เพื่อความสวยงาม (Optional)
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ⭐️ 2. โค้ดเดิมของคุณที่ดึงข้อมูลมาแสดงผล
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
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logout() {
    localStorage.clear();
    this.isProfileMenuOpen = false;
    window.location.href = 'http://localhost:4200/login?action=logout';
  }

  // ⭐️ ฟังก์ชันสำหรับข้ามไป "ระบบที่ปรึกษา" (ระบบเพื่อน) พร้อมส่ง Token
  goToAdvisorSystem(event: Event) {
    event.preventDefault(); // ป้องกันการเปลี่ยนหน้าแบบปกติของแท็ก <a>

    const role = localStorage.getItem('role') || '';
    const token = localStorage.getItem('token') || '';
    const fullName = localStorage.getItem('full_name') || '';

    // สร้าง URL ไปที่พอร์ต 4200 พร้อมแนบพารามิเตอร์ยืนยันตัวตน
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

  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) {
      this.isSidebarOpen.set(false);
    }
  }
}
