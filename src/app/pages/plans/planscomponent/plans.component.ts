import { Component, signal, computed, OnInit, inject } from '@angular/core';
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
  loading = signal(true);
  
  // 🌟 ตัวแปรสำหรับระบบค้นหาและ Filter ทั้งหมด
  searchQuery = signal<string>('');
  isFilterOpen = signal(false);
  
  selectedStatusFilter = signal<string>('ทั้งหมด');
  selectedStrategyFilter = signal<string>('ทั้งหมด');
  selectedPlanFilter = signal<string>('ทั้งหมด');

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.checkPermissions();
    this.fetchPlans();
  }

  checkPermissions() {
    const permsString = localStorage.getItem('permissions') || '';
    let hasAdd = false;

    if (permsString && !permsString.startsWith('[') && !permsString.startsWith('{')) {
      const permsArray = permsString.split(','); 
      for (const p of permsArray) {
        const parts = p.split(':'); 
        if (parts.length >= 3) {
          const moduleName = parts[0].trim().toLowerCase();
          const action = parts[1].trim().toLowerCase();
          const scope = parts[2].trim().toLowerCase();
          if ((moduleName.includes('plan') || moduleName.includes('project')) && action === 'add' && scope !== 'none') {
            hasAdd = true;
            break;
          }
        }
      }
    } else {
      try {
        const permsObj = JSON.parse(permsString);
        if (Array.isArray(permsObj)) {
          const perm = permsObj.find(p => p.module_name && (p.module_name.toLowerCase().includes('plan') || p.module_name.toLowerCase().includes('project')) && p.action?.toLowerCase() === 'add');
          if (perm && perm.scope?.toLowerCase() !== 'none') hasAdd = true;
        } else if (permsObj && typeof permsObj === 'object') {
          const planKey = Object.keys(permsObj).find(k => k.toLowerCase().includes('plan') || k.toLowerCase().includes('project'));
          if (planKey && permsObj[planKey] && permsObj[planKey]['add']) {
            if (permsObj[planKey]['add'].toLowerCase() !== 'none') hasAdd = true;
          }
        }
      } catch (e) { }
    }
    this.canAdd.set(hasAdd);
  }

  fetchPlans() {
    this.loading.set(true);
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '14');
    
    this.http.get<any[]>('http://localhost:8080/api/get_plans.php', { headers })
      .subscribe({
        next: (data) => {
          this.allPlans.set(data || []);
          this.applyFilters();
          this.loading.set(false);
        },
        error: () => { 
          this.loading.set(false); 
        }
      });
  }

  // 🌟 ดึงรายชื่อยุทธศาสตร์ที่ไม่ซ้ำกันจากข้อมูลเพื่อมาสร้าง Dropdown
  uniqueStrategies = computed(() => {
    const strategies = this.allPlans().map(p => p.strategy).filter(s => s && s !== '-' && s.trim() !== '');
    return ['ทั้งหมด', ...new Set(strategies)];
  });

  // 🌟 ดึงรายชื่อแผนงานที่ไม่ซ้ำกันจากข้อมูลเพื่อมาสร้าง Dropdown
  uniquePlans = computed(() => {
    const plans = this.allPlans().map(p => p.planType).filter(p => p && p !== '-' && p.trim() !== '');
    return ['ทั้งหมด', ...new Set(plans)];
  });

  // 🌟 ระบบคัดกรองข้อมูลแบบ 4 มิติ (ค้นหา + สถานะ + ยุทธศาสตร์ + แผนงาน)
  applyFilters() {
    const query = this.searchQuery().toLowerCase().trim();
    const statusFilter = this.selectedStatusFilter();
    const strategyFilter = this.selectedStrategyFilter();
    const planFilter = this.selectedPlanFilter();

    let result = this.allPlans();

    // กรองด้วยปุ่มสถานะ
    if (statusFilter !== 'ทั้งหมด') {
      result = result.filter(p => p.status === statusFilter);
    }
    // กรองด้วย Dropdown ยุทธศาสตร์
    if (strategyFilter !== 'ทั้งหมด') {
      result = result.filter(p => p.strategy === strategyFilter);
    }
    // กรองด้วย Dropdown แผนงาน
    if (planFilter !== 'ทั้งหมด') {
      result = result.filter(p => p.planType === planFilter);
    }

    // กรองด้วยช่องค้นหา (Search Box)
    if (query) {
      result = result.filter(p => 
        (p.projectName?.toLowerCase().includes(query)) ||
        (p.responsible?.toLowerCase().includes(query)) ||
        (p.planType?.toLowerCase().includes(query)) ||
        (p.strategy?.toLowerCase().includes(query))
      );
    }

    this.filteredPlans.set(result);
    this.currentPage.set(1);
  }

  // 🌟 ฟังก์ชันรับค่าจากหน้า UI แล้วสั่งกรองใหม่
  onSearchChange(val: string) { this.searchQuery.set(val); this.applyFilters(); }
  toggleFilter() { this.isFilterOpen.set(!this.isFilterOpen()); }
  setStatusFilter(status: string) { this.selectedStatusFilter.set(status); this.applyFilters(); }
  setStrategyFilter(val: string) { this.selectedStrategyFilter.set(val); this.applyFilters(); }
  setPlanFilter(val: string) { this.selectedPlanFilter.set(val); this.applyFilters(); }

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