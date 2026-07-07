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

  // 🌟 เก็บสิทธิ์การเพิ่มข้อมูล (ดึงจาก DB)
  canAdd = signal(false);

  allStaffList = signal<any[]>([]);
  filteredStaffList = signal<any[]>([]);
  errorMessage = signal<string>('');
  
  currentDeptFilter = signal<string>('');
  currentTypeFilter = signal<string>('all'); 

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
          if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
              const staffKey = Object.keys(perms).find(k => k.toLowerCase().includes('staff'));
              if (staffKey && perms[staffKey]) {
                const addScope = perms[staffKey]['add'];
                if (addScope && addScope.toLowerCase() !== 'none') {
                  hasAdd = true;
                }
              }
          }
          this.canAdd.set(hasAdd);
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

  applyFilter() {
    const deptFilter = this.currentDeptFilter();
    const typeFilter = this.currentTypeFilter();
    let result = this.allStaffList();

    // 🌟 แก้ไขชื่อภาควิชาให้ตรงกับ Database เพื่อให้ค้นหาเจอ
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
          // 🌟 Data Mapping: แปลงข้อมูลจาก DB ให้เข้ากับ UI
          const mappedData = data.map(item => {
            // เช็คและจัดการ Path รูปภาพ (ถ้าเป็น UI Avatars ให้ใช้เลย ถ้าเป็นไฟล์ Upload ให้ต่อ URL)
            let imgUrl = item.img_profile;
            if (imgUrl && !imgUrl.startsWith('http')) {
               imgUrl = `http://localhost:8080/${imgUrl}`;
            }

            return {
              id: item.person_id, // ใช้ person_id สำหรับส่งไปหน้า profile
              staff_id: item.staff_id, // เก็บไว้ใช้ตอนกดลบ
              person_id: item.person_id, // เก็บไว้ใช้ตอนกดลบ
              name: item.full_name,
              position: item.position || 'บุคลากร',
              department: item.department || 'ไม่ระบุสังกัด',
              image: imgUrl,
              type: item.position && item.position.includes('อาจารย์') ? 'academic' : 'support',
              researchCount: 0, // ค่าเบื้องต้น
              can_edit: item.can_edit // 🌟 สิทธิ์จากระบบ Guard
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

  // 🌟 ฟังก์ชันลบที่ปรับปรุงแล้ว: รับค่า 3 ตัว ส่งไป Backend เพื่อลบทั้ง 2 ตาราง
  deleteStaff(staff_id: number, person_id: number, name: string) {
    if (confirm(`⚠️ คำเตือน: คุณต้องการลบบัญชีและข้อมูลทั้งหมดของ "${name}" ใช่หรือไม่?\n(การกระทำนี้จะไม่สามารถกู้คืนได้)`)) {
      const currentUserId = localStorage.getItem('user_id') || '0';
      const headers = new HttpHeaders().set('X-User-Id', currentUserId);

      // ส่งไปทั้ง staff_id และ person_id
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