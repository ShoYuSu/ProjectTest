import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.css'
})
export class PlansComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute); 

  allPlans = signal<any[]>([]);
  filteredPlans = signal<any[]>([]);
  canAdd = signal(false); 
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentYear = signal<string>('ทั้งหมด');
  sortDirection = signal<'desc' | 'asc'>('desc');

  isExportMode = signal(false);
  selectedIds = signal<Set<number>>(new Set());

  currentPage = signal(1);
  itemsPerPage = 10;

  // 🌟 State & Scroll Persistence
  private stateKey = 'plan_state';
  currentScroll = 0;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  ngOnInit() {
    const savedState = sessionStorage.getItem(this.stateKey);
    if (savedState) {
      const state = JSON.parse(savedState);
      this.currentPage.set(state.page || 1);
      this.searchQuery.set(state.search || '');
      this.currentYear.set(state.year || 'ทั้งหมด');
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
    this.fetchPlanData();
  }

  ngOnDestroy() {
    const state = {
      page: this.currentPage(),
      search: this.searchQuery(),
      year: this.currentYear(),
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
          const perms = res.permissions || res || {}; 
          let hasAdd = false;
          const targetModules = ['plan_project', 'plan_info', 'plan']; 
          for (const mod of targetModules) {
            if (perms[mod] && Object.keys(perms[mod]).some(act => act.toLowerCase() === 'add' && perms[mod][act] !== 'none')) {
               hasAdd = true; break;
            }
          }
          this.canAdd.set(hasAdd);
        }
      });
  }

  fetchPlanData() {
    this.loading.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:8080/api/get_plans.php', { headers })
      .subscribe({
        next: (data) => {
          const mappedData = (data || []).map(item => ({
            ...item,
            proposalFile: item.proposalFile || null,
            summaryFile: item.summaryFile || null,
            participants: item.participants || '-',
            sub_activities: item.sub_activities ? item.sub_activities.split('|||') : []
          }));
          this.allPlans.set(mappedData);
          this.applyFilters(false);
          this.loading.set(false);

          setTimeout(() => {
            if (this.scrollContainer) this.scrollContainer.nativeElement.scrollTop = this.currentScroll;
          }, 50);
        }
      });
  }

  deletePlan(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? (ไม่สามารถกู้คืนได้)')) {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.post<any>('http://localhost:8080/api/delete_plan.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { alert('✅ ลบข้อมูลสำเร็จ'); this.fetchPlanData(); } 
            else { alert('❌ ' + res.message); }
          }
        });
    }
  }

  availableYears = computed(() => {
    const years = this.allPlans().map(p => p.year).filter(y => y !== null && y !== undefined && y !== '');
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
    let result = this.allPlans();
    const query = this.searchQuery().toLowerCase().trim();
    const year = this.currentYear();

    if (year !== 'ทั้งหมด') result = result.filter(p => String(p.year) === year);
    if (query) {
      result = result.filter(p => 
        (p.plan_name && p.plan_name.toLowerCase().includes(query)) ||
        (p.participants && p.participants.toLowerCase().includes(query)) ||
        (p.strategy && p.strategy.toLowerCase().includes(query))
      );
    }

    const sortedResult = [...result].sort((a, b) => {
      if (this.sortDirection() === 'desc') return b.id - a.id;
      else return a.id - b.id;
    });

    this.filteredPlans.set(sortedResult);
    
    if (resetPage) {
      this.currentPage.set(1);
      this.resetScroll();
    } else {
      const totalP = Math.max(1, Math.ceil(sortedResult.length / this.itemsPerPage));
      if (this.currentPage() > totalP) this.currentPage.set(totalP);
    }
  }

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
    else this.selectedIds.set(new Set(this.filteredPlans().map(p => p.id)));
  }
  isAllSelected(): boolean { return this.filteredPlans().length > 0 && this.selectedIds().size === this.filteredPlans().length; }

  exportSelectedToCSV() {
    let dataToExport = this.filteredPlans();
    if (this.selectedIds().size > 0) dataToExport = dataToExport.filter(item => this.selectedIds().has(item.id));
    if (dataToExport.length === 0) { alert('⚠️ ไม่มีข้อมูลสำหรับ Export'); return; }

    const escapeCSV = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
    const headers = ['ID', 'ชื่อแผนงาน', 'ยุทธศาสตร์', 'กิจกรรมย่อย', 'ผู้รับผิดชอบ', 'ประเภทแผนงาน', 'ปี พ.ศ.', 'งบที่ได้รับ (บาท)', 'งบที่ใช้ไป (บาท)', 'สถานะ', 'รายละเอียด'];
    
    const csvRows = dataToExport.map(item => {
      const subActs = item.sub_activities ? item.sub_activities.join(' ; ') : '-';
      return [
        item.id, escapeCSV(item.plan_name), escapeCSV(item.strategy), escapeCSV(subActs), escapeCSV(item.participants),
        escapeCSV(item.plan_type), item.year || '-', item.approved_budget || 0, item.used_budget || 0, escapeCSV(item.status), escapeCSV(item.details)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `plans_projects_report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    this.toggleExportMode(); 
  }

  paginatedPlans = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredPlans().slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPlans().length / this.itemsPerPage)));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  goToPage(page: number) { this.currentPage.set(page); this.resetScroll(); }
  nextPage() { if(this.currentPage() < this.totalPages()) { this.currentPage.update(p => p + 1); this.resetScroll(); } }
  prevPage() { if(this.currentPage() > 1) { this.currentPage.update(p => p - 1); this.resetScroll(); } }
}