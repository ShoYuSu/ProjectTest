import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // 🌟 1. นำเข้า FormsModule สำหรับระบบค้นหา

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], // 🌟 2. ใส่ FormsModule ในนี้
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css'
})
export class StaffComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  canAdd = signal(false);
  canDelete = signal(false);

  allStaffList = signal<any[]>([]);
  filteredStaffList = signal<any[]>([]);
  errorMessage = signal<string>('');
  
  currentDeptFilter = signal<string>('');
  currentTypeFilter = signal<string>('all'); 
  searchQuery = signal<string>(''); // 🌟 3. เพิ่มตัวแปรเก็บคำค้นหา

  ngOnInit() {
    this.fetchPermissionsFromDB();
    this.fetchStaffData();
    this.listenToRouteParams();
  }

  // 🛡️ ดึงสิทธิ์ Add จากฐานข้อมูลสดๆ ป้องกัน F12
  fetchPermissionsFromDB() {
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');
    
    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (perms) => {
          let hasAdd = false;
          let hasDelete = false;
          if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
              const staffKey = Object.keys(perms).find(k => k.toLowerCase().includes('staff'));
              if (staffKey && perms[staffKey]) {
                const addScope = perms[staffKey]['add'];
                const editScope = perms[staffKey]['edit'];
                if (addScope && addScope.toLowerCase() !== 'none') hasAdd = true;
                if (editScope && editScope.toLowerCase() !== 'none') hasDelete = true;
              }
          }
          this.canAdd.set(hasAdd);
          this.canDelete.set(hasDelete);
        },
        error: (err) => console.error('ไม่สามารถโหลดสิทธิ์จากฐานข้อมูลได้', err)
      });
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

  // 🌟 4. ฟังก์ชันรับค่าเมื่อพิมพ์ค้นหา
  onSearchChange(val: string) {
    this.searchQuery.set(val);
    this.applyFilter();
  }

  applyFilter() {
    const deptFilter = this.currentDeptFilter();
    const typeFilter = this.currentTypeFilter();
    const query = this.searchQuery().toLowerCase().trim(); // 🌟 ดึงคำค้นหา
    let result = this.allStaffList();

    // กรองภาควิชา (แก้ชื่อให้ตรง Database)
    if (deptFilter) {
      let targetDeptName = '';
      switch (deptFilter) {
        case 'math': targetDeptName = 'ภาควิชาคณิตศาสตร์'; break;
        case 'chem': targetDeptName = 'ภาควิชาเคมี'; break;
        case 'food': targetDeptName = 'ภาควิชาเทคโนโลยีการอาหาร'; break;
        case 'physics': targetDeptName = 'ภาควิชาฟิสิกส์'; break;
        case 'cs': targetDeptName = 'ภาควิชาวิทยาการคอมพิวเตอร์'; break;
      }
      if (targetDeptName) {
        result = result.filter(staff => staff.department === targetDeptName);
      }
    }

    // กรองสายงาน
    if (typeFilter !== 'all') {
      result = result.filter(staff => staff.type === typeFilter);
    }

    // 🌟 5. กรองด้วยคำค้นหา (ค้นหาจากชื่อ หรือ ตำแหน่ง หรือ ภาควิชา)
    if (query) {
      result = result.filter(staff => 
        (staff.name && staff.name.toLowerCase().includes(query)) ||
        (staff.position && staff.position.toLowerCase().includes(query)) ||
        (staff.department && staff.department.toLowerCase().includes(query))
      );
    }

    this.filteredStaffList.set(result);
  }

  getStaffCount(type: string): number {
    const deptFilter = this.currentDeptFilter();
    let list = this.allStaffList();

    if (deptFilter) {
      let targetDeptName = '';
      switch (deptFilter) {
        case 'math': targetDeptName = 'ภาควิชาคณิตศาสตร์'; break;
        case 'chem': targetDeptName = 'ภาควิชาเคมี'; break;
        case 'food': targetDeptName = 'ภาควิชาเทคโนโลยีการอาหาร'; break;
        case 'physics': targetDeptName = 'ภาควิชาฟิสิกส์'; break;
        case 'cs': targetDeptName = 'ภาควิชาวิทยาการคอมพิวเตอร์'; break;
      }
      list = list.filter(staff => staff.department === targetDeptName);
    }

    if (type === 'all') return list.length;
    return list.filter(staff => staff.type === type).length;
  }

  fetchStaffData() {
    const currentUserId = localStorage.getItem('user_id') || '0'; 
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    this.http.get<any[]>('http://localhost:8080/api/get_staff.php', { headers })
      .subscribe({
        next: (data) => {
          const mappedData = data.map(item => {
            let imgUrl = item.img_profile;
            if (imgUrl && !imgUrl.startsWith('http')) {
               imgUrl = `http://localhost:8080/${imgUrl}`;
            }

            return {
              id: item.person_id, 
              staff_id: item.staff_id, 
              person_id: item.person_id, 
              name: item.full_name,
              position: item.position || 'บุคลากร',
              department: item.department || 'ไม่ระบุสังกัด',
              image: imgUrl,
              type: item.position && item.position.includes('อาจารย์') ? 'academic' : 'support',
              researchCount: 0, 
              can_edit: item.can_edit 
            };
          });

          this.allStaffList.set(mappedData);
          this.applyFilter(); 
          this.errorMessage.set('');
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ระบบขัดข้อง หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูล');
        }
      });
  }

  // ส่งไปทั้ง 3 ค่าให้ API ทำ Transaction การลบอย่างสมบูรณ์
  deleteStaff(staff_id: number, person_id: number, name: string) {
    if (confirm(`⚠️ คำเตือน: คุณต้องการลบบัญชีและข้อมูลทั้งหมดของ "${name}" ใช่หรือไม่?\n(การกระทำนี้จะไม่สามารถกู้คืนได้)`)) {
      const currentUserId = localStorage.getItem('user_id') || '0';
      const headers = new HttpHeaders().set('X-User-Id', currentUserId);

      this.http.post<any>('http://localhost:8080/api/delete_staff.php', { staff_id: staff_id, person_id: person_id }, { headers })
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
            const errorDetail = err.error?.error || err.error?.message || err.message;
            alert('❌ เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ' + errorDetail);
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