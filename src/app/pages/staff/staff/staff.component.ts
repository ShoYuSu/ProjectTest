import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './staff.component.html',
  styleUrls: ['./staff.component.css']
})
export class StaffComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  rawStaffList = signal<any[]>([]);
  searchQuery = signal<string>('');
  currentTypeFilter = signal<'all' | 'academic' | 'support'>('all');
  currentDept = signal<string>('');
  
  canAdd = signal<boolean>(false);
  errorMessage = signal<string>('');

  isConfirmModalOpen = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  confirmAction: (() => void) | null = null;

  isAlertModalOpen = signal(false);
  alertTitle = signal('');
  alertMessage = signal('');

  // 🌟 ตัวแปรสำหรับระบบ Restore & History (ปรับให้ตรงกับ HTML ของเพื่อน)
  isRestoreModalOpen = false;
  activeRestoreTab: 'deleted' | 'history' = 'deleted';
  deletedStaffList = signal<any[]>([]);
  systemLogs = signal<any[]>([]);
  isLoadingRecovery = signal<boolean>(false);

  getDaysAgo(dateStr: string): string {
    if (!dateStr || dateStr.startsWith('0000')) return '-';
    
    const updated = new Date(dateStr);
    const today = new Date();
    
    updated.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - updated.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'วันนี้';
    if (diffDays === 1) return 'เมื่อวาน';
    if (diffDays > 0) return `${diffDays} วันที่แล้ว`;
    return '-'; 
  }

  userRole(): string {
    const token = localStorage.getItem('token') || '';
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        return decoded.role ? decoded.role.toLowerCase() : '';
      } catch (e) { return ''; }
    }
    return '';
  }

  openConfirmModal(title: string, message: string, action: () => void) {
    this.confirmTitle.set(title);
    this.confirmMessage.set(message);
    this.confirmAction = action;
    this.isConfirmModalOpen.set(true);
  }

  closeConfirmModal() {
    this.isConfirmModalOpen.set(false);
    this.confirmAction = null;
  }

  confirmModalYes() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirmModal();
  }

  openAlertModal(title: string, message: string) {
    this.alertTitle.set(title);
    this.alertMessage.set(message);
    this.isAlertModalOpen.set(true);
  }

  closeAlertModal() {
    this.isAlertModalOpen.set(false);
  }

  filteredStaffList = computed(() => {
    let list = this.rawStaffList();
    const search = this.searchQuery().toLowerCase().trim();
    const type = this.currentTypeFilter();

    if (type === 'academic') {
      list = list.filter(s => s.position.includes('อาจารย์') || s.position.includes('วิชาการ'));
    } else if (type === 'support') {
      list = list.filter(s => !s.position.includes('อาจารย์') && !s.position.includes('วิชาการ'));
    }

    if (search) {
      list = list.filter(s => 
        s.name.toLowerCase().includes(search) || 
        s.position.toLowerCase().includes(search) ||
        s.department.toLowerCase().includes(search)
      );
    }
    return list;
  });

  ngOnInit() {
    this.checkPermissions();
    this.route.queryParams.subscribe(params => {
      const dept = params['dept'] || '';
      this.currentDept.set(dept);
      this.loadStaff(dept);
    });
  }

  checkPermissions() {
    const token = localStorage.getItem('token') || '';
    let userRole = '';

    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        userRole = decoded.role ? decoded.role.toLowerCase() : '';
      } catch (e) { console.error('Token error:', e); }
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (res) => {
          if (userRole === 'admin') {
            this.canAdd.set(true);
          } else {
            const perms = res.permissions || res || {};
            let hasAdd = false;
            
            const staffKey = Object.keys(perms).find(k => k.toLowerCase() === 'staff_info' || k.toLowerCase().includes('staff'));
            if (staffKey && perms[staffKey]) {
              const addKey = Object.keys(perms[staffKey]).find(a => a.toLowerCase() === 'add');
              if (addKey) {
                const scope = perms[staffKey][addKey];
                if (scope && scope.toLowerCase() !== 'none') {
                  hasAdd = true;
                }
              }
            }
            this.canAdd.set(hasAdd);
          }
        },
        error: (err) => console.error('Permission fetch error:', err)
      });
  }

  loadStaff(deptFilter: string) {
    this.errorMessage.set('');
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:8080/api/get_staff.php', { headers })
      .subscribe({
        next: (data) => {
          let filteredData = data;
          if (deptFilter) {
            const deptMap: Record<string, number> = { 'math': 2, 'chem': 1, 'food': 5, 'physics': 4, 'cs': 3 };
            const deptId = deptMap[deptFilter];
            if (deptId) {
              filteredData = data.filter(s => parseInt(s.dept_id) === deptId);
            }
          }

          const mappedData = filteredData.map(item => ({
            id: item.person_id,
            staff_id: item.staff_id,
            person_id: item.person_id,
            name: item.full_name,
            staff_code: item.staff_code, 
            image: item.img_profile ? 'http://localhost:8080/api/' + item.img_profile.replace(/^\/+/, '') : null,
            position: item.position,
            department: item.department || 'ส่วนกลาง',
            researchCount: Number(item.researchCount) || 0,
            can_edit: item.can_edit,
            can_delete: item.can_delete,
            can_reset_password: item.can_reset_password,
            updated_at: item.updated_at,
            days_ago: this.getDaysAgo(item.updated_at)
          }));

          this.rawStaffList.set(mappedData);
        },
        error: (err) => {
          console.error('Staff fetch error:', err);
          this.errorMessage.set('ไม่สามารถดึงข้อมูลได้ (เซสชั่นอาจหมดอายุ หรือไม่มีสิทธิ์เข้าถึง)');
        }
      });
  }

  onSearchChange(text: string) { this.searchQuery.set(text); }
  changeTypeFilter(type: 'all' | 'academic' | 'support') { this.currentTypeFilter.set(type); }

  getStaffCount(type: 'all' | 'academic' | 'support'): number {
    const list = this.rawStaffList();
    if (type === 'academic') return list.filter(s => s.position.includes('อาจารย์') || s.position.includes('วิชาการ')).length;
    else if (type === 'support') return list.filter(s => !s.position.includes('อาจารย์') && !s.position.includes('วิชาการ')).length;
    return list.length;
  }

  getFilterTitle(): string {
    const dept = this.currentDept();
    if (dept === 'math') return 'ภาควิชาคณิตศาสตร์';
    if (dept === 'chem') return 'ภาควิชาเคมี';
    if (dept === 'food') return 'ภาควิชาเทคโนโลยีการอาหาร';
    if (dept === 'physics') return 'ภาควิชาฟิสิกส์';
    if (dept === 'cs') return 'ภาควิชาวิทยาการคอมพิวเตอร์';
    return 'บุคลากร';
  }

  resetPassword(personId: number, name: string) {
    this.openConfirmModal('ยืนยันการรีเซ็ตรหัสผ่าน', `⚠️ คำเตือน: คุณต้องการรีเซ็ตรหัสผ่านของ "${name}" ใช่หรือไม่?\n\nรหัสผ่านจะถูกตั้งค่ากลับไปเป็น "รหัสประจำตัว" และผู้ใช้งานจะถูกบังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบในครั้งถัดไป`, () => {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.post<any>('http://localhost:8080/api/reset_password.php', {
        person_id: personId
      }, { headers }).subscribe({
        next: (res) => {
          if (res.success) {
            this.openAlertModal('สำเร็จ', '✅ ' + res.message);
          } else {
            this.openAlertModal('เกิดข้อผิดพลาด', '❌ ' + res.message);
          }
        },
        error: (err) => this.openAlertModal('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
      });
    });
  }

  deleteStaff(staffId: number, personId: number, name: string) {
    this.openConfirmModal('ยืนยันการซ่อนข้อมูล', `คุณต้องการซ่อนข้อมูลของ ${name} ใช่หรือไม่? (Soft Delete)`, () => {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.post<any>('http://localhost:8080/api/delete_staff.php', {
        staff_id: staffId,
        person_id: personId
      }, { headers }).subscribe({
        next: (res) => {
          if (res.success) {
            this.openAlertModal('สำเร็จ', '✅ ซ่อนข้อมูลสำเร็จ (สถานะถูกเปลี่ยนเป็น Inactive)');
            this.loadStaff(this.currentDept());
          } else {
            this.errorMessage.set('เกิดข้อผิดพลาด: ' + res.message);
          }
        },
        error: (err) => this.errorMessage.set('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
      });
    });
  }

  // ==========================================
  // 🌟 ฟังก์ชันระบบ Restore & Hard Delete ที่ทำงานกับ Database จริง
  // ==========================================
  openRestoreModal() {
    this.isRestoreModalOpen = true;
    this.activeRestoreTab = 'deleted';
    this.loadInactiveStaff(); 
  }

  closeRestoreModal() {
    this.isRestoreModalOpen = false;
    this.loadStaff(this.currentDept()); // โหลดตารางหลักใหม่เผื่อมีคนถูกกู้คืนกลับมา
  }

  loadInactiveStaff() {
    this.isLoadingRecovery.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:8080/api/get_inactive_staff.php', { headers })
      .subscribe({
        next: (data) => {
          // แมปข้อมูลให้เข้ากับตัวแปรที่เพื่อนเขียนไว้ใน HTML
          const mappedData = (data || []).map(item => ({
            id: item.person_id,
            person_id: item.person_id,
            staff_id: item.staff_id,
            name: item.name,
            full_name: item.name,
            position: item.position,
            department: item.department,
            deleted_at: item.deleted_at,
            image: item.image
          }));
          
          this.deletedStaffList.set(mappedData);

          // จำลองข้อมูลประวัติการลบ (Audit Logs) สำหรับ Tab History ไว้ดูเล่นๆ
          this.systemLogs.set([
            { id: 1, action: 'DELETE', details: 'ลบข้อมูลบุคลากร', admin_name: 'System Admin', created_at: new Date().toLocaleDateString('th-TH') }
          ]);

          this.isLoadingRecovery.set(false);
        },
        error: () => {
          this.isLoadingRecovery.set(false);
          this.openAlertModal('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลประวัติที่ถูกลบได้');
        }
      });
  }

  restoreStaff(personId: number, name: string) {
    this.openConfirmModal('ยืนยันการกู้คืน', `คุณต้องการกู้คืนบัญชีของ "${name}" กลับมาใช้งานเป็นสถานะ Active ใช่หรือไม่?`, () => {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.post<any>('http://localhost:8080/api/restore_staff.php', { person_id: personId }, { headers })
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.openAlertModal('สำเร็จ', '✅ ' + res.message);
              this.loadInactiveStaff(); // ดึงรายชื่อใหม่หลังกู้คืนสำเร็จ
            } else {
              this.openAlertModal('ข้อผิดพลาด', '❌ ' + res.message);
            }
          },
          error: () => this.openAlertModal('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
        });
    });
  }

  hardDeleteStaff(staffId: number, personId: number, name: string) {
    this.openConfirmModal('⚠️ ยืนยันการลบถาวร', `คำเตือน! คุณต้องการลบข้อมูลของ "${name}" แบบถาวรใช่หรือไม่?\n\nข้อมูลภาระงานวิจัย โครงการ และประวัติทั้งหมดที่เกี่ยวข้องจะถูกลบออกจากฐานข้อมูล และไม่สามารถกู้คืนได้อีก`, () => {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.post<any>('http://localhost:8080/api/hard_delete_staff.php', { 
        staff_id: staffId, 
        person_id: personId 
      }, { headers })
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.openAlertModal('สำเร็จ', '✅ ' + res.message);
              this.loadInactiveStaff(); // ดึงรายชื่อใหม่หลังลบถาวรสำเร็จ
            } else {
              this.openAlertModal('ข้อผิดพลาด', '❌ ' + res.message);
            }
          },
          error: () => this.openAlertModal('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
        });
    });
  }
}