import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './training.component.html',
  styleUrl: './training.component.css'
})
export class TrainingComponent implements OnInit {
  private http = inject(HttpClient);

  allTrainings = signal<any[]>([]);
  filteredTrainings = signal<any[]>([]);
  
  canAdd = signal(false); 
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.fetchPermissionsFromDB();
    this.fetchTrainingData();
  }

  fetchPermissionsFromDB() {
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');
    
    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (perms) => {
          let hasAdd = false;
          // 🌟 ป้องกันบั๊กกรณี API get_permissions.php ส่งค่ากลับมาเป็น Array หรือค่าว่าง
          if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
              const trainingKey = Object.keys(perms).find(k => k.toLowerCase().includes('training'));
              if (trainingKey && perms[trainingKey]) {
                const addScope = perms[trainingKey]['add'];
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

  fetchTrainingData() {
    this.loading.set(true);
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');

    this.http.get<any[]>('http://localhost:8080/api/get_training.php', { headers })
      .subscribe({
        next: (data) => {
          this.allTrainings.set(data || []); 
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('API Error details:', err);
          // 🌟 ดึงข้อความ Error เชิงลึกจาก Backend (หรือ HTTP) มาโชว์หน้าเว็บเลย!
          const errorDetail = err.error?.error || err.message || JSON.stringify(err.error) || 'Unknown Error';
          this.errorMessage.set(`ระบบขัดข้อง: ${errorDetail}`);
          this.loading.set(false);
        }
      });
  }

  deleteTraining(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการอบรม/สัมมนานี้?\n(การลบจะไม่สามารถกู้คืนได้)')) {
      const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '0');
      this.http.post<any>('http://localhost:8080/api/delete_training.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { 
              alert('✅ ลบข้อมูลสำเร็จ'); 
              this.fetchTrainingData(); 
            } else { 
              alert('❌ ' + res.message); 
            }
          },
          error: (err) => alert('เกิดข้อผิดพลาด: ' + (err.error?.error || err.message))
        });
    }
  }

  applyFilters() {
    let result = this.allTrainings();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();

    if (dept !== 'ทั้งหมด') {
      result = result.filter(t => t.department === dept);
    }

    if (query) {
      result = result.filter(t => 
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.participants && t.participants.toLowerCase().includes(query)) ||
        (t.location && t.location.toLowerCase().includes(query))
      );
    }

    this.filteredTrainings.set(result);
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

  paginatedTrainings = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredTrainings().slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTrainings().length / this.itemsPerPage)));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  goToPage(page: number) { this.currentPage.set(page); }
  nextPage() { if(this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if(this.currentPage() > 1) this.currentPage.update(p => p - 1); }
}