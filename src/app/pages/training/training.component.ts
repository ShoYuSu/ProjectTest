import { Component, signal, computed, OnInit, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; 
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

  // 🌟 เช็คสิทธิ์จากตาราง Permissions 100% (ไม่มีการเช็ค role admin)
  checkPermissions() {
    const permsString = localStorage.getItem('permissions') || '';
    let hasAdd = false;

    try {
      const permsObj = JSON.parse(permsString);
      if (permsObj && typeof permsObj === 'object' && !Array.isArray(permsObj)) {
        const trainKey = Object.keys(permsObj).find(k => k.toLowerCase() === 'training_info');
        if (trainKey && permsObj[trainKey]) {
          const addScope = permsObj[trainKey]['add'];
          if (addScope && addScope.toLowerCase() !== 'none') hasAdd = true;
        }
      } else if (Array.isArray(permsObj)) {
        const perm = permsObj.find(p => p.module_name?.toLowerCase() === 'training_info' && p.action?.toLowerCase() === 'add');
        if (perm && perm.scope?.toLowerCase() !== 'none') hasAdd = true;
      }
    } catch (e) {
      const cleanStr = permsString.toLowerCase().replace(/[\s"'{}\[\]]/g, '');
      if (cleanStr.includes('training_info') && !cleanStr.includes('add,none')) {
        hasAdd = true;
      }
    }
    this.canAdd.set(hasAdd);
  }

  // 🌟 ดึงข้อมูลจาก API PHP
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
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ไม่สามารถเชื่อมต่อคลังข้อมูลการอบรมได้');
          this.loading.set(false);
        }
      });
  }

  // 🌟 ระบบคัดกรองข้อมูล
  applyFilters() {
    let result = this.allTrainings();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();

    if (dept !== 'ทั้งหมด') {
      result = result.filter(t => t.dept_id === this.getDeptIdByName(dept));
    }

    if (query) {
      result = result.filter(t => 
        (t.topic && t.topic.toLowerCase().includes(query)) ||
        (t.staffName && t.staffName.toLowerCase().includes(query)) ||
        (t.location && t.location.toLowerCase().includes(query))
      );
    }

    this.filteredTrainings.set(result);
    this.currentPage.set(1);
  }

  getDeptIdByName(name: string): number {
    switch(name) {
      case 'เคมี': return 1;
      case 'คณิตศาสตร์': return 2;
      case 'วิทยาการคอมพิวเตอร์': return 3;
      case 'ฟิสิกส์': return 4;
      case 'เทคโนโลยีการอาหาร': return 5;
      default: return 0;
    }
  }

  setDepartment(deptName: string) {
    this.currentDept.set(deptName);
    this.applyFilters();
  }

  onSearchChange(val: string) {
    this.searchQuery.set(val);
    this.applyFilters();
  }

  goToAddTraining() {
    this.router.navigate(['/training/add']);
  }

  // ระบบแบ่งหน้า (Pagination)
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