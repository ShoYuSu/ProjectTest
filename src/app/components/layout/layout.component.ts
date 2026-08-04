import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode'; 
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 🌟 ห้ามลืม Import สำหรับ [(ngModel)]

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule], // 🌟 เพิ่ม FormsModule ที่นี่
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit {
  public router = inject(Router);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  isStaffExpanded = signal(false);
  isResearchExpanded = signal(false);
  isSidebarOpen = signal(false);
  isMiniSidebar = signal(false);

  canViewDashboard = signal(false);
  canViewStaff = signal(false);
  canViewResearch = signal(false);
  canViewTraining = signal(false);
  canViewProjects = signal(false);
  canViewAllDepts = signal(true);
  canViewAdvisorSystem = signal(false);

  userDept = signal<string>('');
  isProfileMenuOpen = false;
  userName: string = 'USER';
  userRoleDisplay: string = 'MEMBER';
  userInitial: string = 'U';
  userProfileImage: string = '';
  currentFontSize: string = '16px';

  // 🌟 เพิ่มตัวแปรสำหรับ Pop-up บังคับเปลี่ยนรหัสผ่าน
  showChangePasswordModal = signal(false);
  newPassword = signal('');
  confirmPassword = signal('');
  modalError = signal('');
  isModalLoading = signal(false);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkUpdatedProfileImage();
      }
    });
  }

  checkUpdatedProfileImage() {
    const overrideImg = localStorage.getItem('profile_image_override');
    if (overrideImg) {
      this.userProfileImage = overrideImg;
    }
  }

  ngOnInit() {
    this.handleUrlParams();
    this.loadUserProfileFromToken();
    this.fetchPermissionsFromDB();
    this.checkUpdatedProfileImage(); 

    const savedFont = localStorage.getItem('appFontSize');
    if (savedFont) {
      this.currentFontSize = savedFont;
      document.documentElement.style.fontSize = savedFont;
    }

    // 🌟 เช็คสถานะบังคับเปลี่ยนรหัสผ่าน
    if (localStorage.getItem('must_change_password') === 'true') {
      this.showChangePasswordModal.set(true);
    }
  }

  changeFontSize(size: string) {
    this.currentFontSize = size;
    document.documentElement.style.fontSize = size;
    localStorage.setItem('appFontSize', size);
  }

  handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const userFromUrl = urlParams.get('user');
    const mustChangePwd = urlParams.get('must_change_pwd'); // 🌟 ดักจับจากหน้า Login

    if (mustChangePwd === 'true') {
      localStorage.setItem('must_change_password', 'true');
    }

    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      if (userFromUrl) localStorage.setItem('full_name', userFromUrl); 
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  loadUserProfileFromToken() {
    const token = localStorage.getItem('token');
    this.userName = localStorage.getItem('full_name') || 'USER';
    this.userInitial = this.userName.charAt(0).toUpperCase();

    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.full_name) {
          this.userName = decoded.full_name;
          this.userInitial = this.userName.charAt(0).toUpperCase();
        }

        const imgProfile = decoded.img_profile || '';
        if (imgProfile && imgProfile !== 'null') {
          if (imgProfile.startsWith('http')) {
            this.userProfileImage = imgProfile; 
          } else {
            const cleanPath = imgProfile.replace(/^\//, '');
            this.userProfileImage = `http://localhost:8080/api/${cleanPath}`;
          }
        } else {
          this.userProfileImage = '';
        }

        const role = decoded.role || '';
        if (role === 'admin') this.userRoleDisplay = 'SYSTEM ADMIN';
        else if (role === 'teacher') this.userRoleDisplay = 'TEACHER / LECTURER';
        else if (role === 'student') this.userRoleDisplay = 'STUDENT';
        else this.userRoleDisplay = role.toUpperCase();
      } catch (e) {
        console.error('Token decoding failed');
      }
    }
  }

  handleImageError() { this.userProfileImage = ''; }

  fetchPermissionsFromDB() {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers }).subscribe({
      next: (response) => {
        const perms = response.permissions || {};
        const isAdvisor = response.is_advisor || false;

        const checkViewScope = (keyword: string) => {
          const key = Object.keys(perms).find((k) => k.toLowerCase().includes(keyword.toLowerCase()));
          return key && perms[key] && perms[key]['view'] ? perms[key]['view'].toLowerCase() !== 'none' : false;
        };

        const getStaffScope = () => {
          const key = Object.keys(perms).find((k) => k.toLowerCase().includes('staff'));
          return key && perms[key] && perms[key]['view'] ? perms[key]['view'].toLowerCase() : 'none';
        };

        this.canViewDashboard.set(checkViewScope('dashboard'));
        this.canViewStaff.set(checkViewScope('staff'));
        this.canViewResearch.set(checkViewScope('research'));
        this.canViewTraining.set(checkViewScope('training'));
        this.canViewProjects.set(checkViewScope('plan') || checkViewScope('project'));
        this.canViewAllDepts.set(getStaffScope() !== 'department');

        let role = '';
        if (token) try { role = (jwtDecode(token) as any).role || ''; } catch (e) {}
        this.canViewAdvisorSystem.set(role === 'admin' || role === 'student' || (role === 'teacher' && isAdvisor));
      },
      error: (err) => console.error('ไม่สามารถดึงสิทธิ์จากฐานข้อมูลได้', err),
    });
  }

  goToAdvisorSystem(event: Event) {
    event.preventDefault();
    const token = localStorage.getItem('token') || '';
    let role = '';
    if (token) try { role = (jwtDecode(token) as any).role || ''; } catch (e) {}

    const path = role === 'teacher' ? 'home' : 'system-dashboard';
    const advisorUrl = `http://localhost:4200/${path}?role=${role}&token=${token}&user=${encodeURIComponent(this.userName)}`;
    window.location.href = advisorUrl;
  }

  // 🌟 ฟังก์ชันจัดการ Pop-up เปลี่ยนรหัสผ่าน
  submitChangePassword() {
    this.modalError.set('');
    if (this.newPassword().length < 8) {
      this.modalError.set('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.modalError.set('รหัสผ่านและรหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }

    this.isModalLoading.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.post<any>('http://localhost:8080/api/change_password.php', {
      new_password: this.newPassword(),
      confirm_password: this.confirmPassword()
    }, { headers }).subscribe({
      next: (res) => {
        this.isModalLoading.set(false);
        if (res.success) {
          alert('✅ เปลี่ยนรหัสผ่านสำเร็จ! ยินดีต้อนรับเข้าสู่ระบบ');
          localStorage.removeItem('must_change_password');
          this.showChangePasswordModal.set(false);
        } else {
          this.modalError.set(res.message);
        }
      },
      error: (err) => {
        this.isModalLoading.set(false);
        this.modalError.set(err.error?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      }
    });
  }

  cancelAndLogout() {
    // บังคับเตะออกไปหน้า Login ถ้ายกเลิก
    localStorage.removeItem('token');
    localStorage.removeItem('must_change_password');
    window.location.replace('http://localhost:4200/login?action=logout');
  }

  logout() {
    const savedEmail = localStorage.getItem('savedEmail');
    const savedPassword = localStorage.getItem('savedPassword');
    localStorage.clear();
    if (savedEmail && savedPassword) {
      localStorage.setItem('savedEmail', savedEmail);
      localStorage.setItem('savedPassword', savedPassword);
    }
    this.isProfileMenuOpen = false;
    window.location.replace('http://localhost:4200/login?action=logout');
  }

  toggleProfileMenu() { this.isProfileMenuOpen = !this.isProfileMenuOpen; }
  toggleMiniSidebar() {
    this.isMiniSidebar.set(!this.isMiniSidebar());
    if (this.isMiniSidebar()) { this.isStaffExpanded.set(false); this.isResearchExpanded.set(false); }
  }
  toggleStaff() {
    if (this.isMiniSidebar()) this.isMiniSidebar.set(false);
    this.isStaffExpanded.set(!this.isStaffExpanded());
  }
  toggleResearch() {
    if (this.isMiniSidebar()) this.isMiniSidebar.set(false);
    this.isResearchExpanded.set(!this.isResearchExpanded());
  }
  toggleSidebar() { this.isSidebarOpen.set(!this.isSidebarOpen()); }
  closeSidebarOnMobile() { if (window.innerWidth < 1024) this.isSidebarOpen.set(false); }
}