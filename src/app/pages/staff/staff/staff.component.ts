import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css'
})
export class StaffComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  canAdd = signal(false);
  canEdit = signal(false);
  canDelete = signal(false);

  allStaffList = signal<any[]>([]);
  filteredStaffList = signal<any[]>([]);
  errorMessage = signal<string>('');
  
  currentDeptFilter = signal<string>('');
  currentTypeFilter = signal<string>('all'); 

  ngOnInit() {
    this.checkPermissions();
    this.fetchStaffData();
    this.listenToRouteParams();
  }

  checkPermissions() {
    const role = localStorage.getItem('role');
    if (role === 'admin') {
      this.canAdd.set(true);
      this.canEdit.set(true);
      this.canDelete.set(true);
      return;
    }

    const permsString = localStorage.getItem('permissions') || '';
    const permsArray = permsString.split(',').map(p => p.trim().toLowerCase());

    this.canAdd.set(permsArray.some(p => p.includes('staff_info') && p.includes('add') && !p.includes('none')));
    this.canEdit.set(permsArray.some(p => p.includes('staff_info') && p.includes('edit') && !p.includes('none')));
    
    // 🌟 ให้ปุ่มลบ (Delete) โชว์เมื่อมีสิทธิ์ Edit เหมือนกันตามที่ระบุ
    this.canDelete.set(permsArray.some(p => p.includes('staff_info') && p.includes('edit') && !p.includes('none')));
  }

  listenToRouteParams() {
    this.route.queryParams.subscribe(params => {
      const dept = params['dept'] || '';
      this.currentDeptFilter.set(dept);
      this.applyFilter(); 
    });
  }

  changeTypeFilter(type: string) {
    this.currentTypeFilter.set(type);
    this.applyFilter();
  }

  applyFilter() {
    const deptFilter = this.currentDeptFilter();
    const typeFilter = this.currentTypeFilter();
    let result = this.allStaffList();

    if (deptFilter) {
      let targetDeptName = '';
      switch (deptFilter) {
        case 'math': targetDeptName = 'คณิตศาสตร์'; break;
        case 'chem': targetDeptName = 'เคมี'; break;
        case 'food': targetDeptName = 'เทคโนโลยีการอาหาร'; break;
        case 'physics': targetDeptName = 'ฟิสิกส์'; break;
        case 'cs': targetDeptName = 'วิทยาการคอมพิวเตอร์'; break;
      }
      if (targetDeptName) {
        result = result.filter(staff => staff.department === targetDeptName);
      }
    }

    if (typeFilter !== 'all') {
      result = result.filter(staff => staff.type === typeFilter);
    }
    this.filteredStaffList.set(result);
  }

  getStaffCount(type: string): number {
    const deptFilter = this.currentDeptFilter();
    let list = this.allStaffList();

    if (deptFilter) {
      let targetDeptName = '';
      switch (deptFilter) {
        case 'math': targetDeptName = 'คณิตศาสตร์'; break;
        case 'chem': targetDeptName = 'เคมี'; break;
        case 'food': targetDeptName = 'เทคโนโลยีการอาหาร'; break;
        case 'physics': targetDeptName = 'ฟิสิกส์'; break;
        case 'cs': targetDeptName = 'วิทยาการคอมพิวเตอร์'; break;
      }
      list = list.filter(staff => staff.department === targetDeptName);
    }
    if (type === 'all') return list.length;
    return list.filter(staff => staff.type === type).length;
  }

  fetchStaffData() {
    const currentUserId = localStorage.getItem('user_id') || '14'; 
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    this.http.get<any[]>('http://localhost:8080/api/get_staff.php', { headers })
      .subscribe({
        next: (data) => {
          this.allStaffList.set(data);
          this.applyFilter(); 
          this.errorMessage.set('');
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ไม่สามารถเข้าถึงข้อมูลบุคลากรได้เนื่องจากข้อจำกัดด้านสิทธิ์ระบบ');
        }
      });
  }

  // 🌟 ฟังก์ชันลบที่ได้รับการแก้ไขให้ยิง POST ไปหาไฟล์ delete_staff.php อย่างถูกต้อง
  deleteStaff(id: number, name: string) {
    if (!this.canDelete()) {
      alert('คุณไม่มีสิทธิ์ในการลบข้อมูลบุคลากร');
      return;
    }

    if (confirm(`คำเตือน: คุณต้องการลบบัญชีของ "${name}" ใช่หรือไม่?\n(การกระทำนี้ไม่สามารถกู้คืนได้)`)) {
      const currentUserId = localStorage.getItem('user_id') || '14';
      const headers = new HttpHeaders().set('X-User-Id', currentUserId);
      const payload = { target_person_id: id }; // ส่งรูปแบบ JSON

      this.http.post<any>('http://localhost:8080/api/delete_staff.php', payload, { headers })
        .subscribe({
          next: (res: any) => {
            if (res && res.success) {
              alert('✅ ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว');
              this.fetchStaffData(); 
            } else {
              alert('❌ ' + res.message);
            }
          },
          error: (err) => {
            console.error(err);
            alert('เกิดข้อผิดพลาดไม่สามารถเชื่อมต่อ API ลบข้อมูลได้ (ตรวจสอบพอร์ต 8080)');
          }
        });
    }
  }

  getFilterTitle(): string {
    const dept = this.currentDeptFilter();
    switch (dept) {
      case 'math': return 'ภาควิชาคณิตศาสตร์';
      case 'chem': return 'ภาควิชาเคมี';
      case 'food': return 'ภาควิชาเทคโนโลยีการอาหาร';
      case 'physics': return 'ภาควิชาฟิสิกส์';
      case 'cs': return 'ภาควิชาวิทยาการคอมพิวเตอร์';
      default: return 'บุคลากรทั้งหมด';
    }
  }
}