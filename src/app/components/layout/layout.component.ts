import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router'; // 🌟 เพิ่ม NavigationEnd
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode'; // 🌟 ใช้แกะ Role จาก Token

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  public router = inject(Router); 
  private http = inject(HttpClient);

  isStaffExpanded = signal(false);
  isResearchExpanded = signal(false);
  isSidebarOpen = signal(false);
  isMiniSidebar = signal(false);

  // ควบคุมเมนูระบบ MIS 
  canViewDashboard = signal(false);
  canViewStaff = signal(false);
  canViewResearch = signal(false);
  canViewTraining = signal(false);
  canViewProjects = signal(false);
  canViewAllDepts = signal(true); 

  // ควบคุมเมนูลิงก์ไประบบที่ปรึกษา
  canViewAdvisorSystem = signal(false); 
  
  userDept = signal<string>('');   
  isProfileMenuOpen = false;
  userName: string = 'USER';
  userRoleDisplay: string = 'MEMBER';
  userInitial: string = 'U';
  
  // 🌟 เพิ่มตัวแปรสำหรับเก็บ URL รูปภาพ
  userProfileImage: string = '';

  constructor() {
    // 🌟 เพิ่ม Event Listener ของ Router เพื่อคอยเช็คการเปลี่ยนรูปล่าสุด
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkUpdatedProfileImage();
      }
    });
  }

  // 🌟 ฟังก์ชันเช็คอัปเดตรูป
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
    this.checkUpdatedProfileImage(); // เช็คตอนโหลดหน้าแรกด้วย
  }

  handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const userFromUrl = urlParams.get('user');
    
    // 🌟 บันทึกแค่ข้อมูลที่จำเป็นจริงๆ ลดการใช้ LocalStorage มั่วซั่ว
    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      if (userFromUrl) localStorage.setItem('full_name', userFromUrl); // สำรองชื่อไว้แสดงผล
      
      // ล้าง URL ให้สะอาด
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  loadUserProfileFromToken() {
    const token = localStorage.getItem('token');
    
    // ดึงชื่อมาแสดงผล
    this.userName = localStorage.getItem('full_name') || 'USER';
    this.userInitial = this.userName.charAt(0).toUpperCase();

    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        
        // ถ้า Backend อัปเดต payload ให้ส่งชื่อมาด้วย ก็ใช้จาก Token เลย (ปลอดภัยกว่า)
        if (decoded.full_name) {
            this.userName = decoded.full_name;
            this.userInitial = this.userName.charAt(0).toUpperCase();
        }

        // 🌟 ดึงข้อมูลรูปภาพจาก Token มาประกอบเป็น URL (จะโดนทับถ้ามี overrideImg)
        const imgProfile = decoded.img_profile || '';
        if (imgProfile && imgProfile !== 'null') {
          if (imgProfile.startsWith('http')) {
            this.userProfileImage = imgProfile; // ถ้าเป็นลิงก์ http อยู่แล้ว
          } else {
            // ถ้าเป็น path ธรรมดา ให้ประกอบกับ localhost:8080/api/
            const cleanPath = imgProfile.replace(/^\//, ''); 
            this.userProfileImage = `http://localhost:8080/api/${cleanPath}`; 
          }
        } else {
          this.userProfileImage = '';
        }

        // 🌟 ดึง Role จาก Token มาแสดงผลบน Layout
        const role = decoded.role || '';
        if (role === 'admin') {
          this.userRoleDisplay = 'SYSTEM ADMIN';
        } else if (role === 'teacher') {
          this.userRoleDisplay = 'TEACHER / LECTURER';
        } else if (role === 'student') {
          this.userRoleDisplay = 'STUDENT';
        } else {
          this.userRoleDisplay = role.toUpperCase();
        }
      } catch (e) {
        console.error("Token decoding failed");
      }
    }
  }

  // 🌟 ฟังก์ชันจัดการกรณีโหลดรูปไม่ขึ้น ให้กลับไปใช้ตัวอักษรย่อแทน
  handleImageError() {
    this.userProfileImage = '';
  }

  fetchPermissionsFromDB() {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (response) => {
          const perms = response.permissions || {};
          const isAdvisor = response.is_advisor || false;
          
          // --- 1. จัดการเมนูระบบ MIS ของคุณ (จากตาราง permissions) ---
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

          this.canViewDashboard.set(checkViewScope('dashboard'));
          this.canViewStaff.set(checkViewScope('staff'));
          this.canViewResearch.set(checkViewScope('research'));
          this.canViewTraining.set(checkViewScope('training'));
          this.canViewProjects.set(checkViewScope('plan') || checkViewScope('project'));
          this.canViewAllDepts.set(getStaffScope() !== 'department');

          // --- 2. จัดการเมนูระบบที่ปรึกษา (อิง Role + เช็ค Database) ---
          let role = '';
          if (token) {
            try { role = (jwtDecode(token) as any).role || ''; } catch (e) {}
          }
          this.canViewAdvisorSystem.set(role === 'admin' || role === 'student' || (role === 'teacher' && isAdvisor));
        },
        error: (err) => console.error('ไม่สามารถดึงสิทธิ์จากฐานข้อมูลได้', err)
      });
  }

  goToAdvisorSystem(event: Event) {
    event.preventDefault();
    const token = localStorage.getItem('token') || '';
    let role = '';
    
    // แกะ Role จาก Token เพื่อส่งไประบบเพื่อน (แทนการดึงจาก LocalStorage)
    if (token) {
       try { role = (jwtDecode(token) as any).role || ''; } catch (e) {}
    }

    const path = role === 'teacher' ? 'home' : 'system-dashboard';
    const advisorUrl = `http://localhost:4200/${path}?role=${role}&token=${token}&user=${encodeURIComponent(this.userName)}`;
    window.location.href = advisorUrl;
  }

  logout() {
    localStorage.clear();
    this.isProfileMenuOpen = false;
    window.location.href = 'http://localhost:4200/login?action=logout';
  }

  toggleProfileMenu() { this.isProfileMenuOpen = !this.isProfileMenuOpen; }
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
  toggleSidebar() { this.isSidebarOpen.set(!this.isSidebarOpen()); }
  closeSidebarOnMobile() { if (window.innerWidth < 1024) this.isSidebarOpen.set(false); }
}