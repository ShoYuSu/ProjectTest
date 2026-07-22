import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

  allPlans = signal<any[]>([]);
  filteredPlans = signal<any[]>([]);
  canAdd = signal(false); 
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentYear = signal<string>('ทั้งหมด');

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
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
    const years = this.allPlans().map(p => p.year).filter(y => y !== null && y !== undefined);
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a); 
    return ['ทั้งหมด', ...uniqueYears.map(String)];
  });

  applyFilters() {
    let result = this.allPlans();
    const query = this.searchQuery().toLowerCase().trim();
    const year = this.currentYear();

    if (year !== 'ทั้งหมด') {
      result = result.filter(p => String(p.year) === year);
    }

    if (query) {
      result = result.filter(p => 
        (p.plan_name && p.plan_name.toLowerCase().includes(query)) ||
        (p.participants && p.participants.toLowerCase().includes(query)) ||
        (p.strategy && p.strategy.toLowerCase().includes(query))
      );
    }

    this.filteredPlans.set(result);
    this.currentPage.set(1); 
  }

  setYear(year: string) { this.currentYear.set(year); this.applyFilters(); }
  onSearchChange(val: string) { this.searchQuery.set(val); this.applyFilters(); }

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