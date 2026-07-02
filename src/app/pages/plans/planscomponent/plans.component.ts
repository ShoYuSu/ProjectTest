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
  
  // 🌟 เก็บสิทธิ์เพิ่มข้อมูลแบบ Real-time จากฐานข้อมูล
  canAdd = signal(false); 
  
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.fetchPermissionsFromDB();
    this.fetchPlanData();
  }

  // 🛡️ เช็คสิทธิ์การ Add ข้อมูล (เผื่อชื่อโมดูลตั้งไว้เป็น Plan_info หรือ Plan_Project)
  fetchPermissionsFromDB() {
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');
    
    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (perms) => {
          let hasAdd = false;
          if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
              // หาคีย์ที่มีคำว่า 'plan' อยู่ข้างใน
              const planKey = Object.keys(perms).find(k => k.toLowerCase().includes('plan'));
              if (planKey && perms[planKey]) {
                const addScope = perms[planKey]['add'];
                if (addScope && addScope.toLowerCase() !== 'none') {
                  hasAdd = true;
                }
              }
          }
          this.canAdd.set(hasAdd);
        },
        error: (err) => console.error('ไม่สามารถโหลดสิทธิ์จากฐานข้อมูลได้', err)
      });
  }

  fetchPlanData() {
    this.loading.set(true);
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');

    this.http.get<any[]>('http://localhost:8080/api/get_plans.php', { headers })
      .subscribe({
        next: (data) => {
          this.allPlans.set(data || []); // ข้อมูลแนบ project.can_edit มาแล้ว
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('API Error details:', err);
          const errorDetail = err.error?.error || err.message || JSON.stringify(err.error) || 'Unknown Error';
          this.errorMessage.set(`ระบบขัดข้อง: ${errorDetail}`);
          this.loading.set(false);
        }
      });
  }

  deletePlan(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบแผนงาน/โครงการนี้?\n(การลบจะไม่สามารถกู้คืนได้ และกิจกรรมย่อยจะถูกลบด้วย)')) {
      const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');
      
      // ใช้ delete_plan.php ตามชื่อไฟล์ที่เราตั้งไว้
      this.http.post<any>('http://localhost:8080/api/delete_plan.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { 
              alert('✅ ลบข้อมูลสำเร็จ'); 
              this.fetchPlanData(); 
            } else { 
              alert('❌ ' + res.message); 
            }
          },
          error: (err) => alert('เกิดข้อผิดพลาด: ' + (err.error?.error || err.message))
        });
    }
  }

  applyFilters() {
    let result = this.allPlans();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();

    if (dept !== 'ทั้งหมด') {
      result = result.filter(p => p.department === dept);
    }

    if (query) {
      result = result.filter(p => 
        (p.plan_name && p.plan_name.toLowerCase().includes(query)) ||
        (p.strategy && p.strategy.toLowerCase().includes(query)) ||
        (p.plan_type && p.plan_type.toLowerCase().includes(query)) ||
        (p.status && p.status.toLowerCase().includes(query))
      );
    }

    this.filteredPlans.set(result);
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