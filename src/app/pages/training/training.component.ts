import { Component, signal, computed, OnInit, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './training.component.html',
  styleUrl: './training.component.css'
})
export class TrainingComponent implements OnInit {
  private router = inject(Router); 
  private http = inject(HttpClient);

  allTrainings = signal<any[]>([]);
  filteredTrainings = signal<any[]>([]);
  
  canAdd = signal(false);
  editScope = signal<string>('none'); // 🌟
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

  // 🌟 ฟังก์ชันเช็คสิทธิ์
  checkPermissions() {
    const permsString = localStorage.getItem('permissions') || '';
    let hasAdd = false;
    let eScope = 'none'; // 🌟

    if (permsString && !permsString.startsWith('[') && !permsString.startsWith('{')) {
      const permsArray = permsString.split(','); 
      for (const p of permsArray) {
        const parts = p.split(':'); 
        if (parts.length >= 3) {
          const moduleName = parts[0].trim().toLowerCase();
          const action = parts[1].trim().toLowerCase();
          const scope = parts[2].trim().toLowerCase();

          if (moduleName.includes('training')) {
            if (action === 'add' && scope !== 'none') hasAdd = true;
            if (action === 'edit') eScope = scope; // 🌟
          }
        }
      }
    } else {
      try {
        const permsObj = JSON.parse(permsString);
        if (Array.isArray(permsObj)) {
          const permAdd = permsObj.find(p => p.module_name?.toLowerCase().includes('training') && p.action?.toLowerCase() === 'add');
          if (permAdd && permAdd.scope?.toLowerCase() !== 'none') hasAdd = true;
          
          const permEdit = permsObj.find(p => p.module_name?.toLowerCase().includes('training') && p.action?.toLowerCase() === 'edit');
          if (permEdit) eScope = permEdit.scope?.toLowerCase() || 'none'; // 🌟
        }
      } catch (e) { }
    }
    
    this.canAdd.set(hasAdd);
    this.editScope.set(eScope); // 🌟
  }

  canEditRow(training: any): boolean {
    const scope = this.editScope();
    if (scope === 'all') return true;
    if (scope === 'none' || !scope) return false;
    const currentUserId = localStorage.getItem('user_id');
    const myFullName = localStorage.getItem('full_name') || '';

    if (scope === 'self' || scope === 'own') {
      if (training.user_id && String(training.user_id) === currentUserId) return true;
      if (training.staffName && myFullName && training.staffName.includes(myFullName)) return true;
      return false;
    }
    if (scope === 'department' || scope === 'dept') {
      const userDeptStr = localStorage.getItem('user_dept') || '';
      const deptIdMap: any = { 'chem': 1, 'math': 2, 'cs': 3, 'physics': 4, 'food': 5 };
      if (deptIdMap[userDeptStr] && training.dept_id === deptIdMap[userDeptStr]) return true;
      return false;
    }
    return false;
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

  // 🌟 ฟังก์ชันลบข้อมูลการอบรม
  deleteTraining(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการอบรมนี้?\n(การลบจะไม่สามารถกู้คืนได้)')) {
      const headers = new HttpHeaders().set('X-User-Id', localStorage.getItem('user_id') || '14');
      this.http.post<any>('http://localhost:8080/api/delete_training.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { 
              alert('✅ ลบข้อมูลสำเร็จ'); 
              this.fetchTrainings(); 
            } else { 
              alert('❌ ' + res.message); 
            }
          },
          error: () => alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        });
    }
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