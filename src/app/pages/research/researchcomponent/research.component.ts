import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './research.component.html',
  styleUrl: './research.component.css'
})
export class ResearchComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute); 

  allProjects = signal<any[]>([]);
  filteredProjects = signal<any[]>([]);
  
  canAdd = signal(false); 
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');
  currentYear = signal<string>('ทั้งหมด'); 
  sortDirection = signal<'desc' | 'asc'>('desc');

  isExportMode = signal(false);
  selectedIds = signal<Set<number>>(new Set());

  currentPage = signal(1);
  itemsPerPage = 10;

  // 🌟 ตัวแปรสำหรับจำตำแหน่ง Scroll และ State
  private stateKey = 'research_state';
  currentScroll = 0;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  ngOnInit() {
    // 🌟 1. โหลด State เดิมที่เคยบันทึกไว้ตอนเปลี่ยนหน้า
    const savedState = sessionStorage.getItem(this.stateKey);
    if (savedState) {
      const state = JSON.parse(savedState);
      this.currentPage.set(state.page || 1);
      this.searchQuery.set(state.search || '');
      this.currentYear.set(state.year || 'ทั้งหมด');
      this.currentDept.set(state.dept || 'ทั้งหมด');
      this.sortDirection.set(state.sort || 'desc');
      this.currentScroll = state.scroll || 0;
    }

    // 🌟 2. ถ้ารับค่า Params มาจากหน้าโปรไฟล์ ให้บังคับเคลียร์ค่า State ปกติ
    this.route.queryParams.subscribe(params => {
      if (params['search'] || params['year']) {
        if (params['search']) this.searchQuery.set(params['search']);
        if (params['year']) this.currentYear.set(params['year']);
        this.currentPage.set(1);
        this.currentScroll = 0;
      }
    });

    this.fetchPermissionsFromDB(); 
    this.fetchResearchData();      
  }

  // 🌟 3. บันทึก State ทิ้งไว้เสมอเมื่อ Component ถูกทำลาย (เปลี่ยนไปหน้าแก้/เพิ่ม)
  ngOnDestroy() {
    const state = {
      page: this.currentPage(),
      search: this.searchQuery(),
      year: this.currentYear(),
      dept: this.currentDept(),
      sort: this.sortDirection(),
      scroll: this.currentScroll
    };
    sessionStorage.setItem(this.stateKey, JSON.stringify(state));
  }

  fetchPermissionsFromDB() {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (res) => {
          const p = res.permissions || res || {}; 
          let hasAdd = false;
          const modPerms = p['research_info'] || p['research'];
          if (modPerms && modPerms['add']) {
            const scope = modPerms['add'].toString().toLowerCase().trim();
            if (['all', 'department', 'self', 'own'].includes(scope)) hasAdd = true;
          }
          this.canAdd.set(hasAdd);
        },
        error: (err) => {
          console.error(err);
          this.canAdd.set(false);
        }
      });
  }

  fetchResearchData() {
    this.loading.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:8080/api/get_research.php', { headers })
      .subscribe({
        next: (data) => {
          const mappedData = (data || []).map(item => ({
            id: item.id || item.res_project_id,
            name: item.name || item.title,
            author: item.author || '-',
            department: item.department,
            involved_departments: item.involved_departments || '', 
            year: item.year || item.year_funded,
            yearEnded: item.yearEnded || item.year_ended, 
            fundSource: item.fundSource || item.funding_source || '-',
            budget: item.budget || 0,
            attachedFile: item.attachedFile || null,
            can_edit: item.can_edit,
            can_delete: item.can_delete 
          }));

          this.allProjects.set(mappedData);
          this.applyFilters(false); // 🌟 โหลดข้อมูลเสร็จ ห้ามรีเซ็ตหน้าเพจ
          this.loading.set(false);
          
          // 🌟 4. เลื่อน Scroll กลับไปตำแหน่งเดิมหลังจาก Render เสร็จ
          setTimeout(() => {
            if (this.scrollContainer) {
              this.scrollContainer.nativeElement.scrollTop = this.currentScroll;
            }
          }, 50);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลโครงการวิจัยได้');
          this.loading.set(false);
        }
      });
  }

  deleteProject(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลโครงการวิจัยนี้?\n(การลบจะไม่สามารถกู้คืนได้)')) {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.post<any>('http://localhost:8080/api/delete_research.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { alert('✅ ลบข้อมูลสำเร็จ'); this.fetchResearchData(); } 
            else { alert('❌ ' + res.message); }
          },
          error: () => alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        });
    }
  }

  availableYears = computed(() => {
    const years = this.allProjects().map(p => p.year).filter(y => y !== null && y !== undefined && y !== '');
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a)); 
    return ['ทั้งหมด', ...uniqueYears.map(String)];
  });

  // 🌟 ฟังก์ชันจัดการการรีเซ็ต Scroll และ บันทึก Scroll
  onScroll(event: any) { this.currentScroll = event.target.scrollTop; }
  resetScroll() {
    this.currentScroll = 0;
    if (this.scrollContainer) this.scrollContainer.nativeElement.scrollTop = 0;
  }

  toggleSort() {
    this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc');
    this.applyFilters(true);
  }

  applyFilters(resetPage = true) {
    let result = this.allProjects();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();
    const year = this.currentYear();

    if (dept !== 'ทั้งหมด') result = result.filter(p => p.involved_departments && p.involved_departments.includes(dept));
    if (year !== 'ทั้งหมด') result = result.filter(p => String(p.year) === year);
    if (query) {
      result = result.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.author && p.author.toLowerCase().includes(query)) ||
        (p.fundSource && p.fundSource.toLowerCase().includes(query))
      );
    }

    const sortedResult = [...result].sort((a, b) => {
      if (this.sortDirection() === 'desc') return b.id - a.id;
      else return a.id - b.id;
    });

    this.filteredProjects.set(sortedResult);
    
    // 🌟 จัดการให้เปลี่ยนหน้าเฉพาะเมื่อฟิลเตอร์เปลี่ยน
    if (resetPage) {
      this.currentPage.set(1);
      this.resetScroll();
    } else {
      const totalP = Math.max(1, Math.ceil(sortedResult.length / this.itemsPerPage));
      if (this.currentPage() > totalP) this.currentPage.set(totalP);
    }
  }

  setDepartment(deptName: string) { this.currentDept.set(deptName); this.applyFilters(true); }
  setYear(year: string) { this.currentYear.set(year); this.applyFilters(true); }
  onSearchChange(val: string) { this.searchQuery.set(val); this.applyFilters(true); }

  toggleExportMode() { this.isExportMode.set(!this.isExportMode()); this.selectedIds.set(new Set()); }
  toggleSelection(id: number) {
    const current = new Set(this.selectedIds());
    if (current.has(id)) current.delete(id);
    else current.add(id);
    this.selectedIds.set(current);
  }
  toggleAll() {
    if (this.isAllSelected()) this.selectedIds.set(new Set());
    else this.selectedIds.set(new Set(this.filteredProjects().map(p => p.id)));
  }
  isAllSelected(): boolean { return this.filteredProjects().length > 0 && this.selectedIds().size === this.filteredProjects().length; }

  exportSelectedToCSV() {
    let dataToExport = this.filteredProjects();
    if (this.selectedIds().size > 0) dataToExport = dataToExport.filter(item => this.selectedIds().has(item.id));
    if (dataToExport.length === 0) { alert('⚠️ ไม่มีข้อมูลสำหรับ Export'); return; }

    const headers = ['ID', 'ชื่อโครงการวิจัย', 'ผู้รับผิดชอบโครงการ', 'ปีที่ได้รับ', 'ปีที่สิ้นสุด', 'แหล่งทุน', 'งบประมาณ (บาท)', 'ภาควิชา'];
    const csvRows = dataToExport.map(item => {
      return [
        item.id, `"${item.name}"`, `"${item.author}"`, item.year || '-', item.yearEnded || 'ปัจจุบัน', `"${item.fundSource}"`, item.budget || 0, `"${item.department}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `research_project_report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden'; document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
    this.toggleExportMode(); 
  }

  paginatedProjects = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredProjects().slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredProjects().length / this.itemsPerPage)));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  goToPage(page: number) { this.currentPage.set(page); this.resetScroll(); }
  nextPage() { if(this.currentPage() < this.totalPages()) { this.currentPage.update(p => p + 1); this.resetScroll(); } }
  prevPage() { if(this.currentPage() > 1) { this.currentPage.update(p => p - 1); this.resetScroll(); } }
}