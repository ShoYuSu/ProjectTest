import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

  allArticles = signal<any[]>([]);
  filteredArticles = signal<any[]>([]);
  
  canAdd = signal(false);
  errorMessage = signal<string>('');
  loading = signal(true);
  
  searchQuery = signal<string>('');
  currentDept = signal<string>('ทั้งหมด');
  activeTab = signal<string>('journal'); 

  currentPage = signal(1);
  itemsPerPage = 10;

  ngOnInit() {
    this.fetchPermissionsFromDB();
    this.fetchArticleData();
  }

  // 🌟 Permission-Based Only 
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
             if (['all', 'department', 'self', 'own'].includes(scope)) {
                hasAdd = true;
             }
          }
          this.canAdd.set(hasAdd);
        },
        error: (err) => {
          console.error('ไม่สามารถโหลดสิทธิ์จากฐานข้อมูลได้', err);
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
            
            // 🌟 แก้ไขตรงนี้: เพิ่มการดึงค่า attachedFile ให้ตรงกับที่ HTML เรียกใช้
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
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลบทความวิจัยได้ (กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล)');
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

  applyFilters() {
    let result = this.allArticles();
    const query = this.searchQuery().toLowerCase().trim();
    const dept = this.currentDept();
    const tab = this.activeTab();

    result = result.filter(a => a.type === tab);
    
    if (dept !== 'ทั้งหมด') {
        result = result.filter(a => a.involved_departments && a.involved_departments.includes(dept));
    }

    if (query) {
      result = result.filter(a => 
        (a.title && a.title.toLowerCase().includes(query)) ||
        (a.author && a.author.toLowerCase().includes(query)) ||
        (a.journal_name && a.journal_name.toLowerCase().includes(query)) ||
        (a.conference_name && a.conference_name.toLowerCase().includes(query))
      );
    }

    this.filteredArticles.set(result);
    this.currentPage.set(1);
  }

  setTab(tabName: string) { this.activeTab.set(tabName); this.applyFilters(); }
  setDepartment(deptName: string) { this.currentDept.set(deptName); this.applyFilters(); }
  onSearchChange(val: string) { this.searchQuery.set(val); this.applyFilters(); }

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