import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router'; 
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
  private route = inject(ActivatedRoute); 

  allTrainings = signal<any[]>([]);
  filteredTrainings = signal<any[]>([]);
  
  canAdd = signal(false); 
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');
  currentYear = signal<string>('ทั้งหมด'); 

  sortDirection = signal<'desc' | 'asc'>('desc');

  // 🌟 ระบบ Export Report
  isExportMode = signal(false);
  selectedIds = signal<Set<number>>(new Set());

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['search']) this.searchQuery.set(params['search']);
      if (params['year']) this.currentYear.set(params['year']);
    });

    this.fetchPermissionsFromDB();
    this.fetchTrainingData();
  }

  fetchPermissionsFromDB() {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (res) => {
          const p = res.permissions || res || {}; 
          let hasAdd = false;
          
          const modPerms = p['training_info'] || p['training'];
          if (modPerms && modPerms['add']) {
             const scope = modPerms['add'].toString().toLowerCase().trim();
             if (['all', 'department', 'self', 'own'].includes(scope)) {
                hasAdd = true;
             }
          }
          this.canAdd.set(hasAdd);
        },
        error: (err) => {
          console.error(err);
          this.canAdd.set(false);
        }
      });
  }

  fetchTrainingData() {
    this.loading.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:8080/api/get_training.php', { headers })
      .subscribe({
        next: (data) => {
          const mappedData = (data || []).map(item => {
             let year = null;
             if (item.start_date) {
                const dateObj = new Date(item.start_date);
                if (!isNaN(dateObj.getTime())) year = dateObj.getFullYear() + 543;
             }
             return { ...item, year: year };
          });
          
          this.allTrainings.set(mappedData);
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลการอบรมได้');
          this.loading.set(false);
        }
      });
  }

  deleteTraining(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการอบรมนี้?\n(การลบจะไม่สามารถกู้คืนได้)')) {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.post<any>('http://localhost:8080/api/delete_training.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { alert('✅ ลบข้อมูลสำเร็จ'); this.fetchTrainingData(); } 
            else { alert('❌ ' + res.message); }
          },
          error: () => alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        });
    }
  }

  availableYears = computed(() => {
    const years = this.allTrainings().map(t => t.year).filter(y => y !== null && y !== undefined && y !== '');
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a)); 
    return ['ทั้งหมด', ...uniqueYears.map(String)];
  });

  toggleSort() {
    this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc');
    this.applyFilters();
  }

  applyFilters() {
    let result = this.allTrainings();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();
    const year = this.currentYear();

    if (dept !== 'ทั้งหมด') result = result.filter(t => t.involved_departments && t.involved_departments.includes(dept));
    if (year !== 'ทั้งหมด') result = result.filter(t => String(t.year) === year);
    if (query) {
      result = result.filter(t => 
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.participants && t.participants.toLowerCase().includes(query)) ||
        (t.location && t.location.toLowerCase().includes(query))
      );
    }

    const sortedResult = [...result].sort((a, b) => {
      if (this.sortDirection() === 'desc') return b.id - a.id;
      else return a.id - b.id;
    });

    this.filteredTrainings.set(sortedResult);
    this.currentPage.set(1); 
  }

  setDepartment(deptName: string) { this.currentDept.set(deptName); this.applyFilters(); }
  setYear(year: string) { this.currentYear.set(year); this.applyFilters(); }
  onSearchChange(val: string) { this.searchQuery.set(val); this.applyFilters(); }

  // 🌟 ฟังก์ชันจัดการ Report & Export
  toggleExportMode() {
    this.isExportMode.set(!this.isExportMode());
    this.selectedIds.set(new Set()); 
  }

  toggleSelection(id: number) {
    const current = new Set(this.selectedIds());
    if (current.has(id)) current.delete(id);
    else current.add(id);
    this.selectedIds.set(current);
  }

  toggleAll() {
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      const allIds = this.filteredTrainings().map(t => t.id);
      this.selectedIds.set(new Set(allIds));
    }
  }

  isAllSelected(): boolean {
    return this.filteredTrainings().length > 0 && this.selectedIds().size === this.filteredTrainings().length;
  }

  exportSelectedToCSV() {
    let dataToExport = this.filteredTrainings();
    if (this.selectedIds().size > 0) {
      dataToExport = dataToExport.filter(item => this.selectedIds().has(item.id));
    }

    if (dataToExport.length === 0) {
      alert('⚠️ ไม่มีข้อมูลสำหรับ Export');
      return;
    }

    // ฟังก์ชันช่วยครอบ String ป้องกันปัญหาจากลูกน้ำ (,)
    const escapeCSV = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;

    const headers = ['ID', 'หัวข้อการอบรม', 'ผู้เข้าร่วม', 'วันที่เริ่มต้น', 'วันที่สิ้นสุด', 'สถานที่', 'ค่าใช้จ่าย (บาท)', 'ภาควิชา'];
    
    const csvRows = dataToExport.map(item => {
      return [
        item.id,
        escapeCSV(item.title),
        escapeCSV(item.participants),
        escapeCSV(item.start_date),
        escapeCSV(item.end_date),
        escapeCSV(item.location),
        item.budget || 0,
        escapeCSV(item.department)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `training_report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toggleExportMode(); 
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