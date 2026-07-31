import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './training.component.html',
  styleUrl: './training.component.css'
})
export class TrainingComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute); 

  allTrainings = signal<any[]>([]);
  filteredTrainings = signal<any[]>([]);
  
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

  // 🌟 State & Scroll Persistence
  private stateKey = 'training_state';
  currentScroll = 0;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  ngOnInit() {
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

    this.route.queryParams.subscribe(params => {
      if (params['search'] || params['year']) {
        if (params['search']) this.searchQuery.set(params['search']);
        if (params['year']) this.currentYear.set(params['year']);
        this.currentPage.set(1);
        this.currentScroll = 0;
      }
    });

    this.fetchPermissionsFromDB();
    this.fetchTrainingData();
  }

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
          const modPerms = p['training_info'] || p['training'];
          if (modPerms && modPerms['add'] && modPerms['add'].toString().toLowerCase() !== 'none') {
             hasAdd = true;
          }
          this.canAdd.set(hasAdd);
        }
      });
  }

  fetchTrainingData() {
    this.loading.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:8080/api/get_training.php', { headers })
      .subscribe({
        next: (data) => {
          const mappedData = (data || []).map(item => {
             let year = null;
             if (item.start_date) {
                const dateObj = new Date(item.start_date);
                if (!isNaN(dateObj.getTime())) year = dateObj.getFullYear() + 543;
             }
             return { ...item, year: year };
          });
          
          this.allTrainings.set(mappedData);
          this.applyFilters(false);
          this.loading.set(false);

          setTimeout(() => {
            if (this.scrollContainer) this.scrollContainer.nativeElement.scrollTop = this.currentScroll;
          }, 50);
        }
      });
  }

  deleteTraining(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการอบรมนี้?\n(การลบจะไม่สามารถกู้คืนได้)')) {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.post<any>('http://localhost:8080/api/delete_training.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { alert('✅ ลบข้อมูลสำเร็จ'); this.fetchTrainingData(); } 
          }
        });
    }
  }

  availableYears = computed(() => {
    const years = this.allTrainings().map(t => t.year).filter(y => y !== null && y !== undefined && y !== '');
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a)); 
    return ['ทั้งหมด', ...uniqueYears.map(String)];
  });

  onScroll(event: any) { this.currentScroll = event.target.scrollTop; }
  resetScroll() {
    this.currentScroll = 0;
    if (this.scrollContainer) this.scrollContainer.nativeElement.scrollTop = 0;
  }

  toggleSort() { this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc'); this.applyFilters(true); }

  applyFilters(resetPage = true) {
    let result = this.allTrainings();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();
    const year = this.currentYear();

    if (dept !== 'ทั้งหมด') result = result.filter(t => t.involved_departments && t.involved_departments.includes(dept));
    if (year !== 'ทั้งหมด') result = result.filter(t => String(t.year) === year);
    if (query) {
      result = result.filter(t => 
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.participants && t.participants.toLowerCase().includes(query)) ||
        (t.location && t.location.toLowerCase().includes(query))
      );
    }

    const sortedResult = [...result].sort((a, b) => {
      if (this.sortDirection() === 'desc') return b.id - a.id;
      else return a.id - b.id;
    });

    this.filteredTrainings.set(sortedResult);
    
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
    if (current.has(id)) current.delete(id); else current.add(id);
    this.selectedIds.set(current);
  }
  toggleAll() {
    if (this.isAllSelected()) this.selectedIds.set(new Set());
    else this.selectedIds.set(new Set(this.filteredTrainings().map(t => t.id)));
  }
  isAllSelected(): boolean { return this.filteredTrainings().length > 0 && this.selectedIds().size === this.filteredTrainings().length; }

  exportSelectedToCSV() {
    let dataToExport = this.filteredTrainings();
    if (this.selectedIds().size > 0) dataToExport = dataToExport.filter(item => this.selectedIds().has(item.id));
    if (dataToExport.length === 0) { alert('⚠️ ไม่มีข้อมูลสำหรับ Export'); return; }

    const escapeCSV = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
    const headers = ['ID', 'หัวข้อการอบรม', 'ผู้เข้าร่วม', 'วันที่เริ่มต้น', 'วันที่สิ้นสุด', 'สถานที่', 'ค่าใช้จ่าย (บาท)', 'ภาควิชา'];
    
    const csvRows = dataToExport.map(item => {
      return [
        item.id, escapeCSV(item.title), escapeCSV(item.participants), escapeCSV(item.start_date),
        escapeCSV(item.end_date), escapeCSV(item.location), item.budget || 0, escapeCSV(item.department)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `training_report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    this.toggleExportMode(); 
  }

  paginatedTrainings = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredTrainings().slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTrainings().length / this.itemsPerPage)));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  goToPage(page: number) { this.currentPage.set(page); this.resetScroll(); }
  nextPage() { if(this.currentPage() < this.totalPages()) { this.currentPage.update(p => p + 1); this.resetScroll(); } }
  prevPage() { if(this.currentPage() > 1) { this.currentPage.update(p => p - 1); this.resetScroll(); } }
}