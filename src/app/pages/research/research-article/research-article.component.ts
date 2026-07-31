import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-research-article',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './research-article.component.html',
  styleUrl: './research-article.component.css'
})
export class ResearchArticleComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  allArticles = signal<any[]>([]);
  filteredArticles = signal<any[]>([]);
  
  canAdd = signal(false);
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');
  currentYear = signal<string>('ทั้งหมด'); 
  activeTab = signal<string>('journal'); 

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
    this.fetchArticleData();
  }

  fetchPermissionsFromDB() {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers })
      .subscribe({
        next: (res) => {
          const p = res.permissions || res || {}; 
          let hasAdd = false;
          const modPerms = p['research_info'] || p['research'];
          if (modPerms && modPerms['add']) {
             const scope = modPerms['add'].toString().toLowerCase().trim();
             if (['all', 'department', 'self', 'own'].includes(scope)) hasAdd = true;
          }
          this.canAdd.set(hasAdd);
        },
        error: (err) => {
          console.error(err);
          this.canAdd.set(false);
        }
      });
  }

  fetchArticleData() {
    this.loading.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:8080/api/get_research_articles.php', { headers })
      .subscribe({
        next: (data) => {
          const mappedData = (data || []).map(item => ({
            id: item.id || item.article_id,
            type: item.type || item.article_type,
            title: item.title,
            author: item.author || '-',
            department: item.department,
            involved_departments: item.involved_departments || '',
            year: item.year || item.publish_year,
            journal_name: item.journal_name || '',
            journal_vol_issue: item.journal_vol_issue || '',
            journal_quartile: item.journal_quartile || '',
            conference_name: item.conference_name || '',
            conference_date: item.conference_date || '',
            conference_location: item.conference_location || '',
            attachedFile: item.attachedFile || null,
            can_edit: item.can_edit,
            can_delete: item.can_delete
          }));

          this.allArticles.set(mappedData);
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลบทความวิจัยได้');
          this.loading.set(false);
        }
      });
  }

  deleteArticle(id: number) {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลบทความนี้?\n(การลบจะไม่สามารถกู้คืนได้)')) {
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.post<any>('http://localhost:8080/api/delete_research_article.php', { id: id }, { headers })
        .subscribe({
          next: (res) => {
            if (res && res.success) { alert('✅ ลบข้อมูลสำเร็จ'); this.fetchArticleData(); } 
            else { alert('❌ ' + res.message); }
          },
          error: () => alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        });
    }
  }

  availableYears = computed(() => {
    const years = this.allArticles()
                    .filter(a => a.type === this.activeTab())
                    .map(a => a.year).filter(y => y !== null && y !== undefined && y !== '');
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a)); 
    return ['ทั้งหมด', ...uniqueYears.map(String)];
  });

  toggleSort() {
    this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc');
    this.applyFilters();
  }

  applyFilters() {
    let result = this.allArticles();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();
    const year = this.currentYear();
    const tab = this.activeTab();

    result = result.filter(a => a.type === tab);
    if (dept !== 'ทั้งหมด') result = result.filter(a => a.involved_departments && a.involved_departments.includes(dept));
    if (year !== 'ทั้งหมด') result = result.filter(a => String(a.year) === year);
    if (query) {
      result = result.filter(a => 
        (a.title && a.title.toLowerCase().includes(query)) ||
        (a.author && a.author.toLowerCase().includes(query)) ||
        (a.journal_name && a.journal_name.toLowerCase().includes(query)) ||
        (a.conference_name && a.conference_name.toLowerCase().includes(query))
      );
    }

    const sortedResult = [...result].sort((a, b) => {
      if (this.sortDirection() === 'desc') return b.id - a.id;
      else return a.id - b.id;
    });

    this.filteredArticles.set(sortedResult);
    this.currentPage.set(1);
  }

  setTab(tabName: string) { this.activeTab.set(tabName); this.currentYear.set('ทั้งหมด'); this.applyFilters(); }
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
      const allIds = this.filteredArticles().map(a => a.id);
      this.selectedIds.set(new Set(allIds));
    }
  }

  isAllSelected(): boolean {
    return this.filteredArticles().length > 0 && this.selectedIds().size === this.filteredArticles().length;
  }

  exportSelectedToCSV() {
    let dataToExport = this.filteredArticles();
    if (this.selectedIds().size > 0) {
      dataToExport = dataToExport.filter(item => this.selectedIds().has(item.id));
    }

    if (dataToExport.length === 0) {
      alert('⚠️ ไม่มีข้อมูลสำหรับ Export');
      return;
    }

    const isJournal = this.activeTab() === 'journal';
    
    // ตั้งชื่อคอลัมน์ตามประเภทแท็บที่กำลังดูอยู่
    const headers = isJournal 
      ? ['ID', 'ชื่อบทความ', 'ผู้นิพนธ์', 'ปีที่ตีพิมพ์', 'ชื่อวารสาร', 'Vol. / Issue', 'Quartile', 'ภาควิชา']
      : ['ID', 'ชื่อบทความ', 'ผู้นิพนธ์', 'ปีที่ตีพิมพ์', 'ชื่องานประชุม', 'วันที่ประชุม', 'สถานที่จัดงาน', 'ภาควิชา'];
    
    const csvRows = dataToExport.map(item => {
      if (isJournal) {
        return [
          item.id,
          `"${item.title}"`, 
          `"${item.author}"`,
          item.year || '-',
          `"${item.journal_name}"`,
          `"${item.journal_vol_issue}"`,
          `"${item.journal_quartile}"`,
          `"${item.department}"`
        ].join(',');
      } else {
        return [
          item.id,
          `"${item.title}"`, 
          `"${item.author}"`,
          item.year || '-',
          `"${item.conference_name}"`,
          `"${item.conference_date}"`,
          `"${item.conference_location}"`,
          `"${item.department}"`
        ].join(',');
      }
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM ภาษาไทย
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `research_article_${isJournal ? 'journal' : 'conference'}_report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toggleExportMode(); 
  }

  paginatedArticles = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredArticles().slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredArticles().length / this.itemsPerPage)));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  goToPage(page: number) { this.currentPage.set(page); }
  nextPage() { if(this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if(this.currentPage() > 1) this.currentPage.update(p => p - 1); }
}