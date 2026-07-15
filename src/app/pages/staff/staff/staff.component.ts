import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

  // ข้อมูลดิบจาก API
  rawStaffList = signal<any[]>([]);
  
  // State สำหรับ UI ตาม HTML ต้นฉบับ
  searchQuery = signal<string>('');
  currentTypeFilter = signal<'all' | 'academic' | 'support'>('all');
  currentDept = signal<string>('');
  
  canAdd = signal<boolean>(false);
  errorMessage = signal<string>('');

  // 🌟 ใช้ Computed ประมวลผลข้อมูลตาม Search และ Tab ที่เลือกอัตโนมัติ
  filteredStaffList = computed(() => {
    let list = this.rawStaffList();
    const search = this.searchQuery().toLowerCase().trim();
    const type = this.currentTypeFilter();

    // 1. กรองตามประเภท (สายวิชาการ / สายสนับสนุน)
    if (type === 'academic') {
      list = list.filter(s => s.position.includes('อาจารย์') || s.position.includes('วิชาการ'));
    } else if (type === 'support') {
      list = list.filter(s => !s.position.includes('อาจารย์') && !s.position.includes('วิชาการ'));
    }

    // 2. กรองตามคำค้นหา (Search)
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
    
    // คอยดักจับ URL Parameter เพื่อรีโหลดข้อมูลหากเลือกภาควิชาจาก Sidebar
    this.route.queryParams.subscribe(params => {
      const dept = params['dept'] || '';
      this.currentDept.set(dept);
      this.loadStaff(dept);
    });
  }

  // 🌟 1. ดึงสิทธิ์ว่า User นี้มีสิทธิ์ "เพิ่ม" บุคลากรหรือไม่
  checkPermissions() {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (res) => {
          const perms = res.permissions || {};
          if (perms['Staff_info']) {
            this.canAdd.set(perms['Staff_info']['add'] !== 'none');
          }
        },
        error: (err) => console.error('Permission fetch error:', err)
      });
  }

  // 🌟 2. ดึงข้อมูลบุคลากร และ Map ข้อมูลให้ตรงกับที่ HTML ต้นฉบับต้องการ
  loadStaff(deptFilter: string) {
    this.errorMessage.set('');
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:8080/api/get_staff.php', { headers })
      .subscribe({
        next: (data) => {
          // กรองข้อมูลตามภาควิชา (Frontend Filter) 
          let filteredData = data;
          if (deptFilter) {
            const deptMap: Record<string, number> = { 'math': 2, 'chem': 1, 'food': 5, 'physics': 4, 'cs': 3 };
            const deptId = deptMap[deptFilter];
            if (deptId) {
              filteredData = data.filter(s => parseInt(s.dept_id) === deptId);
            }
          }

          // Map ข้อมูลให้ตรงกับตัวแปรใน HTML ของคุณ
          const mappedData = filteredData.map(item => ({
            id: item.person_id,
            staff_id: item.staff_id,
            person_id: item.person_id,
            name: item.full_name,
            image: item.img_profile ? 'http://localhost:8080/api/' + item.img_profile.replace(/^\/+/, '') : null,
            position: item.position,
            department: item.department || 'ส่วนกลาง',
            researchCount: 0, // Placeholder สามารถอัปเดต Query ในอนาคตเพื่อดึงยอดงานวิจัยจริงได้
            can_edit: item.can_delete || item.can_edit // ใช้สิทธิ์ลบ/แก้ไข เปิดปุ่มลบใน HTML ของคุณ
          }));

          this.rawStaffList.set(mappedData);
        },
        error: (err) => {
          console.error('Staff fetch error:', err);
          this.errorMessage.set('ไม่สามารถดึงข้อมูลได้ (เซสชั่นอาจหมดอายุ หรือไม่มีสิทธิ์เข้าถึง)');
        }
      });
  }

  // 🌟 3. ฟังก์ชันจัดการ Filter และ Search สำหรับ UI
  onSearchChange(text: string) {
    this.searchQuery.set(text);
  }

  changeTypeFilter(type: 'all' | 'academic' | 'support') {
    this.currentTypeFilter.set(type);
  }

  getStaffCount(type: 'all' | 'academic' | 'support'): number {
    const list = this.rawStaffList();
    if (type === 'academic') {
      return list.filter(s => s.position.includes('อาจารย์') || s.position.includes('วิชาการ')).length;
    } else if (type === 'support') {
      return list.filter(s => !s.position.includes('อาจารย์') && !s.position.includes('วิชาการ')).length;
    }
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

  // 🌟 4. ฟังก์ชันลบบุคลากร
  deleteStaff(staffId: number, personId: number, name: string) {
    if (confirm(`คุณต้องการลบข้อมูลของ ${name} ใช่หรือไม่?`)) {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.post<any>('http://localhost:8080/api/delete_staff.php', {
        staff_id: staffId,
        person_id: personId
      }, { headers }).subscribe({
        next: (res) => {
          if (res.success) {
            alert('ลบข้อมูลสำเร็จ');
            this.loadStaff(this.currentDept());
          } else {
            this.errorMessage.set('เกิดข้อผิดพลาด: ' + res.message);
          }
        },
        error: (err) => {
          this.errorMessage.set('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
      });
    }
  }
}