import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);

  // 🌟 โครงสร้างข้อมูลที่รับจาก Database
  stats = signal<any>({
    staff: { total: 0, academic: 0, support: 0 },
    research_articles: { total: 0, conference: 0, journal: 0 },
    research_projects: { total: 0, total_budget: 0 },
    plan_status: { not_started: 0, in_progress: 0, completed: 0, total: 0 },
    charts: {
      research_projects_count: [], research_projects_budget: [], 
      research_articles_conference: [], research_articles_journal: []
    }
  });

  loading = signal(true);
  chartData1 = signal<any[]>([]);
  chartData2 = signal<any[]>([]);

  // ================= ควบคุม Dropdown กราฟ =================
  options1 = ['จำนวน', 'งบประมาณ'];
  isDropdown1Open = signal(false);
  selectedOption1 = signal(this.options1[0]);

  options2 = ['ประชุมวิจัย', 'วารสาร'];
  isDropdown2Open = signal(false);
  selectedOption2 = signal(this.options2[0]);

  ngOnInit() {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.http.get<any>('http://localhost:8080/api/get_dashboard.php').subscribe({
      next: (res) => {
        this.stats.set(res);
        this.updateChart1();
        this.updateChart2();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch dashboard stats', err);
        this.loading.set(false);
      }
    });
  }

  // คำนวณความสูงกราฟ 1 (โครงการวิจัย)
  updateChart1() {
    const dataObj = this.stats().charts;
    const sourceData = this.selectedOption1() === 'จำนวน' ? dataObj.research_projects_count : dataObj.research_projects_budget;
    const maxVal = Math.max(...sourceData.map((d: any) => d.value), 1);
    this.chartData1.set(sourceData.map((d: any) => ({ ...d, percentage: (d.value / maxVal) * 100 })));
  }

  // คำนวณความสูงกราฟ 2 (บทความวิจัย)
  updateChart2() {
    const dataObj = this.stats().charts;
    const sourceData = this.selectedOption2() === 'ประชุมวิจัย' ? dataObj.research_articles_conference : dataObj.research_articles_journal;
    const maxVal = Math.max(...sourceData.map((d: any) => d.value), 1);
    this.chartData2.set(sourceData.map((d: any) => ({ ...d, percentage: (d.value / maxVal) * 100 })));
  }

  // Event เลือกตัวเลือกกราฟ
  toggleDropdown1() { this.isDropdown1Open.set(!this.isDropdown1Open()); this.isDropdown2Open.set(false); }
  selectOption1(option: string) { this.selectedOption1.set(option); this.isDropdown1Open.set(false); this.updateChart1(); }

  toggleDropdown2() { this.isDropdown2Open.set(!this.isDropdown2Open()); this.isDropdown1Open.set(false); }
  selectOption2(option: string) { this.selectedOption2.set(option); this.isDropdown2Open.set(false); this.updateChart2(); }

  // 🌟 คำนวณสีและสัดส่วนของกราฟโดนัทอัตโนมัติ
  donutStyle = computed(() => {
    const s = this.stats().plan_status;
    const total = s.total || 1;
    const p1 = (s.not_started / total) * 100;
    const p2 = p1 + ((s.in_progress / total) * 100);
    return `conic-gradient(#FDE68A 0% ${p1}%, #FBBF24 ${p1}% ${p2}%, #D97706 ${p2}% 100%)`;
  });

  statusPercent(value: number) {
    const total = this.stats().plan_status.total || 1;
    return Math.round((value / total) * 100);
  }
}