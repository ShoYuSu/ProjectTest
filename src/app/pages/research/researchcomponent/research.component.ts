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
  
  canAdd = signal(false); 
  editScope = signal<string>('none'); // 🌟
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.checkPermissions();
    this.fetchResearchData();
  }

  // 🌟 ฟังก์ชันตรวจสอบสิทธิ์ที่บังคับเช็คจากระบบ Permission เท่านั้น ไม่มีข้อยกเว้น
  checkPermissions() {
    const permsString = localStorage.getItem('permissions') || '';
    let hasAdd = false;
    let eScope = 'none'; // 🌟

    try {
      const permsObj = JSON.parse(permsString);
      
      if (permsObj && typeof permsObj === 'object' && !Array.isArray(permsObj)) {
        const researchKey = Object.keys(permsObj).find(k => k.toLowerCase() === 'research_info');
        if (researchKey && permsObj[researchKey]) {
          const addScope = permsObj[researchKey]['add'];
          if (addScope && addScope.toLowerCase() !== 'none') {
            hasAdd = true;
          }
          if (permsObj[researchKey]['edit']) {
            eScope = permsObj[researchKey]['edit'].toLowerCase(); // 🌟
          }
        }
      } 
      else if (Array.isArray(permsObj)) {
        const permAdd = permsObj.find(p => p.module_name?.toLowerCase() === 'research_info' && p.action?.toLowerCase() === 'add');
        if (permAdd && permAdd.scope?.toLowerCase() !== 'none') {
          hasAdd = true;
        }
        const permEdit = permsObj.find(p => p.module_name?.toLowerCase() === 'research_info' && p.action?.toLowerCase() === 'edit');
        if (permEdit) eScope = permEdit.scope?.toLowerCase() || 'none'; // 🌟
      }
    } catch (e) {
      const cleanStr = permsString.toLowerCase().replace(/[\s"'{}\[\]]/g, '');
      if (cleanStr.includes('research_info')) {
        const idx = cleanStr.indexOf('research_info');
        const subStr = cleanStr.substring(idx, idx + 50);
        if (subStr.includes('add') && !subStr.includes('none')) {
          hasAdd = true;
        }
        // ตรวจสอบแบบ string ไม่แม่นยำนัก แต่เซ็ต eScope ให้
        if (subStr.includes('edit')) eScope = 'self'; 
      }
    }

    this.canAdd.set(hasAdd);
    this.editScope.set(eScope); // 🌟
  }

  // 🌟 ฟังก์ชันตรวจสอบว่าควรโชว์ปุ่ม แก้ไข/ลบ ในแถวนี้ไหม
  canEditRow(project: any): boolean {
    const scope = this.editScope();
    if (scope === 'all') return true;
    if (scope === 'none' || !scope) return false;
    
    const myFullName = localStorage.getItem('full_name') || '';
    if (scope === 'self' || scope === 'own') {
      if (project.author && myFullName && project.author.includes(myFullName)) return true;
      return false;
    }
    
    if (scope === 'department' || scope === 'dept') {
      const userDeptStr = localStorage.getItem('user_dept') || '';
      const deptIdMap: any = { 'chem': 1, 'math': 2, 'cs': 3, 'physics': 4, 'food': 5 };
      if (deptIdMap[userDeptStr] && project.dept_id === deptIdMap[userDeptStr]) return true;
      
      const deptStringMap: any = { 'chem': 'เคมี', 'math': 'คณิตศาสตร์', 'cs': 'วิทยาการคอมพิวเตอร์', 'physics': 'ฟิสิกส์', 'food': 'เทคโนโลยีการอาหาร' };
      if (deptStringMap[userDeptStr] && project.department === deptStringMap[userDeptStr]) return true;

      return false;
    }
    return false;
  }

  fetchResearchData() {
    this.loading.set(true);
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '14');

    this.http.get<any[]>('http://localhost:8080/api/get_research.php', { headers })
      .subscribe({
        next: (data) => {
          this.allProjects.set(data || []);
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลโครงการวิจัยได้ (กรุณาตรวจสอบสิทธิ์การเข้าถึง)');
          this.loading.set(false);
        }
      });
  }

  // 🌟 ฟังก์ชันลบข้อมูล
  deleteProject(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลโครงการวิจัยนี้?\n(การลบจะไม่สามารถกู้คืนได้)')) {
      const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '14');
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