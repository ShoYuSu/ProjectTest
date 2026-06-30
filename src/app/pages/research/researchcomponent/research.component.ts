import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './research.component.html',
  styleUrl: './research.component.css'
})
export class ResearchComponent implements OnInit {
  private http = inject(HttpClient);

  allProjects = signal<any[]>([]);
  filteredProjects = signal<any[]>([]);
  
  // 🌟 ตัวแปรเก็บสิทธิ์ใน Memory (F12 เข้ามาแก้ไม่ได้)
  canAdd = signal(false); 
  
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.fetchPermissionsFromDB(); // 🌟 ยิง API เช็คสิทธิ์ Add สดๆ จาก DB
    this.fetchResearchData();      // 🌟 ยิง API โหลดข้อมูล (ที่แนบสิทธิ์ Edit/Delete มาแล้ว)
  }

  // 🛡️ ฟังก์ชันเช็คสิทธิ์แบบปลอดภัย (ไม่สน LocalStorage)
  fetchPermissionsFromDB() {
    // X-User-Id เป็นตัวเดียวที่ต้องใช้ เพื่อระบุตัวตน (Backend มี Guard เช็คอีกชั้นตอนบันทึก)
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');
    
    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (perms) => {
          let hasAdd = false;
          // perms จะได้มาจาก API ของคุณโดยตรงเช่น { "Research_info": { "add": "department" } }
          
          // ค้นหา key 'research_info' แบบไม่สนตัวพิมพ์เล็ก/ใหญ่
          const researchKey = Object.keys(perms).find(k => k.toLowerCase() === 'research_info');
          
          if (researchKey && perms[researchKey]) {
            const addScope = perms[researchKey]['add'];
            if (addScope && addScope.toLowerCase() !== 'none') {
              hasAdd = true; // ถ้า DB บอกว่ามีสิทธิ์ ก็เปิดปุ่ม Add!
            }
          }
          
          this.canAdd.set(hasAdd);
        },
        error: (err) => console.error('ไม่สามารถโหลดสิทธิ์จากฐานข้อมูลได้', err)
      });
  }

  fetchResearchData() {
    this.loading.set(true);
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');

    this.http.get<any[]>('http://localhost:8080/api/get_research.php', { headers })
      .subscribe({
        next: (data) => {
          // data ที่ได้มา จะมีคำว่า can_edit: true/false ติดมาด้วยทุก Row จากหลังบ้าน
          this.allProjects.set(data || []);
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลโครงการวิจัยได้ (กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล)');
          this.loading.set(false);
        }
      });
  }

  deleteProject(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลโครงการวิจัยนี้?\n(การลบจะไม่สามารถกู้คืนได้)')) {
      const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');
      this.http.post<any>('http://localhost:8080/api/delete_research.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { 
              alert('✅ ลบข้อมูลสำเร็จ'); 
              this.fetchResearchData(); 
            } else { 
              alert('❌ ' + res.message); 
            }
          },
          error: () => alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        });
    }
  }

  applyFilters() {
    let result = this.allProjects();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();

    if (dept !== 'ทั้งหมด') {
      result = result.filter(p => p.department === dept);
    }

    if (query) {
      result = result.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.author && p.author.toLowerCase().includes(query)) ||
        (p.fundSource && p.fundSource.toLowerCase().includes(query))
      );
    }

    this.filteredProjects.set(result);
    this.currentPage.set(1); 
  }

  setDepartment(deptName: string) {
    this.currentDept.set(deptName);
    this.applyFilters();
  }

  onSearchChange(val: string) {
    this.searchQuery.set(val);
    this.applyFilters();
  }

  paginatedProjects = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredProjects().slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredProjects().length / this.itemsPerPage)));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  goToPage(page: number) { this.currentPage.set(page); }
  nextPage() { if(this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if(this.currentPage() > 1) this.currentPage.update(p => p - 1); }
}