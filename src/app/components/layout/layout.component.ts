import { Component, signal, computed, OnInit, inject, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import { filter } from 'rxjs';

// ---------------------------------------------------------------------------
// Constants
// TODO: ย้าย URL เหล่านี้ไปไว้ใน environment.ts เพื่อให้เปลี่ยนตอน deploy ได้
// ---------------------------------------------------------------------------
const API_BASE = 'http://localhost:8080/api';
const AUTH_APP_URL = 'http://localhost:4200';

// ---------------------------------------------------------------------------
// Font size
// ---------------------------------------------------------------------------
type FontClass = 'font-small' | 'font-medium' | 'font-large';

interface FontOption {
  value: FontClass;
  label: string; // ข้อความบนปุ่ม
  title: string; // tooltip / aria-label
  textClass: string; // ขนาดตัวอักษรของปุ่มเอง (ให้เห็นความต่างของแต่ละขนาด)
}

const FONT_STORAGE_KEY = 'appFontSizeV3';
const DEFAULT_FONT: FontClass = 'font-medium';

const FONT_OPTIONS: readonly FontOption[] = [
  { value: 'font-small', label: 'A-', title: 'ตัวอักษรเล็ก', textClass: 'text-sm' },
  { value: 'font-medium', label: 'A', title: 'ตัวอักษรปกติ', textClass: 'text-base' },
  { value: 'font-large', label: 'A+', title: 'ตัวอักษรใหญ่', textClass: 'text-xl' },
];

const FONT_CLASSES: FontClass[] = FONT_OPTIONS.map((o) => o.value);

function isFontClass(value: unknown): value is FontClass {
  return typeof value === 'string' && (FONT_CLASSES as string[]).includes(value);
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* โหมด private / storage เต็ม — ข้ามไป ใช้ค่าในหน่วยความจำแทน */
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit {
  public router = inject(Router);
  private http = inject(HttpClient);

  // --- Font size ---
  readonly fontOptions = FONT_OPTIONS;
  currentFontSize = signal<FontClass>(DEFAULT_FONT);
  currentFontOption = computed(
    () => FONT_OPTIONS.find((o) => o.value === this.currentFontSize()) ?? FONT_OPTIONS[1],
  );

  // --- Sidebar ---
  isStaffExpanded = signal(false);
  isResearchExpanded = signal(false);
  isSidebarOpen = signal(false);
  isMiniSidebar = signal(false);

  // --- Permissions ---
  canViewDashboard = signal(false);
  canViewStaff = signal(false);
  canViewResearch = signal(false);
  canViewTraining = signal(false);
  canViewProjects = signal(false);
  canViewAllDepts = signal(true);
  canViewAdvisorSystem = signal(false);
  userDept = signal<string>('');

  // --- Password modal ---
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  showChangePasswordModal = signal(false);
  modalError = signal('');
  isModalLoading = signal(false);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  // --- User / profile ---
  isProfileMenuOpen = signal(false);
  userName = 'USER';
  userRoleDisplay = 'MEMBER';
  userInitial = 'U';
  userProfileImage = '';

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.checkUpdatedProfileImage());
  }

  ngOnInit() {
    this.handleUrlParams();
    this.loadUserProfileFromToken();
    this.fetchPermissionsFromDB();
    this.checkUpdatedProfileImage();
    this.initFontSize();

    if (safeGet('must_change_password') === 'true') {
      this.showChangePasswordModal.set(true);
    }
  }

  // =========================================================================
  // Global listeners
  // =========================================================================

  /** คลิกที่ไหนก็ได้นอกเมนูโปรไฟล์ → ปิดเมนู (ตัว wrapper ใน HTML จะ stopPropagation เอง) */
  @HostListener('document:click')
  onDocumentClick() {
    if (this.isProfileMenuOpen()) this.isProfileMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.isProfileMenuOpen.set(false);
    if (this.showChangePasswordModal() && !this.isModalLoading()) this.closeModal();
  }

  // =========================================================================
  // Font size
  // =========================================================================

  private initFontSize() {
    const saved = safeGet(FONT_STORAGE_KEY);
    this.changeFontSize(isFontClass(saved) ? saved : this.migrateLegacyFontSize());
  }

  /** ย้ายค่าเก่า: V2 (16/18/22px) ก่อน แล้วค่อยดู V1 (14/16/18px) แล้วลบคีย์เก่าทิ้ง */
  private migrateLegacyFontSize(): FontClass {
    const v2 = safeGet('appFontSizeV2');
    const v1 = safeGet('appFontSize');

    const mapV2: Record<string, FontClass> = {
      '16px': 'font-small',
      '18px': 'font-medium',
      '22px': 'font-large',
    };
    const mapV1: Record<string, FontClass> = {
      '14px': 'font-small',
      '16px': 'font-medium',
      '18px': 'font-large',
    };

    const migrated = (v2 && mapV2[v2]) || (v1 && mapV1[v1]) || DEFAULT_FONT;
    safeRemove('appFontSizeV2');
    safeRemove('appFontSize');
    return migrated;
  }

  changeFontSize(size: FontClass) {
    const next = isFontClass(size) ? size : DEFAULT_FONT;
    this.currentFontSize.set(next);

    const root = document.documentElement;
    root.style.fontSize = ''; // เคลียร์ inline style เก่า
    root.classList.remove(...FONT_CLASSES);
    root.classList.add(next);
    safeSet(FONT_STORAGE_KEY, next);
  }

  /** ใช้กับปุ่มเดียวตอน sidebar แบบย่อ: เล็ก → ปกติ → ใหญ่ → เล็ก ... */
  cycleFontSize() {
    const idx = FONT_CLASSES.indexOf(this.currentFontSize());
    this.changeFontSize(FONT_CLASSES[(idx + 1) % FONT_CLASSES.length]);
  }

  // =========================================================================
  // Token / profile
  // =========================================================================

  private getToken(): string {
    return safeGet('token') || '';
  }

  private decodeToken(): any | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }

  private getRoleFromToken(): string {
    return this.decodeToken()?.role || '';
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.getToken()}`);
  }

  checkUpdatedProfileImage() {
    const overrideImg = safeGet('profile_image_override');
    if (overrideImg) {
      this.userProfileImage = overrideImg;
    }
  }

  handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const userFromUrl = urlParams.get('user');
    const mustChangePwd = urlParams.get('must_change_pwd');

    if (mustChangePwd === 'true') {
      safeSet('must_change_password', 'true');
    }

    if (tokenFromUrl) {
      safeSet('token', tokenFromUrl);
      if (userFromUrl) safeSet('full_name', userFromUrl);
      // ล้าง token ออกจาก URL ทันที ไม่ให้ค้างใน address bar / history
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  loadUserProfileFromToken() {
    this.userName = safeGet('full_name') || 'USER';
    this.userInitial = this.userName.charAt(0).toUpperCase();

    const decoded = this.decodeToken();
    if (!decoded) return;

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
        this.userProfileImage = `${API_BASE}/${cleanPath}`;
      }
    } else {
      this.userProfileImage = '';
    }

    // ภาควิชาของผู้ใช้ (ใช้กรองเมนู Staff เมื่อสิทธิ์ view = department)
    // ตรวจชื่อ field ให้ตรงกับ payload ของ JWT จริงที่ฝั่ง PHP สร้าง
    const dept = decoded.dept || decoded.department || '';
    if (dept) this.userDept.set(String(dept).toLowerCase());

    const role = decoded.role || '';
    if (role === 'admin') this.userRoleDisplay = 'SYSTEM ADMIN';
    else if (role === 'teacher') this.userRoleDisplay = 'TEACHER / LECTURER';
    else if (role === 'student') this.userRoleDisplay = 'STUDENT';
    else this.userRoleDisplay = role.toUpperCase() || 'MEMBER';
  }

  handleImageError() {
    this.userProfileImage = '';
  }

  fetchPermissionsFromDB() {
    this.http
      .get<any>(`${API_BASE}/get_permissions.php`, { headers: this.authHeaders() })
      .subscribe({
        next: (response) => {
          const perms = response.permissions || {};
          const isAdvisor = response.is_advisor || false;

          const findPerm = (keyword: string) => {
            const key = Object.keys(perms).find((k) =>
              k.toLowerCase().includes(keyword.toLowerCase()),
            );
            return key ? perms[key] : undefined;
          };

          const getViewScope = (keyword: string): string => {
            const view = findPerm(keyword)?.['view'];
            return view ? String(view).toLowerCase() : 'none';
          };

          const checkViewScope = (keyword: string) => getViewScope(keyword) !== 'none';

          this.canViewDashboard.set(checkViewScope('dashboard'));
          this.canViewStaff.set(checkViewScope('staff'));
          this.canViewResearch.set(checkViewScope('research'));
          this.canViewTraining.set(checkViewScope('training'));
          this.canViewProjects.set(checkViewScope('plan') || checkViewScope('project'));
          this.canViewAllDepts.set(getViewScope('staff') !== 'department');

          // ถ้า backend ส่งภาควิชามาด้วย ให้ใช้ค่านี้ (ทับค่าจาก token)
          const dept = response.dept || response.department;
          if (dept) this.userDept.set(String(dept).toLowerCase());

          const role = this.getRoleFromToken();
          this.canViewAdvisorSystem.set(
            role === 'admin' || role === 'student' || (role === 'teacher' && isAdvisor),
          );
        },
        error: (err) => console.error('ไม่สามารถดึงสิทธิ์จากฐานข้อมูลได้', err),
      });
  }

  goToAdvisorSystem(event: Event) {
    event.preventDefault();
    const token = this.getToken();
    const role = this.getRoleFromToken();

    const path = role === 'teacher' ? 'home' : 'system-dashboard';
    // หมายเหตุ: ส่ง token ผ่าน query string เสี่ยงรั่วทาง history/log
    // ควรเปลี่ยนเป็น one-time code หรือ cookie ถ้าระบบอนุญาต
    const advisorUrl =
      `${AUTH_APP_URL}/${path}?role=${encodeURIComponent(role)}` +
      `&token=${encodeURIComponent(token)}&user=${encodeURIComponent(this.userName)}`;
    window.location.href = advisorUrl;
  }

  // =========================================================================
  // Change password modal
  // =========================================================================

  toggleShowCurrentPassword() {
    this.showCurrentPassword.update((v) => !v);
  }
  toggleShowNewPassword() {
    this.showNewPassword.update((v) => !v);
  }
  toggleShowConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }

  private resetPasswordForm() {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.modalError.set('');
    this.showCurrentPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }

  closeModal() {
    this.showChangePasswordModal.set(false);
    this.resetPasswordForm();
    safeRemove('must_change_password'); // ลบ Flag ออกเพื่อไม่ให้ Pop-up เด้งซ้ำ
  }

  submitChangePassword() {
    if (this.isModalLoading()) return; // กัน Enter / กดซ้ำระหว่างโหลด
    this.modalError.set('');

    if (!this.currentPassword) {
      this.modalError.set('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (!this.newPassword || !this.confirmPassword) {
      this.modalError.set('กรุณากรอกข้อมูลรหัสผ่านใหม่ให้ครบถ้วน');
      return;
    }
    if (this.newPassword.length < 8) {
      this.modalError.set('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.modalError.set('รหัสผ่านและรหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }
    if (this.newPassword === this.currentPassword) {
      this.modalError.set('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
      return;
    }

    this.isModalLoading.set(true);

    this.http
      .post<any>(
        `${API_BASE}/change_password.php`,
        {
          current_password: this.currentPassword,
          new_password: this.newPassword,
          confirm_password: this.confirmPassword,
        },
        { headers: this.authHeaders() },
      )
      .subscribe({
        next: (res) => {
          this.isModalLoading.set(false);
          if (res.success) {
            alert('✅ เปลี่ยนรหัสผ่านสำเร็จ! ยินดีต้อนรับเข้าสู่ระบบ');
            safeRemove('must_change_password');
            this.showChangePasswordModal.set(false);
            this.resetPasswordForm();
          } else {
            this.modalError.set(res.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
          }
        },
        error: (err) => {
          this.isModalLoading.set(false);
          this.modalError.set(err.error?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        },
      });
  }

  // =========================================================================
  // Logout
  // =========================================================================

  cancelAndLogout() {
    safeRemove('token');
    safeRemove('must_change_password');
    window.location.replace(`${AUTH_APP_URL}/login?action=logout`);
  }

  logout() {
    // หมายเหตุ: การเก็บ savedPassword เป็น plain text ใน localStorage ไม่ปลอดภัย
    // (JS ทุกตัวในหน้าอ่านได้ / XSS ขโมยได้) แนะนำให้เก็บแค่อีเมล
    const savedEmail = safeGet('savedEmail');
    const savedPassword = safeGet('savedPassword');
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    if (savedEmail && savedPassword) {
      safeSet('savedEmail', savedEmail);
      safeSet('savedPassword', savedPassword);
    }
    this.isProfileMenuOpen.set(false);
    window.location.replace(`${AUTH_APP_URL}/login?action=logout`);
  }

  // =========================================================================
  // UI toggles
  // =========================================================================

  toggleProfileMenu() {
    this.isProfileMenuOpen.update((v) => !v);
  }
  toggleMiniSidebar() {
    this.isMiniSidebar.update((v) => !v);
    if (this.isMiniSidebar()) {
      this.isStaffExpanded.set(false);
      this.isResearchExpanded.set(false);
    }
  }
  toggleStaff() {
    if (this.isMiniSidebar()) this.isMiniSidebar.set(false);
    this.isStaffExpanded.update((v) => !v);
  }
  toggleResearch() {
    if (this.isMiniSidebar()) this.isMiniSidebar.set(false);
    this.isResearchExpanded.update((v) => !v);
  }
  toggleSidebar() {
    this.isSidebarOpen.update((v) => !v);
  }
  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) this.isSidebarOpen.set(false);
  }
}