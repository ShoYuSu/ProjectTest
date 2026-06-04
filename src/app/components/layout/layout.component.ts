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
    this.router.navigate(['/dashboard']);
  }

  // ⭐️ ฟังก์ชันสำหรับข้ามไป "ระบบที่ปรึกษา" (ระบบเพื่อน) พร้อมส่ง Token
  goToAdvisorSystem(event: Event) {
    event.preventDefault(); // ป้องกันการเปลี่ยนหน้าแบบปกติของแท็ก <a>

    const role = localStorage.getItem('role') || '';
    const token = localStorage.getItem('token') || '';
    const fullName = localStorage.getItem('full_name') || '';

    // สร้าง URL ไปที่พอร์ต 4201 พร้อมแนบพารามิเตอร์ยืนยันตัวตน
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
