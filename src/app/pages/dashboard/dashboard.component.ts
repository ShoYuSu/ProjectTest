import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);

  stats = signal<any>({
    staff: { total: 0, academic: 0, support: 0 },
    research_articles: { total: 0, conference: 0, journal: 0 },
    research_projects: { total: 0, total_budget: 0 },
    // 🌟 เพิ่มฟิลด์รับค่างบประมาณ
    plan_status: { not_started: 0, in_progress: 0, completed: 0, total: 0, total_approved_budget: 0, total_used_budget: 0 },
    charts: {
      research_projects_count: [], research_projects_budget: [], 
      research_articles_conference: [], research_articles_journal: []
    }
  });

  initialLoad = signal(true);
  
  chartData1 = signal<any[]>([]);
  chartData2 = signal<any[]>([]);

  availableYears = signal<string[]>(['ทั้งหมด']);
  currentYear = signal<string>('ทั้งหมด');
  isYearDropdownOpen = signal(false);

  availablePlanYears = signal<string[]>(['ทั้งหมด']);
  planYear = signal<string>('ทั้งหมด');
  isPlanYearDropdownOpen = signal(false);

  options1 = ['จำนวน', 'งบประมาณ'];
  isDropdown1Open = signal(false);
  selectedOption1 = signal('จำนวน');

  options2 = ['วารสาร', 'ประชุมวิชาการ'];
  isDropdown2Open = signal(false);
  selectedOption2 = signal('วารสาร');

  ngOnInit() {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    const url = `http://localhost:8080/api/get_dashboard.php?year=${this.currentYear()}&plan_year=${this.planYear()}`;

    this.http.get<any>(url, { headers })
      .subscribe({
        next: (data) => {
          this.stats.set(data);
          
          if (data.available_years && data.available_years.length > 0) {
             this.availableYears.set(['ทั้งหมด', ...data.available_years.map(String)]);
          }
          if (data.available_plan_years && data.available_plan_years.length > 0) {
             this.availablePlanYears.set(['ทั้งหมด', ...data.available_plan_years.map(String)]);
          }

          this.updateChart1();
          this.updateChart2();
          this.initialLoad.set(false);
        },
        error: (err) => {
          console.error(err);
          this.initialLoad.set(false);
        }
      });
  }

  setYear(year: string) {
    this.currentYear.set(year);
    this.isYearDropdownOpen.set(false);
    this.fetchDashboardData();
  }

  setPlanYear(year: string) {
    this.planYear.set(year);
    this.isPlanYearDropdownOpen.set(false);
    this.fetchDashboardData();
  }

  statusPercent(value: number): string {
    const total = this.stats().plan_status?.total || 0;
    if (total === 0) return '0';
    return ((value / total) * 100).toFixed(0);
  }

  updateChart1() {
    const dataObj = this.stats().charts;
    const sourceData = this.selectedOption1() === 'จำนวน' ? dataObj.research_projects_count : dataObj.research_projects_budget;
    if(!sourceData || sourceData.length === 0) {
      this.chartData1.set([]); return;
    }
    const maxVal = Math.max(...sourceData.map((d: any) => d.value), 1);
    this.chartData1.set(sourceData.map((d: any) => ({ ...d, percentage: (d.value / maxVal) * 100 })));
  }

  updateChart2() {
    const dataObj = this.stats().charts;
    const sourceData = this.selectedOption2() === 'ประชุมวิชาการ' ? dataObj.research_articles_conference : dataObj.research_articles_journal;
    if(!sourceData || sourceData.length === 0) {
      this.chartData2.set([]); return;
    }
    const maxVal = Math.max(...sourceData.map((d: any) => d.value), 1);
    this.chartData2.set(sourceData.map((d: any) => ({ ...d, percentage: (d.value / maxVal) * 100 })));
  }

  toggleYearDropdown() { this.isYearDropdownOpen.set(!this.isYearDropdownOpen()); this.closeAllExcept('year'); }
  togglePlanYearDropdown() { this.isPlanYearDropdownOpen.set(!this.isPlanYearDropdownOpen()); this.closeAllExcept('plan'); }
  toggleDropdown1() { this.isDropdown1Open.set(!this.isDropdown1Open()); this.closeAllExcept('d1'); }
  toggleDropdown2() { this.isDropdown2Open.set(!this.isDropdown2Open()); this.closeAllExcept('d2'); }

  closeAllExcept(exclude: string) {
    if(exclude !== 'year') this.isYearDropdownOpen.set(false);
    if(exclude !== 'plan') this.isPlanYearDropdownOpen.set(false);
    if(exclude !== 'd1') this.isDropdown1Open.set(false);
    if(exclude !== 'd2') this.isDropdown2Open.set(false);
  }

  selectOption1(option: string) { this.selectedOption1.set(option); this.isDropdown1Open.set(false); this.updateChart1(); }
  selectOption2(option: string) { this.selectedOption2.set(option); this.isDropdown2Open.set(false); this.updateChart2(); }

  donutStyle = computed(() => {
    const s = this.stats().plan_status;
    if (!s) return '';
    const total = s.total || 1;
    const p1 = (s.not_started / total) * 100;
    const p2 = p1 + ((s.in_progress / total) * 100);
    return `conic-gradient(#EF4444 0% ${p1}%, #EAB308 ${p1}% ${p2}%, #22C55E ${p2}% 100%)`;
  });
}