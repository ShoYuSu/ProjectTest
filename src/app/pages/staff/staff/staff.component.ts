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

  // 🌟 ฟังก์ชันตรวจสอบสิทธิ์ที่แก้ไขแล้ว: ตรวจสอบ String สิทธิ์อย่างแม่นยำ และปิดสิทธิ์ลบหากไม่มีสิทธิ์ edit
  checkPermissions() {
    const role = localStorage.getItem('role');
    if (role === 'admin') {
      this.canAdd.set(true);
      this.canEdit.set(true);
      this.canDelete.set(true);
      return;
    }

    const permsString = (localStorage.getItem('permissions') || '').toLowerCase();
    
    // ตรวจสอบสิทธิ์ Add พนักงาน
    const hasAdd = permsString.includes('staff_info,add,all') || 
                   permsString.includes('staff_info,add,department') || 
                   permsString.includes('staff_info,add,dept');
                   
    // ตรวจสอบสิทธิ์ Edit พนักงาน               
    const hasEdit = permsString.includes('staff_info,edit,all') || 
                    permsString.includes('staff_info,edit,department') || 
                    permsString.includes('staff_info,edit,dept');

    this.canAdd.set(hasAdd);
    this.canEdit.set(hasEdit);
    
    // 🌟 บังคับเงื่อนไขตามกฎของท่าน: หากไม่มีสิทธิ์แก้ไข (Edit) จะไม่มีสิทธิ์มองเห็นและกดปุ่มลบอย่างเด็ดขาด
    this.canDelete.set(hasEdit);
  }

  // ดักฟังการเปลี่ยนค่า Query Params เมื่อผู้ใช้กดคลิกเมนูภาควิชาต่างๆ บน Sidebar
  listenToRouteParams() {
    this.route.queryParams.subscribe(params => {
      const dept = params['dept'] || '';
      this.currentDeptFilter.set(dept);
      this.applyFilter(); 
    });
  }

  // ฟังก์ชันเปลี่ยนแท็บประเภทพนักงาน (วิชาการ / สนับสนุน)
  changeTypeFilter(type: string) {
    this.currentTypeFilter.set(type);
    this.applyFilter();
  }

  // ฟังก์ชันรวมศูนย์การกรองข้อมูลแบบ Multi-Filter (กรองพร้อมกันทั้งภาควิชาและสายงาน)
  applyFilter() {
    const deptFilter = this.currentDeptFilter();
    const typeFilter = this.currentTypeFilter();
    let result = this.allStaffList();

    // ขั้นตอนที่ 1: กรองตามประเภทของภาควิขาก่อน
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

  // ฟังก์ชันนับจำนวนพนักงานแยกตามแต่ละแท็บแบบไดนามิก สอดคล้องกับเมนูที่เลือกอยู่
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

  // ฟังก์ชันปรับสถานะเป็น Inactive ผ่านการส่ง Payload เข้าสู่หลังบ้านอย่างปลอดภัย
  deleteStaff(id: number, name: string) {
    if (!this.canDelete()) {
      alert('คุณไม่มีสิทธิ์ในการลบข้อมูลบุคลากร');
      return;
    }

    if (confirm(`คำเตือน: คุณต้องการลบบัญชีของ "${name}" ใช่หรือไม่?\n(การกระทำนี้จะเปลี่ยนสถานะเป็น Inactive)`)) {
      const currentUserId = localStorage.getItem('user_id') || '14';
      const headers = new HttpHeaders().set('X-User-Id', currentUserId);

      this.http.post<any>('http://localhost:8080/api/delete_staff.php', { target_person_id: id }, { headers })
        .subscribe({
          next: (res: any) => {
            if (res && res.success) {
              alert('✅ ' + res.message);
              this.fetchStaffData(); 
            } else {
              alert('❌ ปฏิเสธการดำเนินการ: ' + (res.message || 'เกิดข้อผิดพลาด'));
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