import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  // ====== ดึงค่าจาก URL มาลง localStorage ======
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['role']) {
        localStorage.setItem('role', params['role']);
      }
      if (params['token']) {
        localStorage.setItem('token', params['token']);
      }
    });
  }
  // ==========================================

  // ================= ข้อมูลกราฟ =================
  chartData1 = [
    { year: 2565, value: 20 },
    { year: 2566, value: 27 },
    { year: 2567, value: 37 },
    { year: 2568, value: 49 },
    { year: 2569, value: 75 }
  ];

  chartData2 = [
    { year: 2565, value: 20 },
    { year: 2566, value: 27 },
    { year: 2567, value: 37 },
    { year: 2568, value: 49 },
    { year: 2569, value: 75 }
  ];

  // ================= ควบคุม Dropdown 1 =================
  options1 = ['จำนวน', 'งบประมาณ'];
  isDropdown1Open = signal(false);
  selectedOption1 = signal(this.options1[0]);

  toggleDropdown1() {
    this.isDropdown1Open.set(!this.isDropdown1Open());
    this.isDropdown2Open.set(false); // ปิดอันล่างถ้าเปิดอันบน
  }

  selectOption1(option: string) {
    this.selectedOption1.set(option);
    this.isDropdown1Open.set(false);
  }

  // ================= ควบคุม Dropdown 2 =================
  options2 = ['ประชุมวิจัย', 'วารสาร'];
  isDropdown2Open = signal(false);
  selectedOption2 = signal(this.options2[0]);

  toggleDropdown2() {
    this.isDropdown2Open.set(!this.isDropdown2Open());
    this.isDropdown1Open.set(false); // ปิดอันบนถ้าเปิดอันล่าง
  }

  selectOption2(option: string) {
    this.selectedOption2.set(option);
    this.isDropdown2Open.set(false);
  }
}