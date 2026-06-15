import { Component, signal, computed, OnInit, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './training.component.html',
  styleUrl: './training.component.css'
})
export class TrainingComponent implements OnInit {
  private router = inject(Router); 
  private http = inject(HttpClient);

  allTrainings = signal<any[]>([]);
  filteredTrainings = signal<any[]>([]);
  
  canAdd = signal(false);
  loading = signal(true);
  errorMessage = signal<string>('');

  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.checkPermissions();
    this.fetchTrainings();
  }

  // 🌟 เช็คสิทธิ์แบบเข้มงวดที่สุด
  checkPermissions() {
    const permsString = localStorage.getItem('permissions') || '';
    let hasAdd = false;

    try {
      const permsObj = JSON.parse(permsString);
      if (Array.isArray(permsObj)) {
        const perm = permsObj.find(p => p.module_name?.toLowerCase() === 'training_info');
        if (perm && perm.action?.toLowerCase() === 'add' && perm.scope?.toLowerCase() !== 'none') {
          hasAdd = true;
        }
      }
    } catch (e) {
      hasAdd = false;
    }
    this.canAdd.set(hasAdd);
  }

  fetchTrainings() {
    this.loading.set(true);
    const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '14');
    this.http.get<any[]>('http://localhost:8080/api/get_trainings.php', { headers })
      .subscribe({
        next: (data) => {
          this.allTrainings.set(data || []);
          this.applyFilters();
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('ไม่สามารถเชื่อมต่อคลังข้อมูลการอบรมได้');
          this.loading.set(false);
        }
      });
  }

  applyFilters() {
    let result = this.allTrainings();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();
    if (dept !== 'ทั้งหมด') {
      const deptMap: any = { 'เคมี': 1, 'คณิตศาสตร์': 2, 'วิทยาการคอมพิวเตอร์': 3, 'ฟิสิกส์': 4, 'เทคโนโลยีการอาหาร': 5 };
      result = result.filter(t => t.dept_id === deptMap[dept]);
    }
    if (query) {
      result = result.filter(t => (t.topic?.toLowerCase().includes(query) || t.staffName?.toLowerCase().includes(query)));
    }
    this.filteredTrainings.set(result);
    this.currentPage.set(1);
  }

  setDepartment(deptName: string) { this.currentDept.set(deptName); this.applyFilters(); }
  onSearchChange(val: string) { this.searchQuery.set(val); this.applyFilters(); }
  goToAddTraining() { this.router.navigate(['/training/add']); }

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