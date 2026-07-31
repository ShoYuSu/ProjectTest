import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
export class PlansComponent implements OnInit {
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

  // 🌟 ระบบ Export Report
  isExportMode = signal(false);
  selectedIds = signal<Set<number>>(new Set());

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['search']) this.searchQuery.set(params['search']);
      if (params['year']) this.currentYear.set(params['year']);
    });

    this.fetchPermissionsFromDB();
    this.fetchPlanData();
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
            if (perms[mod]) {
              for (const act in perms[mod]) {
                if (act.toLowerCase() === 'add') {
                  const scope = (perms[mod][act] || '').toString().toLowerCase().trim();
                  if (['all', 'department', 'self', 'own'].includes(scope)) {
                    hasAdd = true;
                  }
                }
              }
            }
          }
          this.canAdd.set(hasAdd);
        },
        error: (err) => {
          console.error('ไม่สามารถโหลดสิทธิ์จากฐานข้อมูลได้', err);
          this.canAdd.set(false);
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
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลแผนงานได้');
          this.loading.set(false);
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
          },
          error: () => alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        });
    }
  }

  availableYears = computed(() => {
    const years = this.allPlans().map(p => p.year).filter(y => y !== null && y !== undefined && y !== '');
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a)); 
    return ['ทั้งหมด', ...uniqueYears.map(String)];
  });

  toggleSort() {
    this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc');
    this.applyFilters();
  }

  applyFilters() {
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
    this.currentPage.set(1); 
  }

  setYear(year: string) { this.currentYear.set(year); this.applyFilters(); }
  onSearchChange(val: string) { this.searchQuery.set(val); this.applyFilters(); }

  // 🌟 ฟังก์ชันจัดการ Report & Export
  toggleExportMode() {
    this.isExportMode.set(!this.isExportMode());
    this.selectedIds.set(new Set()); 
  }

  toggleSelection(id: number) {
    const current = new Set(this.selectedIds());
    if (current.has(id)) current.delete(id);
    else current.add(id);
    this.selectedIds.set(current);
  }

  toggleAll() {
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      const allIds = this.filteredPlans().map(p => p.id);
      this.selectedIds.set(new Set(allIds));
    }
  }

  isAllSelected(): boolean {
    return this.filteredPlans().length > 0 && this.selectedIds().size === this.filteredPlans().length;
  }

  exportSelectedToCSV() {
    let dataToExport = this.filteredPlans();
    if (this.selectedIds().size > 0) {
      dataToExport = dataToExport.filter(item => this.selectedIds().has(item.id));
    }

    if (dataToExport.length === 0) {
      alert('⚠️ ไม่มีข้อมูลสำหรับ Export');
      return;
    }

    const escapeCSV = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;

    const headers = ['ID', 'ชื่อแผนงาน', 'ยุทธศาสตร์', 'กิจกรรมย่อย', 'ผู้รับผิดชอบ', 'ประเภทแผนงาน', 'ปี พ.ศ.', 'งบที่ได้รับ (บาท)', 'งบที่ใช้ไป (บาท)', 'สถานะ', 'รายละเอียด'];
    
    const csvRows = dataToExport.map(item => {
      const subActs = item.sub_activities ? item.sub_activities.join(' ; ') : '-';
      return [
        item.id,
        escapeCSV(item.plan_name),
        escapeCSV(item.strategy),
        escapeCSV(subActs),
        escapeCSV(item.participants),
        escapeCSV(item.plan_type),
        item.year || '-',
        item.approved_budget || 0,
        item.used_budget || 0,
        escapeCSV(item.status),
        escapeCSV(item.details)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `plans_projects_report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toggleExportMode(); 
  }

  paginatedPlans = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredPlans().slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPlans().length / this.itemsPerPage)));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  goToPage(page: number) { this.currentPage.set(page); }
  nextPage() { if(this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if(this.currentPage() > 1) this.currentPage.update(p => p - 1); }
}