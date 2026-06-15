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

    try {
      const permsObj = JSON.parse(permsString);
      
      if (permsObj && typeof permsObj === 'object' && !Array.isArray(permsObj)) {
        const researchKey = Object.keys(permsObj).find(k => k.toLowerCase() === 'research_info');
        if (researchKey && permsObj[researchKey]) {
          const addScope = permsObj[researchKey]['add'];
          if (addScope && addScope.toLowerCase() !== 'none') {
            hasAdd = true;
          }
        }
      } 
      else if (Array.isArray(permsObj)) {
        const perm = permsObj.find(p => p.module_name?.toLowerCase() === 'research_info' && p.action?.toLowerCase() === 'add');
        if (perm && perm.scope?.toLowerCase() !== 'none') {
          hasAdd = true;
        }
      }
    } catch (e) {
      const cleanStr = permsString.toLowerCase().replace(/[\s"'{}\[\]]/g, '');
      if (cleanStr.includes('research_info')) {
        const idx = cleanStr.indexOf('research_info');
        const subStr = cleanStr.substring(idx, idx + 50);
        if (subStr.includes('add') && !subStr.includes('none')) {
          hasAdd = true;
        }
      }
    }

    this.canAdd.set(hasAdd);
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