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

  // Signals สำหรับเก็บสถานะสิทธิ์ปุ่มต่างๆ ของโมดูล Staff_info
  canAdd = signal(false);
  canEdit = signal(false);
  canDelete = signal(false);

  // รายการบุคลากรทั้งหมดเต็มจำนวนที่ดึงมาจากฐานข้อมูล (สอดคล้องกับสิทธิ์หลัก)
  allStaffList = signal<any[]>([]);
  // รายการบุคลากรที่ผ่านการกรอง (Filter) เรียบร้อยแล้วเพื่อใช้แสดงผลบนเทมเพลตหน้าจอ
  filteredStaffList = signal<any[]>([]);
  errorMessage = signal<string>('');
  
  // ตัวเก็บสถานะประเภทการกรอง
  currentDeptFilter = signal<string>('');
  currentTypeFilter = signal<string>('all'); // 'all' | 'academic' | 'support'

  ngOnInit() {
    this.checkPermissions();
    this.fetchStaffData();
    this.listenToRouteParams();
  }

  // ฟังก์ชันตรวจสอบสิทธิ์ย่อยภายในหน้างานตามสิทธิ์ที่บันทึกมาจากตอนเปลี่ยนเส้นทาง URL
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
    this.canDelete.set(permsArray.some(p => p.includes('staff_info') && p.includes('delete') && !p.includes('none')));
  }

  // ดักฟังการเปลี่ยนค่า Query Params เมื่อผู้ใช้กดคลิกเมนูภาควิชาต่างๆ บน Sidebar
  listenToRouteParams() {
    this.route.queryParams.subscribe(params => {
      const dept = params['dept'] || '';
      this.currentDeptFilter.set(dept);
      this.applyFilter(); 
    });
  }

  // 🌟 ฟังก์ชันเปลี่ยนแท็บประเภทพนักงาน (วิชาการ / สนับสนุน)
  changeTypeFilter(type: string) {
    this.currentTypeFilter.set(type);
    this.applyFilter();
  }

  // 🌟 ฟังก์ชันรวมศูนย์การกรองข้อมูลแบบ Multi-Filter (กรองพร้อมกันทั้งภาควิชาและสายงาน)
  applyFilter() {
    const deptFilter = this.currentDeptFilter();
    const typeFilter = this.currentTypeFilter();
    let result = this.allStaffList();

    // ขั้นตอนที่ 1: กรองตามประเภทของภาควิชาก่อน
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

    // ขั้นตอนที่ 2: นำข้อมูลที่ได้มากรองประเภทสายงานต่อแบบต่อเนื่อง
    if (typeFilter !== 'all') {
      result = result.filter(staff => staff.type === typeFilter);
    }

    this.filteredStaffList.set(result);
  }

  // 🌟 ฟังก์ชันนับจำนวนพนักงานแยกตามแต่ละแท็บแบบไดนามิก สอดคล้องกับเมนูที่เลือกอยู่
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

  // เรียกข้อมูลพนักงานจริงจาก get_staff.php โดยส่ง X-User-Id แนบไปด้วยทุกครั้ง
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

  // ฟังก์ชันลบบัญชีจริง
  deleteStaff(id: number, name: string) {
    if (!this.canDelete()) {
      alert('คุณไม่มีสิทธิ์ในการลบข้อมูลบุคลากร');
      return;
    }

    if (confirm(`คำเตือน: คุณต้องการลบบัญชีของ "${name}" ใช่หรือไม่?\n(การกระทำนี้ไม่สามารถกู้คืนได้)`)) {
      const currentUserId = localStorage.getItem('user_id') || '14';
      const headers = new HttpHeaders().set('X-User-Id', currentUserId);

      this.http.delete(`http://localhost:8080/api/get_staff.php?staff_id=${id}`, { headers })
        .subscribe({
          next: (res: any) => {
            alert('ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว');
            this.fetchStaffData(); 
          },
          error: (err) => {
            alert('เกิดข้อผิดพลาดไม่สามารถลบข้อมูลได้');
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